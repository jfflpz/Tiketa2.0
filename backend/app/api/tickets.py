import secrets
import smtplib
from datetime import timedelta
from decimal import Decimal
from typing import Literal
from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request, Response, UploadFile
from pydantic import TypeAdapter
from sqlalchemy import select

from app.api.deps import DB, CurrentUser
from app.core.cache import cache, rate_limit
from app.core.config import settings
from app.core.security import decrypt, decrypt_bytes, digest, encrypt, encrypt_bytes
from app.models import Ticket, TicketAttachment, TicketComment
from app.schemas import (
    ClosureInput,
    CommentInput,
    PublicTicket,
    StatusInput,
    TicketInput,
    TicketOut,
)
from app.services import mail
from app.services.tickets import claim, get_ticket, local, now, submit, ticket_view

router = APIRouter(prefix="/tickets", tags=["Tickets"])
queue_adapter = TypeAdapter(list[TicketOut])


@router.post("/submit", status_code=201, response_model=PublicTicket)
async def public_submit(body: TicketInput, request: Request, db: DB):
    await rate_limit("submit:" + digest(request.client.host), 10, 60)
    return await submit(db, body)


@router.post("/quick-intake", status_code=201, response_model=TicketOut)
async def quick_intake(body: TicketInput, db: DB, user: CurrentUser):
    return ticket_view(await submit(db, body, user.id))


@router.get("/track/{code}", response_model=PublicTicket)
async def track(code: str, request: Request, db: DB):
    await rate_limit("track:" + digest(request.client.host), 60, 60)
    row = await db.scalar(select(Ticket).where(Ticket.ticket_code == code))
    if not row:
        raise HTTPException(404, "Ticket not found")
    return row


