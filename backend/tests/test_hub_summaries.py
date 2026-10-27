from datetime import datetime, date, time, timedelta
from decimal import Decimal
from uuid import uuid4
from zoneinfo import ZoneInfo
import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.core.config import settings
from app.core.security import encrypt
from app.db.session import AsyncSessionLocal
from app.models import Company, Department, Employee, Location, LocationDepartment, TaskCategory, Ticket, User
from app.services.tickets import now


@pytest.mark.asyncio
async def test_hub_summaries_requires_auth(client: AsyncClient):
    res = await client.get("/api/v1/locations/hub-summaries")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_hub_summaries_authenticated_for_it_and_admin(
    client: AsyncClient, accounts
):
    tech_headers = accounts["tech"]
    admin_headers = accounts["admin"]

    # IT Staff
    res_it = await client.get("/api/v1/locations/hub-summaries", headers=tech_headers)
    assert res_it.status_code == 200
    data_it = res_it.json()
    assert isinstance(data_it, list)
    assert len(data_it) > 0

    # Admin Staff
    res_admin = await client.get(
        "/api/v1/locations/hub-summaries", headers=admin_headers
    )
    assert res_admin.status_code == 200
    data_admin = res_admin.json()
    assert len(data_admin) == len(data_it)

    # Check required fields
    sample = data_it[0]
    assert "id" in sample
    assert "code" in sample
    assert "name" in sample
    assert "open_count" in sample
    assert "in_progress_count" in sample
    assert "resolved_count" in sample
    assert "closed_this_month_count" in sample
    assert "total_active_count" in sample
    assert "top_issue_window" in sample
    assert "departments" in sample
    assert isinstance(sample["departments"], list)


@pytest.mark.asyncio
async def test_hub_summaries_accurate_workload_and_departments(
    client: AsyncClient, accounts
):
    tech_headers = accounts["tech"]
    res = await client.get("/api/v1/locations/hub-summaries", headers=tech_headers)
    assert res.status_code == 200
    summaries = res.json()

    # Find Pasay (PSY)
    psy = next((s for s in summaries if s["code"] == "PSY"), None)
    assert psy is not None

    # Verify total_active_count == open + in_prog + resolved
    assert psy["total_active_count"] == (
        psy["open_count"] + psy["in_progress_count"] + psy["resolved_count"]
    )

    # Verify departments match location_departments in DB
    async with AsyncSessionLocal() as db:
        dept_ids_in_db = (
            await db.scalars(
                select(LocationDepartment.department_id).where(
                    LocationDepartment.location_id == psy["id"]
                )
            )
        ).all()
        assert len(psy["departments"]) == len(dept_ids_in_db)


@pytest.mark.asyncio
async def test_tickets_queue_filtering_by_location_and_order(
    client: AsyncClient, accounts
):
    tech_headers = accounts["tech"]
    # Get all locations
    loc_res = await client.get("/api/v1/locations/hub-summaries", headers=tech_headers)
    locations = loc_res.json()
    psy = next(loc for loc in locations if loc["code"] == "PSY")

    # Query tickets for PSY only
    res = await client.get(
        "/api/v1/tickets",
        headers=tech_headers,
        params={
            "location_id": psy["id"],
            "status": "ALL",
            "order": "desc",
            "limit": 20,
        },
    )
    assert res.status_code == 200
    tickets = res.json()
    for t in tickets:
        assert t["location_id"] == psy["id"]


