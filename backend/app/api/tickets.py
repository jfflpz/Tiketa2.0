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
from sqlalchemy import func, select

from app.api.deps import DB, Admin, CurrentUser, validated_user
from app.core.cache import cache, rate_limit
from app.core.config import settings
from app.core.security import (
    decrypt,
    decrypt_bytes,
    digest,
    encrypt,
    encrypt_bytes,
    issue_employee_ticket_token,
    verify_employee_ticket_token,
    verify_match_token,
)
from app.models import (
    Employee,
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
    CommentOut,
    PublicTicket,
    QuickIntakeInput,
    ReopenInput,
    ServiceRecordUpdate,
    StatusInput,
    TicketInput,
    TicketOut,
    TicketVerifyAccessInput,
    TicketVerifyAccessOut,
)
from app.services import mail
from app.services.tickets import claim, get_ticket, local, now, submit, ticket_view

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tickets", tags=["Tickets"])
queue_adapter = TypeAdapter(list[TicketOut])


async def get_requester_identity(
    request: Request,
    db: DB,
) -> tuple[User | None, dict | None]:
    auth = request.headers.get("Authorization") or ""
    emp_token = request.headers.get("X-Employee-Token") or request.headers.get("X-Match-Token")

    if auth.startswith("Bearer "):
        token = auth.split("Bearer ", 1)[1].strip()
        try:
            user, _ = await validated_user(token, "access", db)
            return user, None
        except Exception:
            pass
        try:
            claims = verify_employee_ticket_token(token)
            return None, claims
        except Exception:
            pass
        try:
            session_id = request.headers.get("X-Kiosk-Session-ID") or request.headers.get("x-kiosk-session-id") or ""
            emp_id = verify_match_token(token, session_id if session_id else None)
            return None, {"employee_id": emp_id, "type": "employee_match"}
        except Exception:
            pass

    if emp_token:
        try:
            claims = verify_employee_ticket_token(emp_token)
            return None, claims
        except Exception:
            pass
        try:
            session_id = request.headers.get("X-Kiosk-Session-ID") or request.headers.get("x-kiosk-session-id") or ""
            emp_id = verify_match_token(emp_token, session_id if session_id else None)
            return None, {"employee_id": emp_id, "type": "employee_match"}
        except Exception:
            pass

    return None, None


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


@router.get("/my-tickets", response_model=list[TicketOut])
async def my_tickets(request: Request, db: DB):
    staff_user, emp_claims = await get_requester_identity(request, db)
    if emp_claims and emp_claims.get("type") == "employee_ticket_access":
        raise HTTPException(
            403, "Ticket-scoped token cannot access employee ticket list"
        )
    target_emp_id = None
    if emp_claims and emp_claims.get("type") == "employee_match" and emp_claims.get("employee_id"):
        target_emp_id = emp_claims["employee_id"]

    if not target_emp_id:
        raise HTTPException(
            401, "Verified employee credentials required to view My Tickets"
        )

    emp = await db.scalar(
        select(Employee).where(
            Employee.employee_id == target_emp_id,
            Employee.is_active.is_(True),
        )
    )
    if not emp:
        return []

    ticket_rows = (
        await db.scalars(
            select(Ticket)
            .where(Ticket.employee_id == emp.id)
            .order_by(Ticket.created_at.desc(), Ticket.id.desc())
            .limit(100)
        )
    ).all()

    tech_ids = {t.assigned_tech_id for t in ticket_rows if t.assigned_tech_id}
    tech_map: dict[UUID, str] = {}
    if tech_ids:
        users = (await db.scalars(select(User).where(User.id.in_(tech_ids)))).all()
        tech_map = {u.id: u.full_name for u in users}

    rows = []
    for t in ticket_rows:
        v = ticket_view(t, employee_id_number=emp.employee_id)
        if t.assigned_tech_id and t.assigned_tech_id in tech_map:
            v["technician_name"] = tech_map[t.assigned_tech_id]
        rows.append(v)
    return rows


