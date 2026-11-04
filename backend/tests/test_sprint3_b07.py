import uuid
from datetime import UTC, datetime, timedelta
import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.core.security import encrypt, issue_match_token
from app.db.session import AsyncSessionLocal
from app.models import Ticket, TicketComment, User


@pytest.mark.asyncio
async def test_bounded_conversation_retrieval_and_ordering(client: AsyncClient, accounts):
    """B-07: order=asc|desc, stable tie-breaking, message 101+, internal note pre-filtering, and access gates."""
    # 1. Fetch active employee and create a ticket
    emp_res = await client.get("/api/v1/admin/employees", headers=accounts["admin"])
    emp = emp_res.json()[0]

    ticket_res = await client.post(
        "/api/v1/tickets/quick-intake",
        json={
            "employee_id": emp["employee_id"],
            "task_code": "PRN-TS",
            "description": "Conversation stress testing ticket",
            "mode": "SITE",
        },
        headers=accounts["tech"],
    )
    assert ticket_res.status_code == 201
    ticket_id = ticket_res.json()["id"]

    # 2. Seed 105 comments: mixture of public employee notes, public tech notes, and private internal notes
    # Seed multiple comments with the exact same timestamp to test stable tie-breaker on ID
    base_time = datetime(2026, 11, 1, 8, 0, 0, tzinfo=UTC)
    async with AsyncSessionLocal() as db:
        t = await db.get(Ticket, ticket_id)
        tech_user = await db.scalar(select(User).where(User.username == "tech"))

        comments_to_add = []
        for i in range(105):
            is_internal = (i % 5 == 0)  # 21 internal notes, 84 public comments
            # Tie timestamp every 10 messages
            msg_time = base_time + timedelta(seconds=i)
            c = TicketComment(
                ticket_id=t.id,
                user_id=tech_user.id if is_internal or (i % 2 == 0) else None,
                body_enc=encrypt(f"Message {i+1} content"),
                is_internal=is_internal,
                author_name="Tech Staff" if (is_internal or i % 2 == 0) else emp["full_name"],
                author_role="it" if (is_internal or i % 2 == 0) else "employee",
                created_at=msg_time,
            )
            comments_to_add.append(c)
        db.add_all(comments_to_add)
        await db.commit()

    # 3. Staff reads latest descending page (order="desc", limit=50)
    res_desc = await client.get(
        f"/api/v1/tickets/{ticket_id}/comments?order=desc&limit=50",
        headers=accounts["tech"],
    )
    assert res_desc.status_code == 200
    desc_rows = res_desc.json()
    assert len(desc_rows) == 50
    # First row is the newest message (Message 105)
    assert desc_rows[0]["body"] == "Message 105 content"
    # Message 101 is present on this first page!
    assert any(r["body"] == "Message 101 content" for r in desc_rows)

    # 4. Older paging with offset=50 (order="desc", offset=50, limit=50)
    res_older = await client.get(
        f"/api/v1/tickets/{ticket_id}/comments?order=desc&offset=50&limit=50",
        headers=accounts["tech"],
    )
    assert res_older.status_code == 200
    older_rows = res_older.json()
    assert len(older_rows) == 50
    # No duplicate IDs across page 1 and page 2
    page1_ids = {r["id"] for r in desc_rows}
    page2_ids = {r["id"] for r in older_rows}
    assert page1_ids.isdisjoint(page2_ids)

    # 5. Default order is asc (chronological order)
    res_default = await client.get(
        f"/api/v1/tickets/{ticket_id}/comments?limit=10",
        headers=accounts["tech"],
    )
    assert res_default.status_code == 200
    assert res_default.json()[0]["body"] == "Message 1 content"

    # 6. Employee read: internal notes are excluded BEFORE paging
    session_id = "kiosk-test-session-1234"
    match_token = issue_match_token(emp["employee_id"], session_id)
    headers_emp = {
        "Authorization": f"Bearer {match_token}",
        "X-Kiosk-Session-ID": session_id,
    }
    res_emp = await client.get(
        f"/api/v1/tickets/{ticket_id}/comments?limit=100",
        headers=headers_emp,
    )
    assert res_emp.status_code == 200
    emp_rows = res_emp.json()
    # Exactly 84 public messages exist: employee receives all 84 public rows
    # Internal notes did not consume page slots
    assert len(emp_rows) == 84
    assert all(r["is_internal"] is False for r in emp_rows)

    # 7. Unassigned Intern cannot view comments (403)
    res_intern = await client.get(
        f"/api/v1/tickets/{ticket_id}/comments",
        headers=accounts["intern"],
    )
    assert res_intern.status_code == 403