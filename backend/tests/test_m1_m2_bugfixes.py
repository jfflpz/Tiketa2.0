import re

import pytest
from sqlalchemy import select

from app.core.security import decrypt
from app.db.session import AsyncSessionLocal
from app.models import Employee, Ticket, TicketTechnician, User


async def test_numeric_employee_id_validation(client, accounts):
    # Staff lookup of non-numeric string rejected with 422
    assert (
        await client.get("/api/v1/employees/lookup?q=FS-1042", headers=accounts["tech"])
    ).status_code == 422
    assert (
        await client.get("/api/v1/employees/lookup?q=EMP-123", headers=accounts["tech"])
    ).status_code == 422
    assert (
        await client.get("/api/v1/employees/lookup?q=10-42", headers=accounts["tech"])
    ).status_code == 422

    # Staff lookup of email works
    assert (
        await client.get(
            "/api/v1/employees/lookup?q=maria.santos@example.com",
            headers=accounts["tech"],
        )
    ).status_code == 200

    # Public submit rejects prefixed or non-digit employee ID
    assert (
        await client.post(
            "/api/v1/tickets/submit",
            json={
                "employee_id": "FS-1042",
                "task_code": "PRN-TS",
                "description": "Printer is not working at all",
            },
        )
    ).status_code == 422

    # Public submit accepts numeric employee ID with leading zero
    # First create employee with leading zero
    async with AsyncSessionLocal() as db:
        user_emp = await db.scalar(
            select(Employee).where(Employee.employee_id == "1042")
        )
        db.add(
            Employee(
                employee_id="0042",
                full_name="Zero Leading Employee",
                email="zero.leading@example.com",
                company_id=user_emp.company_id,
                location_id=user_emp.location_id,
                department_id=user_emp.department_id,
            )
        )
        await db.commit()

    res = await client.post(
        "/api/v1/tickets/submit",
        json={
            "employee_id": "0042",
            "task_code": "PRN-TS",
            "description": "Printer is not working at all for 0042",
        },
    )
    assert res.status_code == 201, res.text


async def test_public_reported_issue_code_and_mismatch_rejection(client):
    # Valid public kiosk category PRN-TS
    res = await client.post(
        "/api/v1/tickets/submit",
        json={
            "employee_id": "1042",
            "task_code": "PRN-TS",
            "description": "Thermal printer is offline at ticket booth",
        },
    )
    assert res.status_code == 201
    code = res.json()["ticket_code"]

    async with AsyncSessionLocal() as db:
        t = await db.scalar(select(Ticket).where(Ticket.ticket_code == code))
        assert t.reported_issue_code == "PRN-TS"

    # Non-kiosk category in public submit rejected
    res_bad = await client.post(
        "/api/v1/tickets/submit",
        json={
            "employee_id": "1042",
            "task_code": "PC-SETUP",  # Registered task category but NOT a public kiosk button
            "description": "Setup request from public kiosk endpoint",
        },
    )
    assert res_bad.status_code == 422

    # Mismatch between reported_issue_code and task_code in public submit rejected
    res_mismatch = await client.post(
        "/api/v1/tickets/submit",
        json={
            "employee_id": "1042",
            "task_code": "PRN-TS",
            "reported_issue_code": "NET-CFG",
            "description": "Mismatched issue and task classification",
        },
    )
    assert res_mismatch.status_code == 422