@router.get("", response_model=list[TicketOut])
async def queue(
    db: DB,
    user: CurrentUser,
    status: Literal["OPEN", "PROG", "RESL", "CLSD"] | None = None,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    # Every reader is authenticated before accessing this shared, encrypted cache.
    # Versioned keys prevent a fill racing a committed mutation from being reused.
    version = await cache.get("queue:version") or "0"
    key = f"queue:{version}:{status}:{offset}:{limit}"
    cached = await cache.get(key)
    if cached:
        return Response(decrypt(cached), media_type="application/json")
    query = (
        select(Ticket)
        .order_by(Ticket.created_at, Ticket.id)
        .offset(offset)
        .limit(limit)
    )
    query = (
        query.where(Ticket.status == status)
        if status
        else query.where(Ticket.status.in_(["OPEN", "PROG", "RESL"]))
    )
    rows = [ticket_view(row) for row in (await db.scalars(query)).all()]
    payload = queue_adapter.dump_json(queue_adapter.validate_python(rows)).decode()
    await cache.set(key, encrypt(payload), ex=5)
    return Response(payload, media_type="application/json")


@router.get("/{ticket_id}", response_model=TicketOut)
async def detail(ticket_id: UUID, db: DB, user: CurrentUser):
    return ticket_view(await get_ticket(db, ticket_id))


@router.patch("/{ticket_id}/claim", response_model=TicketOut)
async def claim_ticket(ticket_id: UUID, db: DB, user: CurrentUser):
    row = await get_ticket(db, ticket_id, lock=True)
    await claim(db, row, user)
    await db.commit()
    await cache.incr("queue:version")
    return ticket_view(row)


@router.patch("/{ticket_id}/status", response_model=TicketOut)
async def status_ticket(ticket_id: UUID, body: StatusInput, db: DB, user: CurrentUser):
    row = await get_ticket(db, ticket_id, lock=True)
    if row.status == "OPEN" and body.status == "PROG":
        await claim(db, row, user)
        row.mode = body.mode
    elif row.status == "PROG" and body.status == "RESL":
        if not (body.mode or row.mode):
            raise HTTPException(422, "Support mode is required at resolution")
        row.mode = body.mode or row.mode
        row.resolved_at = now()
        row.date_finished = local(row.resolved_at).date()
        row.duration = Decimal(
            str((row.resolved_at - row.started_at).total_seconds() / 3600)
        ).quantize(Decimal("0.0001"))
        token = secrets.token_urlsafe(32)
        row.closure_token_hash = digest(token)
        if not row.requester_contact_enc:
            raise HTTPException(
                409, "Verified requester contact required for resolution"
            )
        try:
            await mail.send_closure(
                decrypt(row.requester_contact_enc), row.ticket_code, str(row.id), token
            )
        except (OSError, smtplib.SMTPException):
            raise HTTPException(
                503, "Confirmation delivery failed; retry resolution"
            ) from None
        row.status = "RESL"
    elif row.status == "RESL" and body.status == "CLSD":
        if user.role != "admin":
            raise HTTPException(
                403, "Requester confirmation or administrator override required"
            )
        if now() - row.updated_at < timedelta(hours=72):
            raise HTTPException(409, "Override requires 72 hours of inactivity")
        row.status = "CLSD"
        row.closure_token_hash = None
    else:
        raise HTTPException(409, "Invalid status transition")
    await db.commit()
    await cache.incr("queue:version")
    return ticket_view(row)


@router.post("/{ticket_id}/confirm-closure")
async def confirm(ticket_id: UUID, body: ClosureInput, request: Request, db: DB):
    await rate_limit("closure:" + digest(request.client.host), 10, 60)
    row = await get_ticket(db, ticket_id, lock=True)
    if (
        row.status != "RESL"
        or not row.closure_token_hash
        or not secrets.compare_digest(row.closure_token_hash, digest(body.token))
    ):
        raise HTTPException(400, "Invalid or consumed closure token")
    row.status = "CLSD"
    row.closure_token_hash = None
    row.user_confirmed_at = now()
    await db.commit()
    await cache.incr("queue:version")
    return {"ticket_code": row.ticket_code, "status": row.status}


@router.post("/{ticket_id}/comments", status_code=201)
async def comment(ticket_id: UUID, body: CommentInput, db: DB, user: CurrentUser):
    row = await get_ticket(db, ticket_id, lock=True)
    row.updated_at = now()
    item = TicketComment(
        ticket_id=ticket_id,
        user_id=user.id,
        body_enc=encrypt(body.body),
        is_internal=body.is_internal,
    )
    db.add(item)
    await db.commit()
    await cache.incr("queue:version")
    return {
        "id": item.id,
        **body.model_dump(),
        "user_id": user.id,
        "created_at": item.created_at,
    }


@router.get("/{ticket_id}/comments")
async def comments(
    ticket_id: UUID,
    db: DB,
    user: CurrentUser,
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
):
    await get_ticket(db, ticket_id)
    rows = (
        await db.scalars(
            select(TicketComment)
            .where(TicketComment.ticket_id == ticket_id)
            .order_by(TicketComment.created_at)
            .offset(offset)
            .limit(limit)
        )
    ).all()
    return [
        {
            "id": row.id,
            "body": decrypt(row.body_enc),
            "is_internal": row.is_internal,
            "user_id": row.user_id,
            "created_at": row.created_at,
        }
        for row in rows
    ]


@router.post("/{ticket_id}/attachments", status_code=201)
async def upload(ticket_id: UUID, file: UploadFile, db: DB, user: CurrentUser):
    row = await get_ticket(db, ticket_id, lock=True)
    content = await file.read(settings.MAX_ATTACHMENT_BYTES + 1)
    if not content or len(content) > settings.MAX_ATTACHMENT_BYTES:
        raise HTTPException(413, "Attachment must contain 1 byte to 5 MiB")
    if file.content_type not in (
        "image/png",
        "image/jpeg",
        "application/pdf",
        "text/plain",
    ):
        raise HTTPException(
            415, "Only PNG, JPEG, PDF and plain text attachments are supported"
        )
    name = (file.filename or "attachment").replace("\\", "/").split("/")[-1]
    if len(name) > 150 or any(ord(ch) < 32 for ch in name):
        raise HTTPException(422, "Invalid file name")
    item = TicketAttachment(
        ticket_id=ticket_id,
        user_id=user.id,
        file_name=name,
        mime_type=file.content_type,
        file_size=len(content),
        content_enc=encrypt_bytes(content),
    )
    db.add(item)
    row.updated_at = now()
    await db.commit()
    await cache.incr("queue:version")
    return {"id": item.id, "file_name": name, "file_size": item.file_size}


@router.get("/{ticket_id}/attachments")
async def attachments(ticket_id: UUID, db: DB, user: CurrentUser):
    await get_ticket(db, ticket_id)
    rows = (
        (
            await db.execute(
                select(
                    TicketAttachment.id,
                    TicketAttachment.file_name,
                    TicketAttachment.mime_type,
                    TicketAttachment.file_size,
                ).where(TicketAttachment.ticket_id == ticket_id)
            )
        )
        .mappings()
        .all()
    )
    return rows


@router.get("/{ticket_id}/attachments/{attachment_id}")
async def download(ticket_id: UUID, attachment_id: UUID, db: DB, user: CurrentUser):
    item = await db.get(TicketAttachment, attachment_id)
    if not item or item.ticket_id != ticket_id:
        raise HTTPException(404, "Attachment not found")
    return Response(
        content=decrypt_bytes(item.content_enc),
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": "attachment; filename*=UTF-8''"
            + quote(item.file_name),
            "X-Content-Type-Options": "nosniff",
        },
    )
