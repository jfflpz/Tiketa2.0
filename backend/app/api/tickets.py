import logging
import secrets
import smtplib
from datetime import timedelta
from decimal import Decimal
from typing import Literal
from urllib.parse import quote, urlencode
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request, Response, UploadFile
from pydantic import TypeAdapter
from sqlalchemy import select

from app.api.deps import DB, Admin, CurrentUser
from app.core.cache import cache, rate_limit
from app.core.config import settings
from app.core.security import decrypt, decrypt_bytes, digest, encrypt, encrypt_bytes
from app.models import (
    TaskCategory,
    Ticket,
    TicketAttachment,
    TicketComment,
    TicketTechnician,
    User,
)
from app.schemas import (
    AssignInput,
    ClosureInput,
    CommentInput,
    PublicTicket,
    QuickIntakeInput,
    ServiceRecordUpdate,
    StatusInput,
    TicketInput,
    TicketOut,
)
from app.services import mail
from app.services.tickets import claim, get_ticket, local, now, submit, ticket_view

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tickets", tags=["Tickets"])
queue_adapter = TypeAdapter(list[TicketOut])


@router.post("/submit", status_code=201, response_model=PublicTicket)
async def public_submit(body: TicketInput, request: Request, db: DB):
    session_id = request.headers.get("X-Kiosk-Session-ID") or request.headers.get(
        "x-kiosk-session-id"
    )
    await rate_limit("submit:" + digest(request.client.host), 10, 60)
    return await submit(db, body, creator_id=None, session_id=session_id)


@router.post("/quick-intake", status_code=201, response_model=TicketOut)
async def quick_intake(body: QuickIntakeInput, db: DB, user: CurrentUser):
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
    status: Literal["OPEN", "PROG", "RESL", "CLSD", "ALL"] | None = None,
    technician_id: UUID | None = None,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    # Every reader is authenticated before accessing this shared, encrypted cache.
    # Versioned keys prevent a fill racing a committed mutation from being reused.
    version = await cache.get("queue:version") or "0"
    status_key = status or "DEFAULT"
    tech_key = str(technician_id) if technician_id else "NONE"
    key = f"queue:{version}:{status_key}:{tech_key}:{offset}:{limit}"
    cached = await cache.get(key)
    if cached:
        return Response(decrypt(cached), media_type="application/json")
    query = (
        select(Ticket)
        .order_by(Ticket.created_at, Ticket.id)
        .offset(offset)
        .limit(limit)
    )
    if status == "ALL":
        pass
    elif status in ("OPEN", "PROG", "RESL", "CLSD"):
        query = query.where(Ticket.status == status)
    else:
        query = query.where(Ticket.status.in_(["OPEN", "PROG", "RESL"]))

    if technician_id:
        query = query.where(Ticket.assigned_tech_id == technician_id)

    ticket_rows = (await db.scalars(query)).all()
    tech_ids = {t.assigned_tech_id for t in ticket_rows if t.assigned_tech_id}
    tech_map: dict[UUID, str] = {}
    if tech_ids:
        users = (await db.scalars(select(User).where(User.id.in_(tech_ids)))).all()
        tech_map = {u.id: u.full_name for u in users}

    rows = []
    for t in ticket_rows:
        v = ticket_view(t)
        if t.assigned_tech_id and t.assigned_tech_id in tech_map:
            v["technician_name"] = tech_map[t.assigned_tech_id]
        rows.append(v)
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
    res = ticket_view(row)
    res["technician_name"] = user.full_name
    return res


@router.patch("/{ticket_id}/service-record", response_model=TicketOut)
async def update_service_record(
    ticket_id: UUID,
    body: ServiceRecordUpdate,
    db: DB,
    user: CurrentUser,
):
    row = await get_ticket(db, ticket_id, lock=True)
    if user.role != "admin" and row.assigned_tech_id != user.id:
        raise HTTPException(
            403,
            "Only the assigned technician or administrator can update the service record",
        )

    if "task_code" in body.model_fields_set:
        cat = await db.get(TaskCategory, body.task_code)
        if not cat:
            raise HTTPException(422, "Invalid task category code")
        row.task_code = body.task_code

    if "diagnosis" in body.model_fields_set:
        row.diagnosis_enc = encrypt(body.diagnosis) if body.diagnosis else None

    if "resolution_notes" in body.model_fields_set:
        row.resolution_notes_enc = (
            encrypt(body.resolution_notes) if body.resolution_notes else None
        )

    row.updated_at = now()
    await db.commit()
    await cache.incr("queue:version")
    return ticket_view(row)


