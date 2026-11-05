import uuid
from datetime import date, timedelta

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

INTAKE_BODY = {
    "employee_id": "1042",
    "task_code": "PRN-TS",
    "description": "S4 history test ticket",
}


async def test_sprint4_b04_history_date_range_filters(
    client: AsyncClient, accounts: dict
):
    """B-04 / S4-07: History endpoint supports date_from and date_to filters on date_started."""
    tech_headers = accounts["tech"]

    # 1. Quick intake ticket & claim it
    t_res = await client.post(
        "/api/v1/tickets/quick-intake",
        json=INTAKE_BODY,
        headers=tech_headers,
    )
    assert t_res.status_code == 201
    ticket = t_res.json()
    ticket_id = ticket["id"]

    await client.patch(f"/api/v1/tickets/{ticket_id}/claim", headers=tech_headers)

    today = date.today()
    yesterday = today - timedelta(days=1)
    tomorrow = today + timedelta(days=1)

    # 2. Query history with valid date range enclosing today
    res = await client.get(
        f"/api/v1/tickets/history?date_from={yesterday.isoformat()}&date_to={tomorrow.isoformat()}",
        headers=tech_headers,
    )
    assert res.status_code == 200
    rows = res.json()
    assert any(r["id"] == ticket_id for r in rows)

    # 3. Query history with date_to in the past -> ticket not included
    past_res = await client.get(
        f"/api/v1/tickets/history?date_from={(today - timedelta(days=10)).isoformat()}&date_to={yesterday.isoformat()}",
        headers=tech_headers,
    )
    assert past_res.status_code == 200
    past_rows = past_res.json()
    assert not any(r["id"] == ticket_id for r in past_rows)

    # 4. Invalid date range (date_from > date_to) returns 422
    invalid_res = await client.get(
        f"/api/v1/tickets/history?date_from={tomorrow.isoformat()}&date_to={yesterday.isoformat()}",
        headers=tech_headers,
    )
    assert invalid_res.status_code == 422
    assert (
        "start date must not be after end date" in invalid_res.json()["detail"].lower()
    )


async def test_sprint4_b04_history_role_scoping(client: AsyncClient, accounts: dict):
    """B-04 / S4-06: Supervisor has overall history read; Intern/IT locked to own assignments."""
    tech_headers = accounts["tech"]
    supervisor_headers = accounts["supervisor"]
    intern_headers = accounts["intern"]

    # Intern or IT cannot query another tech's history (403)
    fake_tech_id = uuid.uuid4()
    intern_res = await client.get(
        f"/api/v1/tickets/history?technician_id={fake_tech_id}",
        headers=intern_headers,
    )
    assert intern_res.status_code == 403

    it_res = await client.get(
        f"/api/v1/tickets/history?technician_id={fake_tech_id}",
        headers=tech_headers,
    )
    assert it_res.status_code == 403

    # Supervisor can query overall history without restriction
    sup_res = await client.get(
        "/api/v1/tickets/history",
        headers=supervisor_headers,
    )
    assert sup_res.status_code == 200


async def test_sprint4_b03_conversation_persistence_and_order(
    client: AsyncClient, accounts: dict
):
    """B-03 / S4-11: Comments maintain stable ordering, tie-breaks, and persistence."""
    tech_headers = accounts["tech"]

    t_res = await client.post(
        "/api/v1/tickets/quick-intake",
        json=INTAKE_BODY,
        headers=tech_headers,
    )
    assert t_res.status_code == 201
    ticket_id = t_res.json()["id"]

    # Add comments
    c1 = await client.post(
        f"/api/v1/tickets/{ticket_id}/comments",
        json={"body": "First comment message", "is_internal": False},
        headers=tech_headers,
    )
    assert c1.status_code == 201
    c1_id = c1.json()["id"]

    c2 = await client.post(
        f"/api/v1/tickets/{ticket_id}/comments",
        json={"body": "Second comment message", "is_internal": False},
        headers=tech_headers,
    )
    assert c2.status_code == 201
    c2_id = c2.json()["id"]

    # Read comments ASC
    res_asc = await client.get(
        f"/api/v1/tickets/{ticket_id}/comments?order=asc",
        headers=tech_headers,
    )
    assert res_asc.status_code == 200
    asc_comments = res_asc.json()
    assert len(asc_comments) >= 2
    ids_asc = [c["id"] for c in asc_comments]
    assert ids_asc.index(c1_id) < ids_asc.index(c2_id)
