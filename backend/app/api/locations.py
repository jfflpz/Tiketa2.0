from datetime import UTC, datetime, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import func, select

from app.api.deps import DB, Admin, CurrentUser
from app.core.cache import rate_limit
from app.core.config import settings
from app.core.security import digest
from app.models import (
    Department,
    Employee,
    Location,
    LocationDepartment,
    LocationObservation,
    TaskCategory,
    Ticket,
)
from app.schemas import (
    HubSummaryOut,
    LocationCreate,
    LocationDepartmentSummary,
    LocationObservationInput,
    LocationObservationOut,
    LocationOut,
    LocationUpdate,
)

router = APIRouter(prefix="/locations", tags=["Locations"])


def now():
    return datetime.now(UTC)


def business_now() -> datetime:
    return datetime.now(ZoneInfo(settings.BUSINESS_TIMEZONE))


@router.post("/observations", status_code=201, response_model=LocationObservationOut)
async def record_observation(
    body: LocationObservationInput,
    request: Request,
    db: DB,
):
    client_ip = request.client.host if request.client else "unknown"
    await rate_limit("loc_ip:" + digest(client_ip), 60, 60)

    obs = LocationObservation(
        session_id=body.session_id,
        latitude=body.latitude,
        longitude=body.longitude,
        accuracy=body.accuracy,
        captured_at=body.captured_at or now(),
        ip_digest=digest(client_ip),
    )
    db.add(obs)
    await db.commit()
    await db.refresh(obs)

    return LocationObservationOut(
        observation_id=obs.id,
        status="recorded",
    )


@router.get("/hub-summaries", response_model=list[HubSummaryOut])
async def hub_summaries(
    db: DB,
    user: CurrentUser,
):
    """Accurate, server-aggregated operational summaries for all terminal hubs."""
    locations = (await db.scalars(select(Location).where(Location.is_active.is_(True)).order_by(Location.code))).all()
    if not locations:
        return []

    loc_ids = [loc.id for loc in locations]
    now_utc = now()
    b_now = business_now()

    # 1. Complete status breakdown per location (OPEN, PROG, RESL, CLSD) excluding future records
    status_counts_query = (
        select(
            Ticket.location_id,
            Ticket.status,
            func.count().label("count"),
        )
        .where(
            Ticket.location_id.in_(loc_ids),
            Ticket.created_at <= now_utc,
        )
        .group_by(Ticket.location_id, Ticket.status)
    )
    status_counts_rows = (await db.execute(status_counts_query)).all()
    counts_by_loc: dict[UUID, dict[str, int]] = {loc.id: {} for loc in locations}
    for loc_id, status, count in status_counts_rows:
        if loc_id in counts_by_loc:
            counts_by_loc[loc_id][status] = count

    # 2. Closed this calendar month in Asia/Manila business timezone
    # Strictly bound [start_of_month, start_of_next_month) and <= now_utc
    # Authoritative closure timestamp is user_confirmed_at (employee sign-off or admin override)
    # Legacy data without user_confirmed_at lacks an audited closure date and is not fabricated
    start_of_month_date = b_now.date().replace(day=1)
    if b_now.month == 12:
        start_of_next_month_date = start_of_month_date.replace(
            year=b_now.year + 1, month=1
        )
    else:
        start_of_next_month_date = start_of_month_date.replace(month=b_now.month + 1)

    start_of_month_dt = datetime.combine(
        start_of_month_date,
        datetime.min.time(),
        tzinfo=ZoneInfo(settings.BUSINESS_TIMEZONE),
    )
    start_of_next_month_dt = datetime.combine(
        start_of_next_month_date,
        datetime.min.time(),
        tzinfo=ZoneInfo(settings.BUSINESS_TIMEZONE),
    )

    closed_month_query = (
        select(
            Ticket.location_id,
            func.count().label("count"),
        )
        .where(
            Ticket.location_id.in_(loc_ids),
            Ticket.status == "CLSD",
            Ticket.user_confirmed_at.is_not(None),
            Ticket.user_confirmed_at >= start_of_month_dt,
            Ticket.user_confirmed_at < start_of_next_month_dt,
            Ticket.user_confirmed_at <= now_utc,
        )
        .group_by(Ticket.location_id)
    )
    closed_month_rows = (await db.execute(closed_month_query)).all()
    closed_month_by_loc = {loc_id: count for loc_id, count in closed_month_rows}

    # 3. Top reported issue category in the last 30 days
    # Precise interval [now - 30d, now] with deterministic tie-breaker (TaskCategory.name.asc(), task_code.asc())
    thirty_days_ago_dt = now_utc - timedelta(days=30)
    top_task_query = (
        select(
            Ticket.location_id,
            Ticket.task_code,
            TaskCategory.name.label("task_name"),
            func.count().label("count"),
        )
        .join(TaskCategory, Ticket.task_code == TaskCategory.code)
        .where(
            Ticket.location_id.in_(loc_ids),
            Ticket.created_at >= thirty_days_ago_dt,
            Ticket.created_at <= now_utc,
        )
        .group_by(Ticket.location_id, Ticket.task_code, TaskCategory.name)
        .order_by(
            Ticket.location_id,
            func.count().desc(),
            TaskCategory.name.asc(),
            Ticket.task_code.asc(),
        )
    )
    top_task_rows = (await db.execute(top_task_query)).all()
    top_task_by_loc: dict[UUID, tuple[str, str, int]] = {}
    for loc_id, task_code, task_name, count in top_task_rows:
        if loc_id not in top_task_by_loc:
            top_task_by_loc[loc_id] = (task_code, task_name, count)

    # 4. Operating departments per location
    depts_query = (
        select(
            LocationDepartment.location_id,
            Department.id,
            Department.code,
            Department.name,
        )
        .join(Department, LocationDepartment.department_id == Department.id)
        .where(LocationDepartment.location_id.in_(loc_ids), LocationDepartment.is_active.is_(True), Department.is_active.is_(True))
        .order_by(Department.code)
    )
    depts_rows = (await db.execute(depts_query)).all()

    # Active tickets per (location_id, department_id)
    dept_active_query = (
        select(
            Ticket.location_id,
            Ticket.department_id,
            func.count().label("count"),
        )
        .where(
            Ticket.location_id.in_(loc_ids),
            Ticket.status.in_(["OPEN", "PROG", "RESL"]),
            Ticket.created_at <= now_utc,
        )
        .group_by(Ticket.location_id, Ticket.department_id)
    )
    dept_active_rows = (await db.execute(dept_active_query)).all()
    dept_active_map: dict[tuple[UUID, UUID], int] = {
        (loc_id, dept_id): count for loc_id, dept_id, count in dept_active_rows
    }

    depts_by_loc: dict[UUID, list[LocationDepartmentSummary]] = {
        loc.id: [] for loc in locations
    }
    for loc_id, d_id, d_code, d_name in depts_rows:
        if loc_id in depts_by_loc:
            active_cnt = dept_active_map.get((loc_id, d_id), 0)
            depts_by_loc[loc_id].append(
                LocationDepartmentSummary(
                    id=d_id,
                    code=d_code,
                    name=d_name,
                    active_tickets_count=active_cnt,
                )
            )

    # 5. Assemble outputs
    summaries: list[HubSummaryOut] = []
    for loc in locations:
        s_counts = counts_by_loc.get(loc.id, {})
        open_c = s_counts.get("OPEN", 0)
        prog_c = s_counts.get("PROG", 0)
        resl_c = s_counts.get("RESL", 0)
        closed_month_c = closed_month_by_loc.get(loc.id, 0)
        total_active_c = open_c + prog_c + resl_c

        top_info = top_task_by_loc.get(loc.id)
        top_code = top_info[0] if top_info else None
        top_name = top_info[1] if top_info else None
        top_cnt = top_info[2] if top_info else 0

        summaries.append(
            HubSummaryOut(
                id=loc.id,
                code=loc.code,
                name=loc.name,
                open_count=open_c,
                in_progress_count=prog_c,
                resolved_count=resl_c,
                closed_this_month_count=closed_month_c,
                total_active_count=total_active_c,
                top_issue_task_code=top_code,
                top_issue_task_name=top_name,
                top_issue_count=top_cnt,
                top_issue_window="Last 30 Days",
                departments=depts_by_loc.get(loc.id, []),
            )
        )

    return summaries

