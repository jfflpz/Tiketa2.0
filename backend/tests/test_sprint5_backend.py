import io
from datetime import timedelta
from uuid import UUID, uuid4

import openpyxl
import pytest
from sqlalchemy import select

from app.core.cache import invalidate_queue_version
from app.core.security import encrypt
from app.db.session import AsyncSessionLocal
from app.models import Company, LocationDepartment, TaskCategory, Ticket, User
from app.services.tickets import now


@pytest.mark.asyncio
async def test_sprint5_b01_assigned_ticket_ownership(client, accounts):
    """S5-08: Non-owner staff, including Admin, cannot edit assigned work or post comments."""
    # 1. Create an assigned ticket
    async with AsyncSessionLocal() as db:
        loc_dept = await db.scalar(select(LocationDepartment).limit(1))
        company = await db.scalar(select(Company).limit(1))
        task = await db.scalar(select(TaskCategory).limit(1))
        tech = await db.scalar(select(User).where(User.username == "tech"))

        ticket = Ticket(
            ticket_code=f"T-S5-{uuid4().hex[:6].upper()}",
            company_id=company.id,
            location_id=loc_dept.location_id,
            department_id=loc_dept.department_id,
            requester_name="S5 Requestor",
            task_code=task.code,
            description_enc=encrypt("Ownership test ticket"),
            month="November 2026",
            date_started=now().date(),
            status="PROG",
            mode="SITE",
            assigned_tech_id=tech.id,
            started_at=now(),
            created_at=now(),
            updated_at=now(),
        )
        db.add(ticket)
        await db.commit()
        ticket_id = str(ticket.id)

    # 2. Tech2 (non-owner IT) cannot edit service record -> 403
    res_tech2 = await client.patch(
        f"/api/v1/tickets/{ticket_id}/service-record",
        json={"diagnosis": "Tech2 should be denied"},
        headers=accounts["tech2"],
    )
    assert res_tech2.status_code == 403

    # 3. Admin (non-owner Admin) cannot edit service record without reassigning -> 403
    res_admin = await client.patch(
        f"/api/v1/tickets/{ticket_id}/service-record",
        json={"diagnosis": "Admin should be denied without explicit reassignment"},
        headers=accounts["admin"],
    )
    assert res_admin.status_code == 403

    # 4. Assigned owner (tech) can update service record -> 200
    res_owner = await client.patch(
        f"/api/v1/tickets/{ticket_id}/service-record",
        json={"diagnosis": "Owner diagnosis update"},
        headers=accounts["tech"],
    )
    assert res_owner.status_code == 200

    # 5. Non-owner cannot post staff comments -> 403
    res_comment_admin = await client.post(
        f"/api/v1/tickets/{ticket_id}/comments",
        json={"body": "Admin comment attempt", "is_internal": True},
        headers=accounts["admin"],
    )
    assert res_comment_admin.status_code == 403

    # 6. Assigned owner can post comment -> 201
    res_comment_owner = await client.post(
        f"/api/v1/tickets/{ticket_id}/comments",
        json={"body": "Owner comment", "is_internal": True},
        headers=accounts["tech"],
    )
    assert res_comment_owner.status_code == 201


@pytest.mark.asyncio
async def test_sprint5_b03_admin_password_reset(client, accounts):
    """S5-12: Admin reset requires acting admin password; invalid credentials or mismatch rejected."""
    async with AsyncSessionLocal() as db:
        target = await db.scalar(select(User).where(User.username == "tech"))
        target_id = str(target.id)
        original_version = target.token_version

    # Wrong acting admin password -> 401
    res_bad_pw = await client.post(
        f"/api/v1/admin/users/{target_id}/reset-password",
        json={
            "admin_current_password": "wrong-admin-password",
            "new_password": "new-secure-password-123",
            "confirm_password": "new-secure-password-123",
        },
        headers=accounts["admin"],
    )
    assert res_bad_pw.status_code == 401

    # Mismatched confirmation -> 422
    res_mismatch = await client.post(
        f"/api/v1/admin/users/{target_id}/reset-password",
        json={
            "admin_current_password": "correct-horse-battery",
            "new_password": "new-secure-password-123",
            "confirm_password": "different-password-123",
        },
        headers=accounts["admin"],
    )
    assert res_mismatch.status_code == 422

    # Valid reset -> 200 and token_version bumped
    res_valid = await client.post(
        f"/api/v1/admin/users/{target_id}/reset-password",
        json={
            "admin_current_password": "correct-horse-battery",
            "new_password": "new-secure-password-123",
            "confirm_password": "new-secure-password-123",
        },
        headers=accounts["admin"],
    )
    assert res_valid.status_code == 200

    async with AsyncSessionLocal() as db:
        updated = await db.get(User, UUID(target_id))
        assert updated.token_version == original_version + 1


