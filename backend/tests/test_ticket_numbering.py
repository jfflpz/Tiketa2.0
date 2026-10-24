import asyncio
from uuid import UUID

import pytest

from app.db.session import AsyncSessionLocal
from app.models import Ticket, TicketCounter
from scripts.seed_demo_operations import seed

BODY = {
    "employee_id": "1042",
    "task_code": "PRN-TS",
    "description": "Printer stopped during dispatch",
    "mode": "REM",
}


@pytest.mark.parametrize("counter_value", [None, 150, 200])
async def test_intake_recovers_counter_without_duplicates(client, accounts, counter_value):
    headers = accounts["tech"]
    response = await client.post("/api/v1/tickets/quick-intake", json=BODY, headers=headers)
    assert response.status_code == 201, response.text
    created = response.json()
    month = created["ticket_code"].split("-")[1]
    async with AsyncSessionLocal() as db:
        existing = await db.get(Ticket, UUID(created["id"]))
        existing.ticket_code = f"T-{month}-0151"
        counter = await db.get(TicketCounter, month)
        if counter_value is None:
            await db.delete(counter)
        else:
            counter.value = counter_value
        await db.commit()

    responses = await asyncio.gather(*[
        client.post("/api/v1/tickets/quick-intake", json=BODY, headers=headers)
        for _ in range(8)
    ])
    assert all(result.status_code == 201 for result in responses), [r.text for r in responses]
    numbers = sorted(int(result.json()["ticket_code"].split("-")[-1]) for result in responses)
    first = max(counter_value or 0, 151) + 1
    assert numbers == list(range(first, first + 8))


async def test_reseeding_demo_data_never_rewinds_existing_counter():
    await seed()
    async with AsyncSessionLocal() as db:
        counter = await db.get(TicketCounter, "2610")
        counter.value = 12345
        await db.commit()
    await seed()
    async with AsyncSessionLocal() as db:
        assert (await db.get(TicketCounter, "2610")).value == 12345