@pytest.mark.asyncio
async def test_hub_summaries_closure_semantics_and_future_exclusion(
    client: AsyncClient, accounts
):
    tech_headers = accounts["tech"]
    now_utc = now()
    manila_tz = ZoneInfo(settings.BUSINESS_TIMEZONE)
    b_now = now_utc.astimezone(manila_tz)

    start_of_month_date = b_now.date().replace(day=1)
    if b_now.month == 12:
        start_of_next_month_date = start_of_month_date.replace(year=b_now.year + 1, month=1)
    else:
        start_of_next_month_date = start_of_month_date.replace(month=b_now.month + 1)

    start_of_month_dt = datetime.combine(
        start_of_month_date,
        datetime.min.time(),
        tzinfo=manila_tz,
    )
    start_of_next_month_dt = datetime.combine(
        start_of_next_month_date,
        datetime.min.time(),
        tzinfo=manila_tz,
    )

    async with AsyncSessionLocal() as db:
        company = await db.scalar(select(Company).limit(1))
        dept = await db.scalar(select(Department).limit(1))
        task = await db.scalar(select(TaskCategory).limit(1))
        tech = await db.scalar(select(User).where(User.role == "it").limit(1))

        # Create an isolated test location
        test_loc = Location(code=f"TST{uuid4().hex[:4].upper()}", name="Test Station")
        db.add(test_loc)
        await db.flush()

        loc_dept = LocationDepartment(location_id=test_loc.id, department_id=dept.id)
        db.add(loc_dept)
        await db.flush()

        # Ticket 1: Closed in current month with user_confirmed_at (MUST count in closed_this_month)
        t1 = Ticket(
            ticket_code=f"T-TEST-{uuid4().hex[:4].upper()}",
            company_id=company.id,
            location_id=test_loc.id,
            department_id=dept.id,
            requester_name="Test Requestor",
            task_code=task.code,
            description_enc=encrypt("Ticket closed this month with sign-off"),
            month="October 2026",
            date_started=start_of_month_dt.date(),
            status="CLSD",
            mode="SITE",
            assigned_tech_id=tech.id,
            started_at=start_of_month_dt + timedelta(hours=1),
            resolved_at=start_of_month_dt + timedelta(hours=3),
            duration=Decimal("2.0"),
            created_at=start_of_month_dt + timedelta(hours=2),
            date_finished=start_of_month_dt.date(),
            user_confirmed_at=start_of_month_dt + timedelta(hours=5),
        )

        # Ticket 2: date_finished was in previous month, but user_confirmed_at is in current month (MUST count in current month)
        prev_month_date = (start_of_month_date - timedelta(days=5))
        t2 = Ticket(
            ticket_code=f"T-TEST-{uuid4().hex[:4].upper()}",
            company_id=company.id,
            location_id=test_loc.id,
            department_id=dept.id,
            requester_name="Test Requestor",
            task_code=task.code,
            description_enc=encrypt("Finished last month, confirmed this month"),
            month="October 2026",
            date_started=prev_month_date,
            status="CLSD",
            mode="SITE",
            assigned_tech_id=tech.id,
            started_at=start_of_month_dt - timedelta(days=5),
            resolved_at=start_of_month_dt - timedelta(days=4),
            duration=Decimal("24.0"),
            created_at=start_of_month_dt - timedelta(days=10),
            date_finished=prev_month_date,
            user_confirmed_at=start_of_month_dt + timedelta(hours=10),
        )

        # Ticket 3: Confirmed in previous month (MUST NOT count in closed_this_month)
        t3 = Ticket(
            ticket_code=f"T-TEST-{uuid4().hex[:4].upper()}",
            company_id=company.id,
            location_id=test_loc.id,
            department_id=dept.id,
            requester_name="Test Requestor",
            task_code=task.code,
            description_enc=encrypt("Confirmed in previous month"),
            month="September 2026",
            date_started=prev_month_date,
            status="CLSD",
            mode="SITE",
            assigned_tech_id=tech.id,
            started_at=start_of_month_dt - timedelta(days=20),
            resolved_at=start_of_month_dt - timedelta(days=19),
            duration=Decimal("24.0"),
            created_at=start_of_month_dt - timedelta(days=20),
            date_finished=prev_month_date,
            user_confirmed_at=start_of_month_dt - timedelta(days=2),
        )

        # Ticket 4: Legacy closed ticket with user_confirmed_at=None (MUST NOT count in closed_this_month)
        t4 = Ticket(
            ticket_code=f"T-TEST-{uuid4().hex[:4].upper()}",
            company_id=company.id,
            location_id=test_loc.id,
            department_id=dept.id,
            requester_name="Test Requestor",
            task_code=task.code,
            description_enc=encrypt("Legacy closed ticket without confirmation timestamp"),
            month="October 2026",
            date_started=b_now.date(),
            status="CLSD",
            mode="SITE",
            assigned_tech_id=tech.id,
            started_at=start_of_month_dt + timedelta(hours=1),
            resolved_at=start_of_month_dt + timedelta(hours=2),
            duration=Decimal("1.0"),
            created_at=start_of_month_dt + timedelta(hours=1),
            date_finished=b_now.date(),
            user_confirmed_at=None,
        )

        # Ticket 5: Future-dated confirmation (user_confirmed_at > now_utc) (MUST NOT count)
        t5 = Ticket(
            ticket_code=f"T-TEST-{uuid4().hex[:4].upper()}",
            company_id=company.id,
            location_id=test_loc.id,
            department_id=dept.id,
            requester_name="Test Requestor",
            task_code=task.code,
            description_enc=encrypt("Future dated closure"),
            month="October 2026",
            date_started=b_now.date(),
            status="CLSD",
            mode="SITE",
            assigned_tech_id=tech.id,
            started_at=now_utc - timedelta(hours=3),
            resolved_at=now_utc - timedelta(hours=2),
            duration=Decimal("1.0"),
            created_at=now_utc - timedelta(hours=3),
            date_finished=b_now.date(),
            user_confirmed_at=now_utc + timedelta(days=2),
        )

        # Ticket 6: Active ticket created in past (MUST count in open_count & total_active_count)
        t6 = Ticket(
            ticket_code=f"T-TEST-{uuid4().hex[:4].upper()}",
            company_id=company.id,
            location_id=test_loc.id,
            department_id=dept.id,
            requester_name="Test Requestor",
            task_code=task.code,
            description_enc=encrypt("Active ticket"),
            month="October 2026",
            date_started=b_now.date(),
            status="OPEN",
            created_at=now_utc - timedelta(hours=1),
        )

        # Ticket 7: Future-dated active ticket (created_at > now_utc) (MUST NOT count in active metrics)
        t7 = Ticket(
            ticket_code=f"T-TEST-{uuid4().hex[:4].upper()}",
            company_id=company.id,
            location_id=test_loc.id,
            department_id=dept.id,
            requester_name="Test Requestor",
            task_code=task.code,
            description_enc=encrypt("Future dated active ticket"),
            month="October 2026",
            date_started=b_now.date(),
            status="OPEN",
            created_at=now_utc + timedelta(days=2),
        )

        db.add_all([t1, t2, t3, t4, t5, t6, t7])
        await db.commit()

    # Query hub summaries
    res = await client.get("/api/v1/locations/hub-summaries", headers=tech_headers)
    assert res.status_code == 200
    summaries = res.json()

    target = next((s for s in summaries if s["id"] == str(test_loc.id)), None)
    assert target is not None

    # Closed this month: exactly t1 and t2 (2 tickets)
    assert target["closed_this_month_count"] == 2

    # Active counts: exactly t6 (1 ticket), t7 excluded because created_at > now
    assert target["open_count"] == 1
    assert target["total_active_count"] == 1
    assert target["departments"][0]["active_tickets_count"] == 1