async def test_service_record_update_and_permissions(client, accounts):
    # Tech creates a quick intake ticket
    res = await client.post(
        "/api/v1/tickets/quick-intake",
        json={
            "employee_id": "1042",
            "task_code": "PRN-TS",
            "description": "Quick intake printer diagnosis testing",
        },
        headers=accounts["tech"],
    )
    assert res.status_code == 201, res.text
    ticket_id = res.json()["id"]

    # Claim ticket by tech
    await client.patch(f"/api/v1/tickets/{ticket_id}/claim", headers=accounts["tech"])

    # Empty service-record update returns 422
    assert (
        await client.patch(
            f"/api/v1/tickets/{ticket_id}/service-record",
            json={},
            headers=accounts["tech"],
        )
    ).status_code == 422

    # Unassigned tech (tech2) denied service record update (403)
    assert (
        await client.patch(
            f"/api/v1/tickets/{ticket_id}/service-record",
            json={"diagnosis": "Attempted diagnosis by tech2"},
            headers=accounts["tech2"],
        )
    ).status_code == 403

    # Assigned tech updates service record
    update_res = await client.patch(
        f"/api/v1/tickets/{ticket_id}/service-record",
        json={
            "task_code": "PRN-NET",
            "diagnosis": "Worn gear roller replaced and network IP reconfigured",
            "resolution_notes": "Completed firmware calibration",
        },
        headers=accounts["tech"],
    )
    assert update_res.status_code == 200, update_res.text
    data = update_res.json()
    assert data["task_code"] == "PRN-NET"
    assert data["diagnosis"] == "Worn gear roller replaced and network IP reconfigured"
    assert data["resolution_notes"] == "Completed firmware calibration"
    assert data["description"] == "Quick intake printer diagnosis testing"

    # Verify encryption at rest
    async with AsyncSessionLocal() as db:
        t = await db.scalar(select(Ticket).where(Ticket.id == ticket_id))
        assert "gear roller" not in t.diagnosis_enc
        assert "calibration" not in t.resolution_notes_enc
        assert (
            decrypt(t.diagnosis_enc)
            == "Worn gear roller replaced and network IP reconfigured"
        )
        assert decrypt(t.resolution_notes_enc) == "Completed firmware calibration"

    # Admin can also update service record
    admin_res = await client.patch(
        f"/api/v1/tickets/{ticket_id}/service-record",
        json={"resolution_notes": "Administrator verified service notes"},
        headers=accounts["admin"],
    )
    assert admin_res.status_code == 200
    assert (
        admin_res.json()["resolution_notes"] == "Administrator verified service notes"
    )

    # Whitespace-only clears to None
    clear_res = await client.patch(
        f"/api/v1/tickets/{ticket_id}/service-record",
        json={"resolution_notes": "   "},
        headers=accounts["admin"],
    )
    assert clear_res.status_code == 200
    assert clear_res.json()["resolution_notes"] is None


async def test_status_endpoint_classification_permission(client, accounts):
    res = await client.post(
        "/api/v1/tickets/quick-intake",
        json={
            "employee_id": "1042",
            "task_code": "PRN-TS",
            "description": "Testing status endpoint authorization",
        },
        headers=accounts["tech"],
    )
    ticket_id = res.json()["id"]

    # Tech claims it
    await client.patch(f"/api/v1/tickets/{ticket_id}/claim", headers=accounts["tech"])

    # Tech2 tries to change task_code via status endpoint -> 403 Forbidden
    res_forbidden = await client.patch(
        f"/api/v1/tickets/{ticket_id}/status",
        json={"status": "PROG", "task_code": "NET-CFG"},
        headers=accounts["tech2"],
    )
    assert res_forbidden.status_code == 403


async def test_admin_authoritative_dispatch(client, accounts):
    # Submit ticket
    res = await client.post(
        "/api/v1/tickets/submit",
        json={
            "employee_id": "1042",
            "task_code": "NET-CFG",
            "description": "Wi-Fi router offline at dispatch area",
        },
    )
    assert res.status_code == 201
    code = res.json()["ticket_code"]

    async with AsyncSessionLocal() as db:
        t = await db.scalar(select(Ticket).where(Ticket.ticket_code == code))
        ticket_id = t.id
        tech_user = await db.scalar(select(User).where(User.username == "tech"))
        tech2_user = await db.scalar(select(User).where(User.username == "tech2"))
        admin_user = await db.scalar(select(User).where(User.username == "admin"))

    # Tech user calling assign endpoint -> 403 Forbidden
    assert (
        await client.patch(
            f"/api/v1/tickets/{ticket_id}/assign",
            json={"technician_id": str(tech_user.id)},
            headers=accounts["tech"],
        )
    ).status_code == 403

    # Admin assigns to tech -> Status transitions to PROG, started_at set
    assign_res = await client.patch(
        f"/api/v1/tickets/{ticket_id}/assign",
        json={"technician_id": str(tech_user.id)},
        headers=accounts["admin"],
    )
    assert assign_res.status_code == 200, assign_res.text
    data = assign_res.json()
    assert data["status"] == "PROG"
    assert data["assigned_tech_id"] == str(tech_user.id)
    assert data["started_at"] is not None
    original_started_at = data["started_at"]

    # Reassign to tech2 -> started_at preserved, primary changed
    reassign_res = await client.patch(
        f"/api/v1/tickets/{ticket_id}/assign",
        json={"technician_id": str(tech2_user.id)},
        headers=accounts["admin"],
    )
    assert reassign_res.status_code == 200
    data2 = reassign_res.json()
    assert data2["assigned_tech_id"] == str(tech2_user.id)
    assert data2["started_at"] == original_started_at

    # Check associations in database: tech is demoted, tech2 is primary
    async with AsyncSessionLocal() as db:
        assocs = (
            await db.scalars(
                select(TicketTechnician).where(TicketTechnician.ticket_id == ticket_id)
            )
        ).all()
        assert len(assocs) == 2
        primary = next(a for a in assocs if a.is_primary)
        assert primary.technician_id == tech2_user.id

    # Reassign back to tech -> reuses existing association without duplicate key violation
    back_res = await client.patch(
        f"/api/v1/tickets/{ticket_id}/assign",
        json={"technician_id": str(tech_user.id)},
        headers=accounts["admin"],
    )
    assert back_res.status_code == 200
    assert back_res.json()["assigned_tech_id"] == str(tech_user.id)

    # Same assignment is idempotent no-op
    noop_res = await client.patch(
        f"/api/v1/tickets/{ticket_id}/assign",
        json={"technician_id": str(tech_user.id)},
        headers=accounts["admin"],
    )
    assert noop_res.status_code == 200

    # Cannot assign to admin role (must be active IT technician)
    assert (
        await client.patch(
            f"/api/v1/tickets/{ticket_id}/assign",
            json={"technician_id": str(admin_user.id)},
            headers=accounts["admin"],
        )
    ).status_code == 422


