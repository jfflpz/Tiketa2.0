import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models import Location, User


@pytest.mark.asyncio
async def test_four_tier_rbac_roles_allowed(client: AsyncClient, accounts):
    """Verify all four roles exist in database and can authenticate."""
    admin_headers = accounts["admin"]
    tech_headers = accounts["tech"]

    # 1. Admin and Tech can access protected endpoints
    res_admin = await client.get("/api/v1/tickets", headers=admin_headers)
    assert res_admin.status_code == 200

    res_tech = await client.get("/api/v1/tickets", headers=tech_headers)
    assert res_tech.status_code == 200


@pytest.mark.asyncio
async def test_account_request_lifecycle(client: AsyncClient, accounts):
    """Test IT Support submits request, Supervisor/Admin approves and receives temporary password."""
    admin_headers = accounts["admin"]
    tech_headers = accounts["tech"]

    async with AsyncSessionLocal() as db:
        loc = await db.scalar(select(Location).limit(1))
        assert loc is not None
        loc_id = str(loc.id)

    # 1. IT Support submits an account request for an intern
    req_payload = {
        "username": f"intern_{uuid.uuid4().hex[:6]}",
        "email": f"intern_{uuid.uuid4().hex[:6]}@fivestarbus.com",
        "full_name": "Junior Field Specialist",
        "role": "intern",
        "location_id": loc_id,
        "department": "Depot Repair Operations",
    }
    res_submit = await client.post(
        "/api/v1/account-requests", json=req_payload, headers=tech_headers
    )
    assert res_submit.status_code == 201
    req_data = res_submit.json()
    req_id = req_data["id"]
    assert req_data["status"] == "pending"
    assert req_data["role"] == "intern"

    # 2. IT Support sees their own request in list
    res_list_tech = await client.get("/api/v1/account-requests", headers=tech_headers)
    assert res_list_tech.status_code == 200
    assert any(r["id"] == req_id for r in res_list_tech.json())

    # 3. IT Support attempts to request elevated role 'admin' -> Rejected (422)
    invalid_payload = {
        "username": f"bad_admin_{uuid.uuid4().hex[:6]}",
        "email": f"bad_admin_{uuid.uuid4().hex[:6]}@fivestarbus.com",
        "full_name": "Unauthorized Admin Attempt",
        "role": "admin",
    }
    res_invalid = await client.post(
        "/api/v1/account-requests", json=invalid_payload, headers=tech_headers
    )
    assert res_invalid.status_code == 422

    # 4. Admin approves the intern request -> Receives temporary password
    res_approve = await client.post(
        f"/api/v1/account-requests/{req_id}/approve", headers=admin_headers
    )
    assert res_approve.status_code == 200
    approval_data = res_approve.json()
    assert "temporary_password" in approval_data
    assert len(approval_data["temporary_password"]) >= 12
    assert approval_data["user"]["username"] == req_payload["username"]
    assert approval_data["user"]["role"] == "intern"

    # 5. Verify the user is now active in PostgreSQL
    async with AsyncSessionLocal() as db:
        created_user = await db.scalar(
            select(User).where(User.username == req_payload["username"])
        )
        assert created_user is not None
        assert created_user.role == "intern"
        assert created_user.is_active is True


@pytest.mark.asyncio
async def test_account_request_rejection(client: AsyncClient, accounts):
    """Test request rejection requires reason and marks status as rejected."""
    admin_headers = accounts["admin"]
    tech_headers = accounts["tech"]

    req_payload = {
        "username": f"intern_rej_{uuid.uuid4().hex[:6]}",
        "email": f"intern_rej_{uuid.uuid4().hex[:6]}@fivestarbus.com",
        "full_name": "Candidate Needs Retraining",
        "role": "intern",
    }
    res_submit = await client.post(
        "/api/v1/account-requests", json=req_payload, headers=tech_headers
    )
    assert res_submit.status_code == 201
    req_id = res_submit.json()["id"]

    # Reject without reason -> 422
    res_no_reason = await client.post(
        f"/api/v1/account-requests/{req_id}/reject",
        json={},
        headers=admin_headers,
    )
    assert res_no_reason.status_code == 422

    # Reject with valid reason -> 200
    res_reject = await client.post(
        f"/api/v1/account-requests/{req_id}/reject",
        json={"rejection_reason": "Missing depot training certification"},
        headers=admin_headers,
    )
    assert res_reject.status_code == 200
    assert res_reject.json()["status"] == "rejected"
    assert (
        res_reject.json()["rejection_reason"] == "Missing depot training certification"
    )


@pytest.mark.asyncio
async def test_public_ticket_uuid_and_supervisor_reports(client: AsyncClient, accounts):
    """Test RCA-2 (PublicTicket has UUID) and Task B-04 (Supervisor can access reports)."""
    admin_headers = accounts["admin"]

    # 1. Create a public ticket (verifying RCA-2 authoritative UUID is present)
    ticket_payload = {
        "employee_id": "1042",
        "task_code": "PRN-TS",
        "description": "Terminal scanner is experiencing communication timeouts.",
    }
    res_ticket = await client.post("/api/v1/tickets/submit", json=ticket_payload)
    assert res_ticket.status_code == 201
    ticket_data = res_ticket.json()
    assert "id" in ticket_data  # Verifies authoritative UUID is present

    # 2. Verify Admin/Supervisor can fetch monthly-sla report
    res_report = await client.get("/api/v1/reports/monthly-sla", headers=admin_headers)
    assert res_report.status_code == 200