@pytest.mark.asyncio
async def test_hub_summaries_top_issue_deterministic_tie_breaker(
    client: AsyncClient, accounts
):
    tech_headers = accounts["tech"]
    now_utc = now()

    async with AsyncSessionLocal() as db:
        company = await db.scalar(select(Company).limit(1))
        dept = await db.scalar(select(Department).limit(1))

        # Create two distinct task categories
        suffix = uuid4().hex[:4].upper()
        code_b = f"TSK-B-{suffix}"
        code_a = f"TSK-A-{suffix}"
        cat_b = TaskCategory(code=code_b, name=f"Zeta Issue {suffix}")
        cat_a = TaskCategory(code=code_a, name=f"Alpha Issue {suffix}")
        db.add_all([cat_b, cat_a])
        await db.flush()

        test_loc = Location(code=f"TB{suffix}", name=f"TieBreaker Station {suffix}")
        db.add(test_loc)
        await db.flush()

        loc_dept = LocationDepartment(location_id=test_loc.id, department_id=dept.id)
        db.add(loc_dept)
        await db.flush()

        # Insert 2 tickets for Zeta and 2 tickets for Alpha within last 10 days
        for i in range(2):
            t_b = Ticket(
                ticket_code=f"T-ZET-{suffix}-{i}",
                company_id=company.id,
                location_id=test_loc.id,
                department_id=dept.id,
                requester_name="Test Requestor",
                task_code=code_b,
                description_enc=encrypt(f"Zeta ticket {i}"),
                month="October 2026",
                date_started=now_utc.date(),
                status="OPEN",
                created_at=now_utc - timedelta(days=2, hours=i),
            )
            t_a = Ticket(
                ticket_code=f"T-ALP-{suffix}-{i}",
                company_id=company.id,
                location_id=test_loc.id,
                department_id=dept.id,
                requester_name="Test Requestor",
                task_code=code_a,
                description_enc=encrypt(f"Alpha ticket {i}"),
                month="October 2026",
                date_started=now_utc.date(),
                status="OPEN",
                created_at=now_utc - timedelta(days=2, hours=i),
            )
            db.add_all([t_b, t_a])

        await db.commit()

    # Query hub summaries
    res = await client.get("/api/v1/locations/hub-summaries", headers=tech_headers)
    assert res.status_code == 200
    summaries = res.json()

    target = next((s for s in summaries if s["id"] == str(test_loc.id)), None)
    assert target is not None

    # Both categories have count = 2.
    # Deterministic tie-breaker: TaskCategory.name.asc(), task_code.asc()
    # "Alpha Issue ..." comes before "Zeta Issue ...", so Alpha Issue wins!
    assert target["top_issue_count"] == 2
    assert target["top_issue_task_code"] == code_a
    assert target["top_issue_task_name"] == f"Alpha Issue {suffix}"