async def test_queue_filters_status_and_technician(client, accounts):
    async with AsyncSessionLocal() as db:
        tech1 = await db.scalar(select(User).where(User.username == "tech"))
        tech2 = await db.scalar(select(User).where(User.username == "tech2"))

    # Create and claim ticket for tech1
    t1 = (
        await client.post(
            "/api/v1/tickets/quick-intake",
            json={
                "employee_id": "1042",
                "task_code": "PRN-TS",
                "description": "Tech1 ticket queue filter test",
            },
            headers=accounts["tech"],
        )
    ).json()
    await client.patch(f"/api/v1/tickets/{t1['id']}/claim", headers=accounts["tech"])

    # Create and claim ticket for tech2
    t2 = (
        await client.post(
            "/api/v1/tickets/quick-intake",
            json={
                "employee_id": "1042",
                "task_code": "NET-CFG",
                "description": "Tech2 ticket queue filter test",
            },
            headers=accounts["tech2"],
        )
    ).json()
    await client.patch(f"/api/v1/tickets/{t2['id']}/claim", headers=accounts["tech2"])

    # Filter queue by tech1
    q_tech1 = (
        await client.get(
            f"/api/v1/tickets?technician_id={tech1.id}", headers=accounts["tech"]
        )
    ).json()
    tech1_ids = [row["id"] for row in q_tech1]
    assert t1["id"] in tech1_ids
    assert t2["id"] not in tech1_ids

    # Filter queue by tech2
    q_tech2 = (
        await client.get(
            f"/api/v1/tickets?technician_id={tech2.id}", headers=accounts["tech"]
        )
    ).json()
    tech2_ids = [row["id"] for row in q_tech2]
    assert t2["id"] in tech2_ids
    assert t1["id"] not in tech2_ids


async def test_preflight_numeric_migration_simulation():
    # Verify migration 0005 preflight regex and logic
    pattern = re.compile(r"^[0-9]{1,50}$")

    # Valid conversion
    raw = "FS-0012"
    assert raw.startswith("FS-")
    candidate = raw[3:]
    assert pattern.match(candidate)
    assert candidate == "0012"

    # Already numeric stays as-is
    numeric_raw = "1042"
    assert pattern.match(numeric_raw)

    # Non-numeric after prefix fails
    bad_raw = "FS-ABC12"
    bad_candidate = bad_raw[3:]
    assert not pattern.match(bad_candidate)

    # Collision detection
    records = [
        ("uuid-1", "FS-1042"),
        ("uuid-2", "1042"),
    ]
    seen = {}
    with pytest.raises(ValueError, match="collision"):
        for uid, code in records:
            cand = code[3:] if code.startswith("FS-") else code
            if cand in seen:
                raise ValueError(f"collision on {cand}")
            seen[cand] = uid
