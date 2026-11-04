import uuid
from unittest.mock import patch

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_public_intake_requires_match_token_and_session(client: AsyncClient):
    """B-01: Public intake without match_token and session header MUST be rejected with 403."""
    res_no_header = await client.post(
        "/api/v1/tickets/submit",
        json={
            "employee_id": "1042",
            "task_code": "PRN-TS",
            "description": "Attempting unverified public intake",
        },
    )
    assert res_no_header.status_code == 403

    res_fake_token = await client.post(
        "/api/v1/tickets/submit",
        json={
            "match_token": "fake.jwt.token",
            "task_code": "PRN-TS",
            "description": "Attempting with invalid match token",
        },
        headers={"X-Kiosk-Session-ID": "test-session"},
    )
    assert res_fake_token.status_code == 403


@pytest.mark.asyncio
async def test_intern_assigned_only_access(client: AsyncClient, accounts):
    """B-01: Intern can only view and update their own assigned tickets."""
    # 1. Tech creates an open ticket
    res_create = await client.post(
        "/api/v1/tickets/quick-intake",
        json={
            "employee_id": "1042",
            "task_code": "PRN-TS",
            "description": "Unassigned ticket for testing intern permissions",
        },
        headers=accounts["tech"],
    )
    assert res_create.status_code == 201
    ticket_id = res_create.json()["id"]

    # 2. Intern cannot read detail of unassigned ticket
    res_detail = await client.get(
        f"/api/v1/tickets/{ticket_id}", headers=accounts["intern"]
    )
    assert res_detail.status_code == 403

    # 3. Intern cannot claim ticket directly
    res_claim = await client.patch(
        f"/api/v1/tickets/{ticket_id}/claim", headers=accounts["intern"]
    )
    assert res_claim.status_code == 403

    # 4. Intern cannot claim via status transition OPEN -> PROG
    res_status = await client.patch(
        f"/api/v1/tickets/{ticket_id}/status",
        json={"status": "PROG"},
        headers=accounts["intern"],
    )
    assert res_status.status_code == 403

    # 5. Intern cannot view history of other technicians
    res_hist = await client.get(
        f"/api/v1/tickets/history?technician_id={uuid.uuid4()}",
        headers=accounts["intern"],
    )
    assert res_hist.status_code == 403


@pytest.mark.asyncio
async def test_supervisor_cannot_mutate_operations(client: AsyncClient, accounts):
    """B-01: Supervisor has fleet read access, but cannot mutate operational tickets."""
    res_create = await client.post(
        "/api/v1/tickets/quick-intake",
        json={
            "employee_id": "1042",
            "task_code": "PRN-TS",
            "description": "Ticket for testing supervisor mutation block",
        },
        headers=accounts["tech"],
    )
    assert res_create.status_code == 201
    ticket_id = res_create.json()["id"]

    # Supervisor cannot claim
    res_claim = await client.patch(
        f"/api/v1/tickets/{ticket_id}/claim", headers=accounts["supervisor"]
    )
    assert res_claim.status_code == 403

    # Supervisor cannot change status
    res_status = await client.patch(
        f"/api/v1/tickets/{ticket_id}/status",
        json={"status": "PROG"},
        headers=accounts["supervisor"],
    )
    assert res_status.status_code == 403

    # Supervisor cannot post comments
    res_comment = await client.post(
        f"/api/v1/tickets/{ticket_id}/comments",
        json={"body": "Supervisor operational comment", "is_internal": False},
        headers=accounts["supervisor"],
    )
    assert res_comment.status_code == 403

    # Supervisor CAN read fleet history
    res_hist = await client.get(
        "/api/v1/tickets/history", headers=accounts["supervisor"]
    )
    assert res_hist.status_code == 200


@pytest.mark.asyncio
async def test_b02_queue_cache_invalidation_fault_tolerance(
    client: AsyncClient, accounts
):
    """B-02: Post-commit Redis cache invalidation failure still returns saved result."""
    with patch(
        "app.core.cache.cache.incr", side_effect=Exception("Simulated Redis outage")
    ):
        res = await client.post(
            "/api/v1/tickets/quick-intake",
            json={
                "employee_id": "1042",
                "task_code": "PRN-TS",
                "description": "Cache fault injection ticket",
            },
            headers=accounts["tech"],
        )
        assert res.status_code == 201
        data = res.json()
        assert "ticket_code" in data
