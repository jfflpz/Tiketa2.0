from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import Integer, cast, func, select
from sqlalchemy.dialects.postgresql import insert

from app.core.cache import cache
from app.core.config import settings
from app.core.security import decrypt, encrypt, verify_match_token
from app.models import (
    LocationObservation,
    TaskCategory,
    Ticket,
    TicketCounter,
    TicketTechnician,
)
from app.services.directory import find_employee

PUBLIC_KIOSK_ISSUES = {
    "PRN-TS",
    "NET-CFG",
    "SW-ASST",
    "PC-HW-REP",
    "SRV-ASSESS",
    "PC-PMS",
}


def now():
    return datetime.now(UTC)


def local(value):
    return value.astimezone(ZoneInfo(settings.BUSINESS_TIMEZONE))


async def synchronize_ticket_counter(db, month):
    """Lock the month and recover a missing/stale counter without rewinding it."""
    await db.execute(
        insert(TicketCounter)
        .values(month=month, value=0)
        .on_conflict_do_nothing(index_elements=[TicketCounter.month])
    )
    counter = await db.scalar(
        select(TicketCounter).where(TicketCounter.month == month).with_for_update()
    )
    highest = await db.scalar(
        select(func.max(cast(func.substring(Ticket.ticket_code, 8), Integer))).where(
            Ticket.ticket_code.op("~")(f"^T-{month}-[0-9]{{4,}}$")
        )
    )
    counter.value = max(counter.value, highest or 0)
    return counter


async def next_code(db, day):
    month = day.strftime("%y%m")
    counter = await synchronize_ticket_counter(db, month)
    counter.value += 1
    # Flush before another allocation in this transaction; the row lock is held
    # until commit so concurrent submissions cannot allocate the same number.
    await db.flush()
    return f"T-{month}-{counter.value:04d}"


async def submit(db, body, creator_id=None, session_id=None):
    is_public = creator_id is None
    if is_public:
        if body.match_token:
            try:
                verified_emp_id = verify_match_token(body.match_token, session_id or "")
            except Exception:
                raise HTTPException(
                    403, "Invalid or expired match_token, or session mismatch"
                )
            employee = await find_employee(db, verified_emp_id)
        elif body.employee_id and not session_id:
            employee = await find_employee(db, body.employee_id)
        else:
            raise HTTPException(
                403,
                "Valid match_token bound to active session is required for public ticket submission",
            )
    else:
        if not body.employee_id:
            raise HTTPException(422, "employee_id is required")
        employee = await find_employee(db, body.employee_id)

    if not await db.get(TaskCategory, body.task_code):
        raise HTTPException(422, "Unknown task code")

    is_public = creator_id is None
    if is_public:
        reported_issue = body.reported_issue_code or body.task_code
        if reported_issue not in PUBLIC_KIOSK_ISSUES:
            raise HTTPException(
                422, f"Invalid public reported issue code: {reported_issue}"
            )
        if body.reported_issue_code and body.reported_issue_code != body.task_code:
            raise HTTPException(
                422,
                "Mismatch between reported_issue_code and task_code for public intake",
            )
    else:
        reported_issue = body.reported_issue_code
        if reported_issue:
            if not await db.get(TaskCategory, reported_issue):
                raise HTTPException(
                    422, f"Invalid reported issue code: {reported_issue}"
                )

    day = local(now()).date()
    row = Ticket(
        ticket_code=await next_code(db, day),
        employee_id=employee.id,
        creator_id=creator_id,
        company_id=employee.company_id,
        location_id=employee.location_id,
        department_id=employee.department_id,
        requester_name=employee.full_name,
        requester_contact_enc=encrypt(employee.email),
        reported_issue_code=reported_issue,
        task_code=body.task_code,
        description_enc=encrypt(body.description),
        mode=getattr(body, "mode", None) if creator_id else None,
        date_started=day,
        month=day.strftime("%B %Y"),
        status="OPEN",
    )
    db.add(row)
    await db.flush()
    if getattr(body, "observation_id", None):
        obs = await db.get(LocationObservation, body.observation_id)
        if obs and obs.ticket_id is None:
            obs.ticket_id = row.id
    await db.commit()
    await cache.incr("queue:version")
    return row


async def get_ticket(db, ticket_id, lock=False):
    query = select(Ticket).where(Ticket.id == ticket_id)
    if lock:
        query = query.with_for_update()
    row = await db.scalar(query)
    if not row:
        raise HTTPException(404, "Ticket not found")
    return row


async def claim(db, row, user):
    if row.status != "OPEN" or row.assigned_tech_id:
        raise HTTPException(409, "Ticket already claimed or no longer open")
    row.status = "PROG"
    row.assigned_tech_id = user.id
    row.started_at = now()
    db.add(
        TicketTechnician(
            ticket_id=row.id,
            technician_id=user.id,
            assigned_at=row.started_at,
            is_primary=True,
        )
    )


def ticket_view(row):
    fields = (
        "id",
        "ticket_code",
        "employee_id",
        "creator_id",
        "company_id",
        "location_id",
        "department_id",
        "requester_name",
        "reported_issue_code",
        "task_code",
        "mode",
        "month",
        "date_started",
        "date_finished",
        "started_at",
        "resolved_at",
        "duration",
        "status",
        "assigned_tech_id",
        "created_at",
        "updated_at",
        "user_confirmed_at",
    )
    result = {key: getattr(row, key, None) for key in fields}
    result["description"] = decrypt(row.description_enc) if row.description_enc else ""
    result["diagnosis"] = (
        decrypt(row.diagnosis_enc) if getattr(row, "diagnosis_enc", None) else None
    )
    result["resolution_notes"] = (
        decrypt(row.resolution_notes_enc)
        if getattr(row, "resolution_notes_enc", None)
        else None
    )
    result["time_started"] = local(row.started_at).time() if row.started_at else None
    result["time_finished"] = local(row.resolved_at).time() if row.resolved_at else None
    result["transit_lag_days"] = (
        (row.date_finished - row.date_started).days + 1 - float(row.duration) / 8
        if row.date_finished is not None and row.duration is not None
        else None
    )
    return result