@router.patch("/{ticket_id}/assign", response_model=TicketOut)
async def assign_ticket(
    ticket_id: UUID,
    body: AssignInput,
    db: DB,
    admin: Admin,
):
    row = await get_ticket(db, ticket_id, lock=True)
    if row.status in ("RESL", "CLSD"):
        raise HTTPException(
            409, f"Cannot reassign ticket in {row.status} status; reopen ticket first"
        )

    target_tech = await db.get(User, body.technician_id)
    if not target_tech or target_tech.role != "it" or not target_tech.is_active:
        raise HTTPException(
            422, "Target technician must be an active technician with IT role"
        )

    # Idempotent no-op if already assigned to this technician
    if row.assigned_tech_id == target_tech.id:
        res = ticket_view(row)
        res["technician_name"] = target_tech.full_name
        return res

    # Demote existing primary technician assignments
    tech_assignments = (
        await db.scalars(
            select(TicketTechnician).where(TicketTechnician.ticket_id == row.id)
        )
    ).all()

    target_assoc = None
    for assoc in tech_assignments:
        assoc.is_primary = False
        if assoc.technician_id == target_tech.id:
            target_assoc = assoc

    current_time = now()
    if target_assoc:
        target_assoc.is_primary = True
        target_assoc.assigned_at = current_time
    else:
        db.add(
            TicketTechnician(
                ticket_id=row.id,
                technician_id=target_tech.id,
                assigned_at=current_time,
                is_primary=True,
            )
        )

    if row.status == "OPEN":
        row.status = "PROG"
        row.started_at = current_time

    row.assigned_tech_id = target_tech.id
    row.updated_at = current_time
    await db.commit()
    await cache.incr("queue:version")
    res = ticket_view(row)
    res["technician_name"] = target_tech.full_name
    return res


@router.patch("/{ticket_id}/status", response_model=TicketOut)
async def status_ticket(ticket_id: UUID, body: StatusInput, db: DB, user: CurrentUser):
    row = await get_ticket(db, ticket_id, lock=True)
    closure_url: str | None = None
    if row.status == "OPEN" and body.status == "PROG":
        await claim(db, row, user)
        row.mode = body.mode or row.mode

    elif row.status == "PROG" and body.status == "PROG":
        if body.mode:
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
            if settings.ENVIRONMENT == "production":
                await db.rollback()
                raise HTTPException(
                    503, "Confirmation delivery failed; retry resolution"
                ) from None
            logger.warning(
                "Closure confirmation delivery failed in non-production environment; proceeding with resolution"
            )
        row.status = "RESL"
        if settings.ENVIRONMENT != "production":
            base_url = settings.PUBLIC_BASE_URL.rstrip("/")
            params = urlencode(
                {
                    "verifyTicket": row.ticket_code,
                    "ticketId": str(row.id),
                    "token": token,
                }
            )
            closure_url = f"{base_url}/?{params}"
    elif row.status == "RESL" and body.status == "CLSD":
        if user.role != "admin":
            raise HTTPException(
                403, "Requester confirmation or administrator override required"
            )
        if now() - row.updated_at < timedelta(hours=72):
            raise HTTPException(409, "Override requires 72 hours of inactivity")
        row.status = "CLSD"
        row.closure_token_hash = None
    elif row.status in ("RESL", "CLSD") and body.status == "PROG":
        if row.status == "CLSD" and (now() - row.updated_at > timedelta(hours=72)):
            raise HTTPException(
                409,
                "Tickets closed over 72 hours ago cannot be reopened; create a new linked ticket",
            )
        row.status = "PROG"
        row.closure_token_hash = None
        row.resolved_at = None
        row.date_finished = None
    else:
        raise HTTPException(409, "Invalid status transition")

    if body.task_code:
        if user.role != "admin" and row.assigned_tech_id != user.id:
            raise HTTPException(
                403,
                "Only the assigned technician or administrator can modify task classification",
            )
        cat = await db.get(TaskCategory, body.task_code)
        if not cat:
            raise HTTPException(422, "Invalid task category code")
        row.task_code = body.task_code
    await db.commit()
    await cache.incr("queue:version")
    response_data = ticket_view(row)
    if closure_url is not None:
        response_data["closure_url"] = closure_url
    return response_data


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