@router.post("", status_code=201, response_model=LocationOut)
async def create_location(body: LocationCreate, db: DB, admin: Admin):
    clean_code = body.code.strip().upper()
    clean_name = body.name.strip()

    # Unique constraint validation
    conflict = await db.scalar(
        select(Location).where(
            (func.upper(Location.code) == clean_code)
            | (func.lower(Location.name) == clean_name.lower())
        )
    )
    if conflict:
        raise HTTPException(409, "A location with this code or name already exists")

    loc = Location(
        code=clean_code,
        name=clean_name,
        address=body.address.strip() if body.address else None,
        is_active=body.is_active,
    )
    db.add(loc)
    await db.commit()
    await db.refresh(loc)
    return loc


@router.patch("/{location_id}", response_model=LocationOut)
async def update_location(location_id: UUID, body: LocationUpdate, db: DB, admin: Admin):
    loc = await db.get(Location, location_id, with_for_update=True)
    if not loc:
        raise HTTPException(404, "Location not found")

    if body.code is not None:
        clean_code = body.code.strip().upper()
        conflict = await db.scalar(
            select(Location).where(
                func.upper(Location.code) == clean_code,
                Location.id != location_id,
            )
        )
        if conflict:
            raise HTTPException(409, "A location with this code already exists")
        loc.code = clean_code

    if body.name is not None:
        clean_name = body.name.strip()
        conflict = await db.scalar(
            select(Location).where(
                func.lower(Location.name) == clean_name.lower(),
                Location.id != location_id,
            )
        )
        if conflict:
            raise HTTPException(409, "A location with this name already exists")
        loc.name = clean_name

    if body.address is not None:
        loc.address = body.address.strip() if body.address else None

    if body.is_active is False and loc.is_active is True:
        # Check active employees assigned
        emp_count = await db.scalar(
            select(func.count())
            .select_from(Employee)
            .where(Employee.location_id == location_id, Employee.is_active.is_(True))
        )
        if (emp_count or 0) > 0:
            raise HTTPException(409, "Cannot deactivate location with active assigned employees")

        # Check active tickets
        ticket_count = await db.scalar(
            select(func.count())
            .select_from(Ticket)
            .where(Ticket.location_id == location_id, Ticket.status.in_(["OPEN", "PROG"]))
        )
        if (ticket_count or 0) > 0:
            raise HTTPException(409, "Cannot deactivate location with active tickets in progress")

        loc.is_active = False
    elif body.is_active is True:
        loc.is_active = True

    await db.commit()
    await db.refresh(loc)
    return loc