@router.post("/verify-access", response_model=TicketVerifyAccessOut)
@router.post("/{code_or_id}/verify-access", response_model=TicketVerifyAccessOut)
async def verify_access(
    request: Request,
    db: DB,
    body: TicketVerifyAccessInput,
    code_or_id: str | None = None,
):
    client_ip = request.client.host if request.client else "unknown"
    await rate_limit("verify_access:" + digest(client_ip), 60, 60)

    target_code_or_id = code_or_id or body.ticket_code
    if not target_code_or_id:
        raise HTTPException(400, "Ticket code or ID is required")

    target_code_or_id = target_code_or_id.strip()
    ticket = None
    try:
        ticket_uuid = UUID(target_code_or_id)
        ticket = await db.get(Ticket, ticket_uuid)
    except ValueError:
        pass

    if not ticket:
        clean_code = target_code_or_id.upper()
        ticket = await db.scalar(
            select(Ticket).where(func.upper(Ticket.ticket_code) == clean_code)
        )

    if not ticket:
        raise HTTPException(404, "Ticket not found")

    linked_emp = None
    if ticket.employee_id:
        linked_emp = await db.get(Employee, ticket.employee_id)

    linked_emp_num = linked_emp.employee_id if linked_emp else None
    staff_user, emp_claims = await get_requester_identity(request, db)

    is_authorized = False
    can_close = False
    can_reopen = (ticket.status in ("RESL", "CLSD"))
    verified_closure_hash = None

    if staff_user:
        is_authorized = True
        can_close = False
        verified_closure_hash = None

    if not is_authorized and body.token:
        if ticket.status == "CLSD" and ticket.user_confirmed_at:
            raise HTTPException(410, "Ticket has already been verified and closed")
        if (
            ticket.closure_token_expires_at
            and now() > ticket.closure_token_expires_at
        ) or (
            not ticket.closure_token_expires_at
            and ticket.resolved_at
            and (now() - ticket.resolved_at > timedelta(hours=72))
        ):
            raise HTTPException(410, "Closure verification token has expired (72-hour window)")
        if not ticket.closure_token_hash or not secrets.compare_digest(
            ticket.closure_token_hash, digest(body.token)
        ):
            raise HTTPException(400, "Invalid or expired closure verification token")
        is_authorized = True
        can_close = (ticket.status == "RESL")
        verified_closure_hash = ticket.closure_token_hash

    if not is_authorized and body.match_token:
        session_id = (
            request.headers.get("X-Kiosk-Session-ID")
            or request.headers.get("x-kiosk-session-id")
            or ""
        )
        try:
            match_emp_id = verify_match_token(
                body.match_token, session_id if session_id else None
            )
            if not linked_emp or linked_emp.employee_id != match_emp_id:
                raise HTTPException(403, "Employee ID does not match ticket requester")
            is_authorized = True
            # Match token provides viewing/conversation credentials, not direct closure credentials
            can_close = False
        except jwt.InvalidTokenError:
            raise HTTPException(401, "Invalid or expired match token")

    if not is_authorized and emp_claims and emp_claims.get("type") == "employee_match":
        if linked_emp and linked_emp.employee_id == emp_claims.get("employee_id"):
            is_authorized = True
            can_close = False

    # Gap 1: Reject Employee-ID-only authorization without verified credentials
    if not is_authorized:
        if body.employee_id:
            raise HTTPException(
                401,
                "Verified credential required. Ticket code and Employee ID alone do not grant access without a valid verification token or verified kiosk session.",
            )
        raise HTTPException(
            401, "Valid verification token or authenticated employee session required"
        )

    tech_name = None
    if ticket.assigned_tech_id:
        tech = await db.get(User, ticket.assigned_tech_id)
        if tech:
            tech_name = tech.full_name

    v = ticket_view(ticket, employee_id_number=linked_emp_num)
    if tech_name:
        v["technician_name"] = tech_name

    session_id = (
        request.headers.get("X-Kiosk-Session-ID")
        or request.headers.get("x-kiosk-session-id")
        or ""
    )
    access_token = issue_employee_ticket_token(
        ticket_id=str(ticket.id),
        ticket_code=ticket.ticket_code,
        employee_id=linked_emp_num or "",
        session_id=session_id,
        can_close=can_close,
        can_reopen=can_reopen,
        closure_hash=verified_closure_hash,
        scope="ticket_closure" if can_close else "ticket_conversation",
    )
    return TicketVerifyAccessOut(
        authorized=True,
        access_token=access_token,
        ticket=TicketOut.model_validate(v),
        can_close=can_close,
        can_reopen=can_reopen,
    )


