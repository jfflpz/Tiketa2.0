from uuid import UUID, uuid4

import pytest
from sqlalchemy import func, select

from app.core.security import decrypt
from app.db.session import AsyncSessionLocal
from app.models import Employee, Ticket, TicketComment

BODY = {
    "employee_id": "1042",
    "task_code": "PRN-TS",
    "description": "Printer jams when printing dispatch tickets",
    "mode": "REM",
}


@pytest.mark.parametrize("role,mode", [("tech", "REM"), ("admin", "SITE")])
async def test_quick_intake_persists_directory_details_and_mode(
    client, accounts, role, mode
):
    headers = accounts[role]
    # Warm the queue cache before creating the ticket.
    assert (await client.get("/api/v1/tickets", headers=headers)).json() == []
    profile = (
        await client.get("/api/v1/employees/lookup?q=1042", headers=headers)
    ).json()
    response = await client.post(
        "/api/v1/tickets/quick-intake", json={**BODY, "mode": mode}, headers=headers
    )
    assert response.status_code == 201, response.text
    created = response.json()
    assert created["mode"] == mode and created["status"] == "OPEN"
    assert created["description"] == BODY["description"]
    assert created["requester_name"] == profile["full_name"]
    for field in ("company_id", "location_id", "department_id"):
        assert created[field] == profile[field]
    assert created["started_at"] is None and created["time_started"] is None
    queue = (await client.get("/api/v1/tickets", headers=headers)).json()
    assert queue[0]["id"] == created["id"]
    assert queue[0]["mode"] == mode
    assert queue[0]["description"] == BODY["description"]
    async with AsyncSessionLocal() as db:
        saved = await db.get(Ticket, UUID(created["id"]))
        assert saved.mode == mode
        assert saved.employee_id == UUID(profile["id"])
        assert saved.creator_id is not None
        assert decrypt(saved.requester_contact_enc) == profile["email"]
        assert decrypt(saved.description_enc) == BODY["description"]
        assert await db.scalar(select(func.count()).select_from(TicketComment)) == 0
    # Claiming through the status endpoint must not erase the saved intake mode.
    claimed = await client.patch(
        f"/api/v1/tickets/{created['id']}/status",
        json={"status": "PROG"},
        headers=headers,
    )
    assert claimed.status_code == 200, claimed.text
    assert claimed.json()["mode"] == mode


@pytest.mark.parametrize(
    "changes,status",
    [
        ({"employee_id": "FS-1042"}, 422),
        ({"employee_id": "９９９９"}, 422),
        ({"employee_id": "9999"}, 404),
        ({"employee_id": ""}, 422),
        ({"description": "short"}, 422),
        ({"description": "          "}, 422),
        ({"description": "a" * 20001}, 422),
        ({"mode": "INVALID"}, 422),
        ({"company_id": str(uuid4())}, 422),
        ({"requester_name": "Forged profile"}, 422),
    ],
)
async def test_invalid_intake_never_creates_ticket(client, accounts, changes, status):
    response = await client.post(
        "/api/v1/tickets/quick-intake",
        json={**BODY, **changes},
        headers=accounts["tech"],
    )
    assert response.status_code == status, response.text
    async with AsyncSessionLocal() as db:
        assert await db.scalar(select(func.count()).select_from(Ticket)) == 0


async def test_inactive_employee_and_unauthenticated_intake_rejected(client, accounts):
    assert (
        await client.post("/api/v1/tickets/quick-intake", json=BODY)
    ).status_code == 401
    async with AsyncSessionLocal() as db:
        employee = await db.scalar(
            select(Employee).where(Employee.employee_id == "1042")
        )
        employee.is_active = False
        await db.commit()
    response = await client.post(
        "/api/v1/tickets/quick-intake", json=BODY, headers=accounts["tech"]
    )
    assert response.status_code == 404
    async with AsyncSessionLocal() as db:
        assert await db.scalar(select(func.count()).select_from(Ticket)) == 0


@pytest.mark.parametrize("employee_id", ["1", "001042"])
async def test_numeric_id_preserves_leading_zeros_and_allows_one_digit(
    client, accounts, employee_id
):
    async with AsyncSessionLocal() as db:
        employee = await db.scalar(
            select(Employee).where(Employee.employee_id == "1042")
        )
        employee.employee_id = employee_id
        await db.commit()
    response = await client.post(
        "/api/v1/tickets/quick-intake",
        json={**BODY, "employee_id": employee_id},
        headers=accounts["tech"],
    )
    assert response.status_code == 201, response.text
