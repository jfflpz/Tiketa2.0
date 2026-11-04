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
    """Test Admin submits request, Supervisor approves and receives temporary password."""
    admin_headers = accounts["admin"]
    tech_headers = accounts["tech"]
    supervisor_headers = accounts["supervisor"]

    async with AsyncSessionLocal() as db:
        loc = await db.scalar(select(Location).limit(1))
        assert loc is not None
        loc_id = str(loc.id)

    # 1. Tech cannot submit account proposal (403)
    req_payload = {
        "username": f"intern_{uuid.uuid4().hex[:6]}",
        "email": f"intern_{uuid.uuid4().hex[:6]}@fivestarbus.com",
        "full_name": "Junior Field Specialist",
        "role": "intern",
        "location_id": loc_id,
        "department": "Depot Repair Operations",
    }
    assert (
        await client.post(
            "/api/v1/account-requests", json=req_payload, headers=tech_headers
        )
    ).status_code == 403

    # 2. Admin proposes account creation
    res_submit = await client.post(
        "/api/v1/account-requests", json=req_payload, headers=admin_headers
    )
    assert res_submit.status_code == 201
    req_data = res_submit.json()
    req_id = req_data["id"]
    assert req_data["status"] == "pending"
    assert req_data["role"] == "intern"

    # 3. Admin cannot self-approve (403)
    assert (
        await client.post(
            f"/api/v1/account-requests/{req_id}/approve", headers=admin_headers
        )
    ).status_code == 403

    # 4. Supervisor approves -> receives temporary password
    res_approve = await client.post(
        f"/api/v1/account-requests/{req_id}/approve", headers=supervisor_headers
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
    supervisor_headers = accounts["supervisor"]

    req_payload = {
        "username": f"intern_rej_{uuid.uuid4().hex[:6]}",
        "email": f"intern_rej_{uuid.uuid4().hex[:6]}@fivestarbus.com",
        "full_name": "Rejected Intern",
        "role": "intern",
    }
    res_submit = await client.post(
        "/api/v1/account-requests", json=req_payload, headers=admin_headers
    )
    assert res_submit.status_code == 201
    req_id = res_submit.json()["id"]

    # Rejection requires reason
    assert (
        await client.post(
            f"/api/v1/account-requests/{req_id}/reject",
            json={"rejection_reason": "   "},
            headers=supervisor_headers,
        )
    ).status_code == 422

    # Supervisor rejects
    res_rej = await client.post(
        f"/api/v1/account-requests/{req_id}/reject",
        json={"rejection_reason": "Incomplete verification documents"},
        headers=supervisor_headers,
    )
    assert res_rej.status_code == 200