@router.get("", response_model=list[TicketOut])
async def queue(
    db: DB,
    user: CurrentUser,
    status: Literal["OPEN", "PROG", "RESL", "CLSD", "ALL"] | None = None,
    technician_id: UUID | None = None,
    location_id: UUID | None = None,
    order: Literal["asc", "desc"] = "asc",
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    # Every reader is authenticated before accessing this shared, encrypted cache.
    # Versioned keys prevent a fill racing a committed mutation from being reused.
    version = await cache.get("queue:version") or "0"
    status_key = status or "DEFAULT"
    tech_key = str(technician_id) if technician_id else "NONE"
    loc_key = str(location_id) if location_id else "NONE"
    key = f"queue:{version}:{status_key}:{tech_key}:{loc_key}:{order}:{offset}:{limit}"
    cached = await cache.get(key)
    if cached:
        return Response(decrypt(cached), media_type="application/json")
    query = select(Ticket).offset(offset).limit(limit)
    if order == "desc":
        query = query.order_by(Ticket.created_at.desc(), Ticket.id.desc())
    else:
        query = query.order_by(Ticket.created_at.asc(), Ticket.id.asc())

    if status == "ALL":
        pass
    elif status in ("OPEN", "PROG", "RESL", "CLSD"):
        query = query.where(Ticket.status == status)
    else:
        query = query.where(Ticket.status.in_(["OPEN", "PROG", "RESL"]))

    if technician_id:
        query = query.where(Ticket.assigned_tech_id == technician_id)

    if location_id:
        query = query.where(Ticket.location_id == location_id)

    ticket_rows = (await db.scalars(query)).all()
    tech_ids = {t.assigned_tech_id for t in ticket_rows if t.assigned_tech_id}
    tech_map: dict[UUID, str] = {}
    if tech_ids:
        users = (await db.scalars(select(User).where(User.id.in_(tech_ids)))).all()
        tech_map = {u.id: u.full_name for u in users}

    emp_ids = {t.employee_id for t in ticket_rows if t.employee_id}
    emp_map: dict[UUID, str] = {}
    if emp_ids:
        employees = (
            await db.scalars(select(Employee).where(Employee.id.in_(emp_ids)))
        ).all()
        emp_map = {e.id: e.employee_id for e in employees}

    rows = []
    for t in ticket_rows:
        v = ticket_view(t, employee_id_number=emp_map.get(t.employee_id))
        if t.assigned_tech_id and t.assigned_tech_id in tech_map:
            v["technician_name"] = tech_map[t.assigned_tech_id]
        rows.append(v)
    payload = queue_adapter.dump_json(queue_adapter.validate_python(rows)).decode()
    await cache.set(key, encrypt(payload), ex=5)
    return Response(payload, media_type="application/json")


@router.get("/{ticket_id}", response_model=TicketOut)
async def detail(ticket_id: UUID, db: DB, user: CurrentUser):
    row = await get_ticket(db, ticket_id)
    emp_num = None
    if row.employee_id:
        emp = await db.get(Employee, row.employee_id)
        if emp:
            emp_num = emp.employee_id
    tech_name = None
    if row.assigned_tech_id:
        tech = await db.get(User, row.assigned_tech_id)
        if tech:
            tech_name = tech.full_name
    v = ticket_view(row, employee_id_number=emp_num)
    if tech_name:
        v["technician_name"] = tech_name
    return v


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
        row.closure_token_expires_at = now() + timedelta(hours=72)
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
        row.closure_token_expires_at = None
        row.user_confirmed_at = now()
        row.updated_at = now()
    elif row.status in ("RESL", "CLSD") and body.status == "PROG":
        if row.status == "CLSD" and (now() - row.updated_at > timedelta(hours=72)):
            raise HTTPException(
                409,
                "Tickets closed over 72 hours ago cannot be reopened; create a new linked ticket",
            )
        row.status = "PROG"
        row.closure_token_hash = None
        row.closure_token_expires_at = None
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


@router.post("/{ticket_id}/reissue-verification")
async def reissue_verification(ticket_id: UUID, db: DB, user: CurrentUser):
    row = await get_ticket(db, ticket_id, lock=True)
    if user.role != "admin" and row.assigned_tech_id != user.id:
        raise HTTPException(
            403,
            "Only the assigned technician or administrator can reissue verification",
        )
    if row.status != "RESL":
        raise HTTPException(
            400, "Verification link can only be generated for resolved tickets"
        )
    token = secrets.token_urlsafe(32)
    row.closure_token_hash = digest(token)
    row.closure_token_expires_at = now() + timedelta(hours=72)
    row.updated_at = now()
    closure_url = None
    if not row.requester_contact_enc:
        raise HTTPException(
            409, "Verified requester contact required for verification link"
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
            "Closure confirmation delivery failed in non-production environment; proceeding"
        )

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

    await db.commit()
    await cache.incr("queue:version")
    return {
        "ticket_code": row.ticket_code,
        "status": row.status,
        "closure_url": closure_url,
    }


@router.post("/{ticket_id}/confirm-closure", response_model=TicketOut)
async def confirm(ticket_id: UUID, body: ClosureInput, request: Request, db: DB):
    await rate_limit("closure:" + digest(request.client.host), 10, 60)
    row = await get_ticket(db, ticket_id, lock=True)
    if row.status == "CLSD":
        raise HTTPException(400, "Ticket is already closed")
    if row.status != "RESL":
        raise HTTPException(400, f"Ticket cannot be confirmed in status {row.status}")
    if (
        row.closure_token_expires_at
        and now() > row.closure_token_expires_at
    ) or (
        not row.closure_token_expires_at
        and row.resolved_at
        and (now() - row.resolved_at > timedelta(hours=72))
    ):
        raise HTTPException(
            410, "Closure verification token has expired (72-hour window)"
        )

    staff_user, emp_claims = await get_requester_identity(request, db)

    # Issue 1: Preserve employee sign-off semantics.
    # Assigned staff cannot close tickets merely because they are authenticated.
    # Administrative override is strictly separate (via PATCH /tickets/{id}/status by Admin after 72h).
    # confirm-closure is strictly for employee sign-off requiring verified employee closure credentials.
    if staff_user:
        raise HTTPException(
            403,
            "Staff cannot perform employee sign-off; administrative override requires administrator role after 72 hours via status update",
        )

    token_valid = False
    if body.token and row.closure_token_hash:
        if secrets.compare_digest(row.closure_token_hash, digest(body.token)):
            token_valid = True
    elif (
        emp_claims
        and emp_claims.get("type") == "employee_ticket_access"
        and emp_claims.get("sub") == str(ticket_id)
        and emp_claims.get("can_close") is True
        and emp_claims.get("scope") == "ticket_closure"
    ):
        if not row.closure_token_hash or not secrets.compare_digest(
            row.closure_token_hash, emp_claims.get("closure_hash") or ""
        ):
            raise HTTPException(
                401,
                "Closure credentials have been rotated; please use the newly reissued link",
            )
        token_valid = True

    if not token_valid:
        raise HTTPException(400, "Invalid or consumed closure token")

    row.status = "CLSD"
    row.closure_token_hash = None
    row.closure_token_expires_at = None
    row.user_confirmed_at = now()
    row.updated_at = now()

    if body.remarks and body.remarks.strip():
        sender_name = row.requester_name
        sender_role = "employee"
        remarks_comment = TicketComment(
            ticket_id=ticket_id,
            user_id=None,
            author_name=sender_name,
            author_role=sender_role,
            body_enc=encrypt(
                f"✅ Closure Sign-Off Verified:\nRemarks: {body.remarks.strip()}"
            ),
            is_internal=False,
        )
        db.add(remarks_comment)

    await db.commit()
    await cache.incr("queue:version")

    tech_name = None
    if row.assigned_tech_id:
        tech = await db.get(User, row.assigned_tech_id)
        if tech:
            tech_name = tech.full_name
    emp_num = None
    if row.employee_id:
        emp = await db.get(Employee, row.employee_id)
        if emp:
            emp_num = emp.employee_id
    res = ticket_view(row, employee_id_number=emp_num)
    if tech_name:
        res["technician_name"] = tech_name
    return res


@router.post("/{ticket_id}/reopen", response_model=TicketOut)
async def reopen(ticket_id: UUID, body: ReopenInput, request: Request, db: DB):
    await rate_limit("reopen:" + digest(request.client.host), 10, 60)
    row = await get_ticket(db, ticket_id, lock=True)
    if row.status not in ("RESL", "CLSD"):
        raise HTTPException(409, f"Ticket in status {row.status} cannot be reopened")
    if row.status == "CLSD" and (now() - row.updated_at > timedelta(hours=72)):
        raise HTTPException(
            409,
            "Tickets closed over 72 hours ago cannot be reopened; create a new linked ticket",
        )

    staff_user, emp_claims = await get_requester_identity(request, db)
    authorized = False
    if staff_user:
        if staff_user.role != "admin" and row.assigned_tech_id != staff_user.id:
            raise HTTPException(
                403,
                "Only the assigned technician or administrator can reopen this ticket",
            )
        authorized = True
    elif body.token:
        # Check expiry
        if (
            row.closure_token_expires_at
            and now() > row.closure_token_expires_at
        ) or (
            not row.closure_token_expires_at
            and row.resolved_at
            and (now() - row.resolved_at > timedelta(hours=72))
        ):
            raise HTTPException(
                410, "Closure verification token has expired (72-hour window)"
            )
        # Check valid/rotated
        if not row.closure_token_hash or not secrets.compare_digest(
            row.closure_token_hash, digest(body.token)
        ):
            raise HTTPException(400, "Invalid or rotated verification token")
        authorized = True
    elif emp_claims:
        if emp_claims.get("type") == "employee_ticket_access":
            if emp_claims.get("sub") != str(ticket_id):
                raise HTTPException(
                    403, "Ticket-scoped token cannot reopen other tickets"
                )
            if not emp_claims.get("can_reopen"):
                raise HTTPException(403, "Token lacks reopening capability")

            # Check expiry if ticket is RESL
            if row.status == "RESL":
                if (
                    row.closure_token_expires_at
                    and now() > row.closure_token_expires_at
                ) or (
                    not row.closure_token_expires_at
                    and row.resolved_at
                    and (now() - row.resolved_at > timedelta(hours=72))
                ):
                    raise HTTPException(
                        410, "Verification credentials have expired (72-hour window)"
                    )

            # Check rotation if token was issued with a closure hash
            if emp_claims.get("closure_hash"):
                if not row.closure_token_hash or not secrets.compare_digest(
                    row.closure_token_hash, emp_claims["closure_hash"]
                ):
                    raise HTTPException(
                        401,
                        "Verification credentials have been rotated; please use the newly reissued link",
                    )
            authorized = True
        elif emp_claims.get("type") == "employee_match" and row.employee_id:
            emp = await db.get(Employee, row.employee_id)
            if emp and emp.employee_id == emp_claims.get("employee_id"):
                authorized = True

    if not authorized:
        raise HTTPException(403, "Not authorized to reopen this ticket")

    sender_name = staff_user.full_name if staff_user else row.requester_name
    sender_role = "it" if staff_user else "employee"
    comment_item = TicketComment(
        ticket_id=ticket_id,
        user_id=staff_user.id if staff_user else None,
        author_name=sender_name,
        author_role=sender_role,
        body_enc=encrypt(
            f"⚠️ TICKET REOPENED: Issue persists after resolution attempt.\nReason: {body.reason.strip()}"
        ),
        is_internal=False,
    )
    db.add(comment_item)

    row.status = "PROG"
    row.closure_token_hash = None
    row.closure_token_expires_at = None
    row.resolved_at = None
    row.date_finished = None
    row.updated_at = now()

    await db.commit()
    await cache.incr("queue:version")

    tech_name = None
    if row.assigned_tech_id:
        tech = await db.get(User, row.assigned_tech_id)
        if tech:
            tech_name = tech.full_name
    emp_num = None
    if row.employee_id:
        emp = await db.get(Employee, row.employee_id)
        if emp:
            emp_num = emp.employee_id
    res = ticket_view(row, employee_id_number=emp_num)
    if tech_name:
        res["technician_name"] = tech_name
    return res


@router.post("/{ticket_id}/comments", status_code=201, response_model=CommentOut)
async def comment(
    ticket_id: UUID,
    body: CommentInput,
    request: Request,
    db: DB,
):
    row = await get_ticket(db, ticket_id, lock=True)
    staff_user, emp_claims = await get_requester_identity(request, db)
    if not staff_user and not emp_claims:
        raise HTTPException(401, "Authentication required to post comments")

    if staff_user:
        user_id = staff_user.id
        author_name = staff_user.full_name
        author_role = staff_user.role
        is_internal = body.is_internal
    else:
        if emp_claims.get("scope") == "ticket_closure":
            raise HTTPException(
                403, "Closure-scoped credentials cannot be used for conversation"
            )
        if emp_claims.get("type") == "employee_ticket_access":
            if emp_claims.get("sub") != str(ticket_id):
                raise HTTPException(
                    403, "Ticket-scoped token cannot post comments on other tickets"
                )
        elif emp_claims.get("type") == "employee_match":
            emp_num = emp_claims.get("employee_id")
            if row.employee_id:
                emp = await db.get(Employee, row.employee_id)
                if not emp or emp.employee_id != emp_num:
                    raise HTTPException(403, "Unauthorized ticket comment submission")
            else:
                raise HTTPException(403, "Unauthorized ticket comment submission")
        else:
            raise HTTPException(403, "Unauthorized ticket comment submission")

        user_id = None
        author_name = row.requester_name
        author_role = "employee"
        is_internal = False

    row.updated_at = now()
    item = TicketComment(
        ticket_id=ticket_id,
        user_id=user_id,
        author_name=author_name,
        author_role=author_role,
        body_enc=encrypt(body.body),
        is_internal=is_internal,
    )
    db.add(item)
    await db.commit()
    await cache.incr("queue:version")
    return CommentOut(
        id=item.id,
        body=body.body,
        is_internal=is_internal,
        user_id=user_id,
        author_name=author_name,
        author_role=author_role,
        created_at=item.created_at,
    )


@router.get("/{ticket_id}/comments", response_model=list[CommentOut])
async def comments(
    ticket_id: UUID,
    request: Request,
    db: DB,
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
):
    ticket = await get_ticket(db, ticket_id)
    staff_user, emp_claims = await get_requester_identity(request, db)
    if not staff_user and not emp_claims:
        raise HTTPException(401, "Authentication required to view comments")

    query = (
        select(TicketComment)
        .where(TicketComment.ticket_id == ticket_id)
        .order_by(TicketComment.created_at)
        .offset(offset)
        .limit(limit)
    )

    if not staff_user:
        if emp_claims.get("scope") == "ticket_closure":
            raise HTTPException(
                403, "Closure-scoped credentials cannot be used for conversation"
            )
        if emp_claims.get("type") == "employee_ticket_access":
            if emp_claims.get("sub") != str(ticket_id):
                raise HTTPException(
                    403, "Ticket-scoped token cannot view comments on other tickets"
                )
        elif emp_claims.get("type") == "employee_match":
            emp_num = emp_claims.get("employee_id")
            if ticket.employee_id:
                emp = await db.get(Employee, ticket.employee_id)
                if not emp or emp.employee_id != emp_num:
                    raise HTTPException(403, "Unauthorized ticket comments access")
            else:
                raise HTTPException(403, "Unauthorized ticket comments access")
        else:
            raise HTTPException(403, "Unauthorized ticket comments access")

        query = query.where(TicketComment.is_internal.is_(False))

    rows = (await db.scalars(query)).all()
    user_ids = {r.user_id for r in rows if r.user_id}
    user_map = {}
    if user_ids:
        users = (await db.scalars(select(User).where(User.id.in_(user_ids)))).all()
        user_map = {u.id: u.full_name for u in users}

    result = []
    for row in rows:
        author = row.author_name or (
            user_map.get(row.user_id) if row.user_id else "IT Support"
        )
        role = row.author_role or ("it" if row.user_id else "employee")
        result.append(
            CommentOut(
                id=row.id,
                body=decrypt(row.body_enc),
                is_internal=row.is_internal,
                user_id=row.user_id,
                author_name=author,
                author_role=role,
                created_at=row.created_at,
            )
        )
    return result


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
