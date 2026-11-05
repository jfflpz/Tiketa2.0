import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

INTAKE_BODY = {
    "employee_id": "1042",
    "task_code": "PC-PMS",
    "description": "S4 test ticket description",
}


async def test_sprint4_b02_checklist_initial_apply_revision_zero(
    client: AsyncClient, accounts: dict
):
    """B-02 / S4-14: Applying a guide to a ticket with expected_checklist_revision=0 succeeds."""
    tech_headers = accounts["tech"]

    # 1. Create a guide with valid seeded task_code PRN-TS
    guide_res = await client.post(
        "/api/v1/repair-notes",
        headers=tech_headers,
        json={
            "task_code": "PC-PMS",
            "title": "S4 Guide Initial",
            "symptom_and_fix": "Initial fix",
            "steps": ["Step 1 text"],
        },
    )
    assert guide_res.status_code == 201, guide_res.text
    guide = guide_res.json()

    # 2. Quick intake ticket and claim it
    t_res = await client.post(
        "/api/v1/tickets/quick-intake",
        json=INTAKE_BODY,
        headers=tech_headers,
    )
    assert t_res.status_code == 201
    ticket = t_res.json()
    ticket_id = ticket["id"]

    claim_res = await client.patch(
        f"/api/v1/tickets/{ticket_id}/claim",
        headers=tech_headers,
    )
    assert claim_res.status_code == 200

    # 3. Apply with expected_checklist_revision = 0 (frontend initial convention)
    apply_res = await client.post(
        f"/api/v1/tickets/{ticket_id}/checklist/apply",
        headers=tech_headers,
        json={
            "repair_note_id": guide["id"],
            "expected_note_revision": 1,
            "expected_checklist_revision": 0,
            "replace_existing": False,
        },
    )
    assert apply_res.status_code == 200, apply_res.text
    cl_data = apply_res.json()
    assert cl_data["revision"] == 1
    assert len(cl_data["steps"]) == 1


async def test_sprint4_b02_checklist_initial_apply_stale_expectation_conflict(
    client: AsyncClient, accounts: dict
):
    """B-02: Applying a guide expecting revision 1 on empty checklist yields 409 Conflict."""
    tech_headers = accounts["tech"]

    guide_res = await client.post(
        "/api/v1/repair-notes",
        headers=tech_headers,
        json={
            "task_code": "PC-PMS",
            "title": "S4 Stale Guide",
            "symptom_and_fix": "Fix",
            "steps": ["Step 1 text"],
        },
    )
    assert guide_res.status_code == 201, guide_res.text
    guide = guide_res.json()

    t_res = await client.post(
        "/api/v1/tickets/quick-intake",
        json=INTAKE_BODY,
        headers=tech_headers,
    )
    assert t_res.status_code == 201
    ticket = t_res.json()
    ticket_id = ticket["id"]

    await client.patch(f"/api/v1/tickets/{ticket_id}/claim", headers=tech_headers)

    apply_res = await client.post(
        f"/api/v1/tickets/{ticket_id}/checklist/apply",
        headers=tech_headers,
        json={
            "repair_note_id": guide["id"],
            "expected_note_revision": 1,
            "expected_checklist_revision": 5,  # Stale expectation on empty checklist
            "replace_existing": False,
        },
    )
    assert apply_res.status_code == 409
    assert "ticket has no checklist" in apply_res.json()["detail"].lower()


async def test_sprint4_b01_verify_access_invalid_and_expired(
    client: AsyncClient, accounts: dict
):
    """B-01 / S4-09: Verify access error contract."""
    tech_headers = accounts["tech"]

    # Unknown ticket returns 404
    res_404 = await client.post(
        f"/api/v1/tickets/{uuid.uuid4()}/verify-access",
        json={"token": "invalid"},
    )
    assert res_404.status_code == 404

    # Create ticket via quick intake
    t_res = await client.post(
        "/api/v1/tickets/quick-intake",
        json=INTAKE_BODY,
        headers=tech_headers,
    )
    assert t_res.status_code == 201
    ticket = t_res.json()

    # Code-only or no credential returns 401
    res_no_cred = await client.post(
        f"/api/v1/tickets/{ticket['ticket_code']}/verify-access",
        json={},
    )
    assert res_no_cred.status_code == 401