@pytest.mark.asyncio
async def test_admin_status_patch_clsd_stamps_user_confirmed_at(
    client: AsyncClient, accounts
):
    admin_headers = accounts["admin"]

    async with AsyncSessionLocal() as db:
        loc_dept = await db.scalar(select(LocationDepartment).limit(1))
        company = await db.scalar(select(Company).limit(1))
        task = await db.scalar(select(TaskCategory).limit(1))
        tech = await db.scalar(select(User).where(User.role == "it").limit(1))

        ticket = Ticket(
            ticket_code=f"T-ADM-{uuid4().hex[:6].upper()}",
            company_id=company.id,
            location_id=loc_dept.location_id,
            department_id=loc_dept.department_id,
            requester_name="Test Requestor",
            task_code=task.code,
            description_enc=encrypt("Ticket to be closed by admin override"),
            month="October 2026",
            date_started=now().date() - timedelta(days=5),
            status="RESL",
            mode="SITE",
            assigned_tech_id=tech.id,
            started_at=now() - timedelta(hours=80),
            resolved_at=now() - timedelta(hours=74),
            duration=Decimal("6.0"),
            date_finished=now().date() - timedelta(days=3),
            created_at=now() - timedelta(hours=80),
            updated_at=now() - timedelta(hours=73),
            user_confirmed_at=None,
        )
        db.add(ticket)
        await db.commit()
        ticket_id = ticket.id

    # Admin overrides status to CLSD
    res = await client.patch(
        f"/api/v1/tickets/{ticket_id}/status",
        headers=admin_headers,
        json={"status": "CLSD"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "CLSD"

    # Verify user_confirmed_at was stamped in DB
    async with AsyncSessionLocal() as db:
        updated = await db.scalar(select(Ticket).where(Ticket.id == ticket_id))
        assert updated is not None
        assert updated.status == "CLSD"
        assert updated.user_confirmed_at is not None
