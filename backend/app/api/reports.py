from datetime import UTC, date, timedelta
from types import SimpleNamespace
from typing import Literal
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import and_, func, select

from app.api.deps import DB, CurrentUser, SupervisorOrAdmin
from app.core.config import settings
from app.models import Company, Department, Location, MaintenancePlan, Ticket, User
from app.services.reports import (
    REPORT_COLUMNS,
    build_report,
    csv_chunks,
    percentage,
    pms_report,
)
from app.services.tickets import local, now

router = APIRouter(prefix="/reports", tags=["Reports"])
REPORTS = Literal[
    "monthly-sla",
    "staff-productivity",
    "department-demand",
    "backlog-exception",
    "transit-lag",
    "hardware-vulnerability",
    "pms-compliance",
    "chronic-requestors",
]


def window(date_from, date_to):
    today = local(now()).date()
    start, end = date_from or today.replace(day=1), date_to or today
    if end < start:
        raise HTTPException(422, "Start date must not be after end date")
    return start, end


async def report_window(db, date_from, date_to, all_time, pms=False):
    if not all_time:
        return window(date_from, date_to)

    if date_from is not None or date_to is not None:
        raise HTTPException(
            422, "Use either all_time=true or custom dates, not both"
        )

    today = local(now()).date()
    field = Ticket.date_finished if pms else Ticket.date_started
    query = select(func.min(field), func.max(field))
    if pms:
        query = query.where(Ticket.task_code.in_(["PC-PMS", "PRN-PMS"]))

    first_ticket, last_ticket = (await db.execute(query)).one()
    dates = [
        value
        for value in (first_ticket, last_ticket)
        if value is not None
    ]

    if pms:
        first_plan, last_plan = (
            await db.execute(
                select(
                    func.min(MaintenancePlan.month_start),
                    func.max(MaintenancePlan.month_start),
                )
            )
        ).one()
        dates.extend(
            value
            for value in (first_plan, last_plan)
            if value is not None
        )

    start = min(dates) if dates else today.replace(day=1)
    end = max(dates) if dates else today
    return start, end

async def load_rows(db, start, end, company_id, location_id, department_id, pms=False):
    query = (
        select(
            Ticket,
            Company.name.label("company"),
            Location.name.label("location"),
            Department.name.label("department"),
            User.full_name.label("technician"),
        )
        .join(Company, Ticket.company_id == Company.id)
        .join(Location, Ticket.location_id == Location.id)
        .join(Department, Ticket.department_id == Department.id)
        .outerjoin(User, Ticket.assigned_tech_id == User.id)
    )
    field = Ticket.date_finished if pms else Ticket.date_started
    query = query.where(field.between(start, end))
    if pms:
        query = query.where(Ticket.task_code.in_(["PC-PMS", "PRN-PMS"]))
    for column, value in (
        (Ticket.company_id, company_id),
        (Ticket.location_id, location_id),
        (Ticket.department_id, department_id),
    ):
        if value:
            query = query.where(column == value)
    records = (await db.execute(query)).all()
    return [
        SimpleNamespace(
            **{
                column.name: getattr(row[0], column.name)
                for column in Ticket.__table__.columns
            },
            company=row.company,
            location=row.location,
            department=row.department,
            technician=row.technician,
        )
        for row in records
    ]


@router.get("/kpis")
async def kpis(
    db: DB,
    user: CurrentUser,
    date_from: date | None = None,
    date_to: date | None = None,
    all_time: bool = False,
    company_id: UUID | None = None,
    location_id: UUID | None = None,
    department_id: UUID | None = None,
):
    start, end = await report_window(db, date_from, date_to, all_time)
    done = Ticket.status.in_(["RESL", "CLSD"])
    active = Ticket.status.in_(["OPEN", "PROG"])
    overdue = and_(active, Ticket.created_at < now() - timedelta(hours=48))
    query = (
        select(
            func.count().label("total"),
            func.count().filter(done).label("completed"),
            func.count().filter(active).label("active"),
            func.count().filter(overdue).label("overdue"),
            func.avg(Ticket.duration * 60).filter(done).label("labor"),
            func.count()
            .filter(and_(done, Ticket.date_finished == Ticket.date_started))
            .label("same_day"),
            func.count()
            .filter(
                and_(
                    done, Ticket.resolved_at - Ticket.created_at <= timedelta(hours=48)
                )
            )
            .label("on_time"),
        )
        .select_from(Ticket)
        .where(Ticket.date_started.between(start, end))
    )
    for column, value in (
        (Ticket.company_id, company_id),
        (Ticket.location_id, location_id),
        (Ticket.department_id, department_id),
    ):
        if value:
            query = query.where(column == value)
    row = (await db.execute(query)).one()
    return dict(
        total_tickets=row.total,
        active_tickets=row.active,
        completed=row.completed,
        overdue_backlog=row.overdue,
        avg_labor_minutes=round(float(row.labor), 4) if row.labor is not None else None,
        same_day_resolution_pct=percentage(row.same_day, row.completed),
        sla_compliance_pct=percentage(row.on_time, row.completed + row.overdue),
    )