@pytest.mark.asyncio
async def test_sprint5_b04_admin_username_cooldown(client, accounts):
    """S5-13: Immediate username edit with 168-hour cooldown."""
    async with AsyncSessionLocal() as db:
        target = await db.scalar(select(User).where(User.username == "intern"))
        target_id = str(target.id)

    # First update succeeds
    res1 = await client.patch(
        f"/api/v1/admin/users/{target_id}/username",
        json={"username": "intern_renamed"},
        headers=accounts["admin"],
    )
    assert res1.status_code == 200
    assert res1.json()["username"] == "intern_renamed"
    assert "next_eligible_at" in res1.json()

    # Second immediate change blocked by cooldown -> 409
    res2 = await client.patch(
        f"/api/v1/admin/users/{target_id}/username",
        json={"username": "intern_second_try"},
        headers=accounts["admin"],
    )
    assert res2.status_code == 409
    assert "cooldown" in res2.json()["detail"].lower()


@pytest.mark.asyncio
async def test_sprint5_b07_job_logs_xlsx_export(client, accounts):
    """S5-02: Export job logs as styled XLSX with canonical columns."""
    res = await client.get(
        "/api/v1/tickets/job-logs/export",
        headers=accounts["supervisor"],
    )
    assert res.status_code == 200
    assert "openxmlformats" in res.headers.get("content-type", "")

    wb = openpyxl.load_workbook(io.BytesIO(res.content))
    ws = wb.active
    assert ws.title == "Job Logs"


@pytest.mark.asyncio
async def test_sprint5_b02_queue_priority_sorting(client, accounts):
    """S5-09: Queue defaults to highest priority first, then oldest creation time."""
    async with AsyncSessionLocal() as db:
        loc_dept = await db.scalar(select(LocationDepartment).limit(1))
        company = await db.scalar(select(Company).limit(1))

        # Seed 3 tickets with different task priority weights
        # PERIPH-REP (Low), NET-CFG (High), SRV-ASSESS (Critical)
        t_low = Ticket(
            ticket_code=f"T-LOW-{uuid4().hex[:4].upper()}",
            company_id=company.id,
            location_id=loc_dept.location_id,
            department_id=loc_dept.department_id,
            requester_name="Low Req",
            task_code="PERIPH-REP",
            description_enc=encrypt("Low priority task"),
            month="November 2026",
            date_started=now().date(),
            status="OPEN",
            created_at=now() - timedelta(minutes=10),
            updated_at=now(),
        )
        t_high = Ticket(
            ticket_code=f"T-HIGH-{uuid4().hex[:4].upper()}",
            company_id=company.id,
            location_id=loc_dept.location_id,
            department_id=loc_dept.department_id,
            requester_name="High Req",
            task_code="NET-CFG",
            description_enc=encrypt("High priority task"),
            month="November 2026",
            date_started=now().date(),
            status="OPEN",
            created_at=now() - timedelta(minutes=5),
            updated_at=now(),
        )
        t_crit = Ticket(
            ticket_code=f"T-CRIT-{uuid4().hex[:4].upper()}",
            company_id=company.id,
            location_id=loc_dept.location_id,
            department_id=loc_dept.department_id,
            requester_name="Crit Req",
            task_code="SRV-ASSESS",
            description_enc=encrypt("Critical priority task"),
            month="November 2026",
            date_started=now().date(),
            status="OPEN",
            created_at=now() - timedelta(minutes=1),
            updated_at=now(),
        )
        db.add_all([t_low, t_high, t_crit])
        await db.commit()

    await invalidate_queue_version()

    # Query queue as tech
    res = await client.get("/api/v1/tickets?order=asc", headers=accounts["tech"])
    assert res.status_code == 200
    items = res.json()
    codes = [item["ticket_code"] for item in items]

    # Verify Critical appears before High, and High appears before Low
    crit_idx = next(i for i, c in enumerate(codes) if "T-CRIT" in c)
    high_idx = next(i for i, c in enumerate(codes) if "T-HIGH" in c)
    low_idx = next(i for i, c in enumerate(codes) if "T-LOW" in c)
    assert crit_idx < high_idx < low_idx