@router.get("/hourly-demand")
async def hourly_demand(
    db: DB,
    user: SupervisorOrAdmin,
    date_from: date | None = None,
    date_to: date | None = None,
    company_id: UUID | None = None,
    location_id: UUID | None = None,
    department_id: UUID | None = None,
    all_time: bool = False,
):
    """Publish hourly repair start demand across 24 ordered bins in Asia/Manila."""
    start, end = await report_window(db, date_from, date_to, all_time)

    query = (
        select(Ticket.started_at)
        .where(
            Ticket.date_started.between(start, end),
            Ticket.started_at.is_not(None),
        )
    )
    for column, value in (
        (Ticket.company_id, company_id),
        (Ticket.location_id, location_id),
        (Ticket.department_id, department_id),
    ):
        if value:
            query = query.where(column == value)

    records = (await db.scalars(query)).all()

    tz = ZoneInfo(settings.BUSINESS_TIMEZONE)
    hour_counts = {h: 0 for h in range(24)}
    for dt in records:
        if dt:
            dt_aware = dt if dt.tzinfo else dt.replace(tzinfo=UTC)
            local_hour = dt_aware.astimezone(tz).hour
            hour_counts[local_hour] += 1

    return {
        "date_from": start,
        "date_to": end,
        "timezone": settings.BUSINESS_TIMEZONE,
        "source_field": "started_at",
        "rows": [
            {"hour": f"{h:02d}:00", "tickets": hour_counts[h]}
            for h in range(24)
        ],
    }

@router.get("/{report_name}")
async def report(
    report_name: REPORTS,
    db: DB,
    user: SupervisorOrAdmin,
    date_from: date | None = None,
    date_to: date | None = None,
    all_time: bool = False,
    company_id: UUID | None = None,
    location_id: UUID | None = None,
    department_id: UUID | None = None,
    format: Literal["json", "csv"] = Query("json"),
):
    is_pms = report_name == "pms-compliance"
    if is_pms and not all_time and date_to is None:
        import calendar

        today = local(now()).date()
        date_to = today.replace(day=calendar.monthrange(today.year, today.month)[1])
    start, end = await report_window(
        db, date_from, date_to, all_time, pms=is_pms
    )
    rows = await load_rows(
        db, start, end, company_id, location_id, department_id, is_pms
    )
    if is_pms:
        # PMS is monthly: disallow partial months to avoid misleading denominators.
        import calendar

        if start.day != 1 or end.day != calendar.monthrange(end.year, end.month)[1]:
            raise HTTPException(422, "PMS reports require complete calendar months")
        query = select(MaintenancePlan).where(
            MaintenancePlan.month_start.between(start, end)
        )
        for column, value in (
            (MaintenancePlan.location_id, location_id),
            (MaintenancePlan.department_id, department_id),
        ):
            if value:
                query = query.where(column == value)
        plans = (await db.scalars(query)).all()
        data = pms_report(rows, plans, local(now()).date(), bool(company_id))
    else:
        data = build_report(report_name, rows, now())

    if format == "csv":
        columns = REPORT_COLUMNS[report_name]
        return StreamingResponse(
            csv_chunks(data, columns),
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="{report_name}.csv"'
            },
        )

    return {
        "all_time": all_time,
        "date_from": start,
        "date_to": end,
        "rows": data,
    }
