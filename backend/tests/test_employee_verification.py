from datetime import timedelta
from decimal import Decimal
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from uuid import UUID

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import inspect, select

from app.core.config import settings
from app.core.security import digest, issue_match_token
from app.db.session import AsyncSessionLocal, engine
from app.models import Company, Department, Employee, Location, TaskCategory, Ticket, TicketComment, User
from app.services.tickets import now


@pytest.fixture
async def verification_fixtures(client, accounts):
    async with AsyncSessionLocal() as db:
        company = await db.scalar(select(Company).limit(1))
        location = await db.scalar(select(Location).limit(1))
        dept = await db.scalar(select(Department).limit(1))
        task = await db.scalar(select(TaskCategory).limit(1))
        tech = await db.scalar(select(User).where(User.username == "tech"))

        from app.models import LocationDepartment
        loc_dept = await db.scalar(
            select(LocationDepartment).where(
                LocationDepartment.location_id == location.id,
                LocationDepartment.department_id == dept.id,
            )
        )
        if not loc_dept:
            loc_dept = LocationDepartment(location_id=location.id, department_id=dept.id)
            db.add(loc_dept)
            await db.flush()

        # Create two employees
        emp1 = await db.scalar(select(Employee).where(Employee.employee_id == "2015"))
        if not emp1:
            emp1 = Employee(
                employee_id="2015",
                full_name="Ricardo Ramos",
                email="ricardo.ramos@fivestarbus.com",
                company_id=company.id,
                location_id=location.id,
                department_id=dept.id,
                is_active=True,
            )
            db.add(emp1)
            await db.flush()

        emp2 = await db.scalar(select(Employee).where(Employee.employee_id == "1042"))
        if not emp2:
            emp2 = Employee(
                employee_id="1042",
                full_name="Maria Santos",
                email="maria.santos@fivestarbus.com",
                company_id=company.id,
                location_id=location.id,
                department_id=dept.id,
                is_active=True,
            )
            db.add(emp2)
            await db.flush()

        from app.core.security import encrypt
        valid_token = "test-secret-token-32-chars-long-abc"
        t1 = Ticket(
            ticket_code="T-2610-0115",
            employee_id=emp1.id,
            company_id=company.id,
            location_id=location.id,
            department_id=dept.id,
            requester_name=emp1.full_name,
            requester_contact_enc=encrypt(emp1.email),
            task_code=task.code,
            description_enc=encrypt("Corroded RJ45 keystone jack in Cash booth 1."),
            month="2026-10",
            date_started=now().date(),
            date_finished=now().date(),
            started_at=now() - timedelta(hours=2),
            resolved_at=now(),
            duration=Decimal("0.5"),
            mode="SITE",
            status="RESL",
            assigned_tech_id=tech.id,
            closure_token_hash=digest(valid_token),
            closure_token_expires_at=now() + timedelta(hours=72),
        )
        db.add(t1)

        # Create a second ticket also belonging to emp1 (to test cross-ticket isolation)
        t2 = Ticket(
            ticket_code="T-2610-0116",
            employee_id=emp1.id,
            company_id=company.id,
            location_id=location.id,
            department_id=dept.id,
            requester_name=emp1.full_name,
            requester_contact_enc=encrypt(emp1.email),
            task_code=task.code,
            description_enc=encrypt("Ticket 2 printer offline issue."),
            month="2026-10",
            date_started=now().date(),
            date_finished=now().date(),
            started_at=now() - timedelta(hours=1),
            resolved_at=now(),
            duration=Decimal("0.2"),
            mode="SITE",
            status="RESL",
            assigned_tech_id=tech.id,
            closure_token_hash=digest("token-t2-secret-xyz-1234567890"),
            closure_token_expires_at=now() + timedelta(hours=72),
        )
        db.add(t2)

        # Create a ticket without employee_id
        t_unlinked = Ticket(
            ticket_code="T-2610-9999",
            employee_id=None,
            company_id=company.id,
            location_id=location.id,
            department_id=dept.id,
            requester_name="Anonymous Staff",
            requester_contact_enc=None,
            task_code=task.code,
            description_enc=encrypt("Unlinked ticket description."),
            month="2026-10",
            date_started=now().date(),
            date_finished=now().date(),
            started_at=now() - timedelta(hours=1),
            resolved_at=now(),
            duration=Decimal("0.5"),
            mode="SITE",
            status="RESL",
            assigned_tech_id=tech.id,
            closure_token_hash=digest("another-token-32-chars-long-xyz"),
            closure_token_expires_at=now() + timedelta(hours=72),
        )
        db.add(t_unlinked)

        await db.commit()
        await db.refresh(t1)
        await db.refresh(t2)
        await db.refresh(t_unlinked)

        return {
            "emp1": emp1,
            "emp2": emp2,
            "t1": t1,
            "t2": t2,
            "t_unlinked": t_unlinked,
            "valid_token": valid_token,
            "tech": tech,
        }


async def test_id_only_access_denial_and_verified_credentials(client, verification_fixtures):
    data = verification_fixtures
    code = data["t1"].ticket_code

    # Gap 1: Missing credentials returns 401
    res = await client.post(f"/api/v1/tickets/{code}/verify-access", json={})
    assert res.status_code == 401

    # Gap 1: Supplying Employee ID alone without verified credentials returns 401
    res_id_only = await client.post(
        f"/api/v1/tickets/{code}/verify-access",
        json={"employee_id": "2015"},
    )
    assert res_id_only.status_code == 401
    assert "verified credential required" in res_id_only.json()["detail"].lower()

    # Gap 1: Wrong employee ID alone returns 401
    res_wrong_id = await client.post(
        f"/api/v1/tickets/{code}/verify-access",
        json={"employee_id": "9999"},
    )
    assert res_wrong_id.status_code == 401

    # Supplying valid single-use closure token returns 200, can_close=True
    res_token = await client.post(
        f"/api/v1/tickets/{code}/verify-access",
        json={"token": data["valid_token"]},
    )
    assert res_token.status_code == 200
    assert res_token.json()["authorized"] is True
    assert res_token.json()["can_close"] is True
    assert "access_token" in res_token.json()

    # Supplying valid match_token returns 200, can_close=False (view/chat only)
    session_id = "test-session-kiosk-1"
    match_token = issue_match_token("2015", session_id)
    res_match = await client.post(
        f"/api/v1/tickets/{code}/verify-access",
        json={"match_token": match_token},
        headers={"X-Kiosk-Session-ID": session_id},
    )
    assert res_match.status_code == 200
    assert res_match.json()["authorized"] is True
    assert res_match.json()["can_close"] is False

    # Invalid token returns 400
    res_bad_token = await client.post(
        f"/api/v1/tickets/{code}/verify-access",
        json={"token": "invalid-token-with-sufficient-length-xxx"},
    )
    assert res_bad_token.status_code == 400


async def test_staff_cannot_perform_employee_sign_off(client, verification_fixtures, accounts):
    data = verification_fixtures
    t1_code = data["t1"].ticket_code
    t1_id = str(data["t1"].id)

    # 1. Assigned staff calling verify-access without token gets can_close=False
    res_assigned_verify = await client.post(
        f"/api/v1/tickets/{t1_code}/verify-access",
        json={},
        headers=accounts["tech"],
    )
    assert res_assigned_verify.status_code == 200
    assert res_assigned_verify.json()["can_close"] is False

    # Assigned staff attempting to call confirm-closure directly is rejected with 403
    res_assigned_close = await client.post(
        f"/api/v1/tickets/{t1_id}/confirm-closure",
        json={"remarks": "Assigned tech attempting sign-off directly"},
        headers=accounts["tech"],
    )
    assert res_assigned_close.status_code == 403
    assert "staff cannot perform employee sign-off" in res_assigned_close.json()["detail"].lower()

    # 2. Unassigned staff calling verify-access without token gets can_close=False
    res_unassigned_verify = await client.post(
        f"/api/v1/tickets/{t1_code}/verify-access",
        json={},
        headers=accounts["tech2"],
    )
    assert res_unassigned_verify.status_code == 200
    assert res_unassigned_verify.json()["can_close"] is False
    unassigned_jwt = res_unassigned_verify.json()["access_token"]

    # Unassigned staff attempting to call confirm-closure directly is rejected with 403
    res_unassigned_close = await client.post(
        f"/api/v1/tickets/{t1_id}/confirm-closure",
        json={"remarks": "Unassigned tech attempting sign-off"},
        headers=accounts["tech2"],
    )
    assert res_unassigned_close.status_code == 403

    # Unassigned staff attempting closure using the JWT minted from verify-access is rejected with 400
    res_jwt_close = await client.post(
        f"/api/v1/tickets/{t1_id}/confirm-closure",
        json={"remarks": "Using non-closure JWT"},
        headers={"Authorization": f"Bearer {unassigned_jwt}"},
    )
    assert res_jwt_close.status_code == 400


async def test_closure_credentials_cannot_be_used_for_chat_and_reopen_edge_cases(
    client, verification_fixtures, accounts
):
    data = verification_fixtures
    t1_code = data["t1"].ticket_code
    t1_id = str(data["t1"].id)

    # 1. Exchange valid single-use token for closure-scoped JWT
    res = await client.post(
        f"/api/v1/tickets/{t1_code}/verify-access",
        json={"token": data["valid_token"]},
    )
    assert res.status_code == 200
    closure_jwt = res.json()["access_token"]

    # Closure-scoped JWT cannot be used to GET comments
    res_get_chat = await client.get(
        f"/api/v1/tickets/{t1_id}/comments",
        headers={"Authorization": f"Bearer {closure_jwt}"},
    )
    assert res_get_chat.status_code == 403
    assert "closure-scoped" in res_get_chat.json()["detail"].lower()

    # Closure-scoped JWT cannot be used to POST comments
    res_post_chat = await client.post(
        f"/api/v1/tickets/{t1_id}/comments",
        json={"body": "Attempted chat with closure JWT"},
        headers={"Authorization": f"Bearer {closure_jwt}"},
    )
    assert res_post_chat.status_code == 403
    assert "closure-scoped" in res_post_chat.json()["detail"].lower()

    # 2. Reopen edge case: Expired raw closure token is rejected
    async with AsyncSessionLocal() as db:
        row = await db.get(Ticket, data["t1"].id)
        row.started_at = now() - timedelta(hours=82)
        row.resolved_at = now() - timedelta(hours=80)
        row.date_started = (now() - timedelta(hours=82)).date()
        row.date_finished = (now() - timedelta(hours=80)).date()
        row.closure_token_expires_at = now() - timedelta(hours=8)
        await db.commit()

    res_expired_reopen = await client.post(
        f"/api/v1/tickets/{t1_id}/reopen",
        json={"reason": "Testing expired reopen", "token": data["valid_token"]},
    )
    assert res_expired_reopen.status_code == 410
    assert "expired" in res_expired_reopen.json()["detail"].lower()

    # Reissue new validity window
    res_reissue = await client.post(
        f"/api/v1/tickets/{t1_id}/reissue-verification",
        headers=accounts["tech"],
    )
    assert res_reissue.status_code == 200
    new_token = parse_qs(urlparse(res_reissue.json()["closure_url"]).query)["token"][0]

    # Old raw token is rejected with 400
    res_old_raw_reopen = await client.post(
        f"/api/v1/tickets/{t1_id}/reopen",
        json={"reason": "Testing old raw token reopen", "token": data["valid_token"]},
    )
    assert res_old_raw_reopen.status_code == 400

    # Old closure JWT before rotation is rejected with 401
    res_old_jwt_reopen = await client.post(
        f"/api/v1/tickets/{t1_id}/reopen",
        json={"reason": "Testing rotated JWT reopen"},
        headers={"Authorization": f"Bearer {closure_jwt}"},
    )
    assert res_old_jwt_reopen.status_code == 401
    assert "rotated" in res_old_jwt_reopen.json()["detail"].lower()

    # Valid fresh token reopens successfully
    res_valid_reopen = await client.post(
        f"/api/v1/tickets/{t1_id}/reopen",
        json={"reason": "Testing valid fresh token reopen", "token": new_token},
    )
    assert res_valid_reopen.status_code == 200
    assert res_valid_reopen.json()["status"] == "PROG"


async def test_successful_closure_and_reopen_retains_full_ticket_details(
    client, verification_fixtures, accounts
):
    data = verification_fixtures
    t1 = data["t1"]
    t1_id = str(t1.id)
    t1_code = t1.ticket_code

    # 1. Close ticket via valid employee closure token
    res_close = await client.post(
        f"/api/v1/tickets/{t1_id}/confirm-closure",
        json={"token": data["valid_token"], "remarks": "Everything verified working."},
    )
    assert res_close.status_code == 200
    close_data = res_close.json()

    # Contract verification: Must return full TicketOut object
    assert close_data["id"] == t1_id
    assert close_data["ticket_code"] == t1_code
    assert close_data["status"] == "CLSD"
    assert close_data["requester_name"] == data["emp1"].full_name
    assert close_data["employee_id_number"] == data["emp1"].employee_id
    assert close_data["technician_name"] == data["tech"].full_name
    assert close_data["task_code"] == "NET-CFG"
    assert close_data["duration"] is not None
    assert close_data["user_confirmed_at"] is not None

    # 2. Reopen ticket via assigned technician
    res_reopen = await client.post(
        f"/api/v1/tickets/{t1_id}/reopen",
        json={"reason": "Client reported intermittent ping packet loss."},
        headers=accounts["tech"],
    )
    assert res_reopen.status_code == 200
    reopen_data = res_reopen.json()

    # Contract verification: Must return full TicketOut object
    assert reopen_data["id"] == t1_id
    assert reopen_data["ticket_code"] == t1_code
    assert reopen_data["status"] == "PROG"
    assert reopen_data["requester_name"] == data["emp1"].full_name
    assert reopen_data["employee_id_number"] == data["emp1"].employee_id
    assert reopen_data["technician_name"] == data["tech"].full_name
    assert reopen_data["task_code"] == "NET-CFG"


async def test_upgrade_from_0008_schema():
    import asyncio
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    # Downgrade to 0008 (the previous deployed revision) in a worker thread
    await asyncio.to_thread(command.downgrade, config, "0008_employee_verification")

    # Verify column closure_token_expires_at is absent
    async with engine.connect() as conn:
        def check_column(connection):
            insp = inspect(connection)
            return [c["name"] for c in insp.get_columns("tickets")]
        columns_before = await conn.run_sync(check_column)
        assert "closure_token_expires_at" not in columns_before

    # Forward upgrade to head (applies 0009_closure_token_expires_at)
    await asyncio.to_thread(command.upgrade, config, "head")

    # Verify column closure_token_expires_at is now safely added
    async with engine.connect() as conn:
        def check_column(connection):
            insp = inspect(connection)
            return [c["name"] for c in insp.get_columns("tickets")]
        columns_after = await conn.run_sync(check_column)
        assert "closure_token_expires_at" in columns_after


async def test_token_scope_by_credential_type_and_wrong_ticket_use(client, verification_fixtures):
    data = verification_fixtures
    t1_code = data["t1"].ticket_code
    t1_id = str(data["t1"].id)
    t2_id = str(data["t2"].id)

    # Obtain ticket-scoped token for Ticket 1
    res = await client.post(
        f"/api/v1/tickets/{t1_code}/verify-access",
        json={"token": data["valid_token"]},
    )
    assert res.status_code == 200
    token_t1 = res.json()["access_token"]

    # Gap 2: Ticket-scoped token MUST NOT access employee ticket list (/my-tickets)
    res_my_tickets = await client.get(
        "/api/v1/tickets/my-tickets",
        headers={"Authorization": f"Bearer {token_t1}"},
    )
    assert res_my_tickets.status_code == 403
    assert "ticket-scoped token cannot access employee ticket list" in res_my_tickets.json()["detail"].lower()

    # Gap 2: Ticket-scoped token for Ticket 1 MUST NOT view comments for Ticket 2
    res_t2_comments = await client.get(
        f"/api/v1/tickets/{t2_id}/comments",
        headers={"Authorization": f"Bearer {token_t1}"},
    )
    assert res_t2_comments.status_code == 403
    assert "closure-scoped credentials cannot be used for conversation" in res_t2_comments.json()["detail"].lower()

    # Match token can access /my-tickets
    session_id = "test-session-kiosk-2"
    match_token = issue_match_token("2015", session_id)
    res_match_tickets = await client.get(
        "/api/v1/tickets/my-tickets",
        headers={
            "Authorization": f"Bearer {match_token}",
            "X-Kiosk-Session-ID": session_id,
        },
    )
    assert res_match_tickets.status_code == 200
    assert len(res_match_tickets.json()) >= 2
    assert all(t["employee_id_number"] == "2015" for t in res_match_tickets.json())

    # But Match token alone CANNOT confirm closure (can_close is False)
    res_match_close = await client.post(
        f"/api/v1/tickets/{t1_id}/confirm-closure",
        json={"remarks": "Attempting closure with match token only"},
        headers={
            "Authorization": f"Bearer {match_token}",
            "X-Kiosk-Session-ID": session_id,
        },
    )
    assert res_match_close.status_code == 400


async def test_reissue_after_72_hours_resets_validity_window(client, verification_fixtures, accounts):
    data = verification_fixtures
    t1 = data["t1"]
    t1_id = str(t1.id)
    t1_code = t1.ticket_code

    # Set ticket resolved 80 hours ago, closure token expired 8 hours ago
    async with AsyncSessionLocal() as db:
        row = await db.get(Ticket, t1.id)
        row.started_at = now() - timedelta(hours=82)
        row.resolved_at = now() - timedelta(hours=80)
        row.date_started = (now() - timedelta(hours=82)).date()
        row.date_finished = (now() - timedelta(hours=80)).date()
        row.closure_token_expires_at = now() - timedelta(hours=8)
        await db.commit()

    # Gap 3: Old token returns 410 Expired
    res_expired = await client.post(
        f"/api/v1/tickets/{t1_code}/verify-access",
        json={"token": data["valid_token"]},
    )
    assert res_expired.status_code == 410
    assert "expired" in res_expired.json()["detail"].lower()

    # Assigned technician reissues verification
    res_reissue = await client.post(
        f"/api/v1/tickets/{t1_id}/reissue-verification",
        headers=accounts["tech"],
    )
    assert res_reissue.status_code == 200
    assert res_reissue.json()["closure_url"] is not None

    # Parse new token from closure_url
    parsed = urlparse(res_reissue.json()["closure_url"])
    new_token = parse_qs(parsed.query)["token"][0]

    # Gap 3: New token gives a fresh 72h window and succeeds
    res_fresh = await client.post(
        f"/api/v1/tickets/{t1_code}/verify-access",
        json={"token": new_token},
    )
    assert res_fresh.status_code == 200
    assert res_fresh.json()["can_close"] is True

    # Confirm closure succeeds and returns full TicketOut
    res_confirm = await client.post(
        f"/api/v1/tickets/{t1_id}/confirm-closure",
        json={"token": new_token, "remarks": "Reissued token closure confirmed"},
    )
    assert res_confirm.status_code == 200
    assert res_confirm.json()["status"] == "CLSD"
    assert res_confirm.json()["id"] == t1_id


async def test_old_credentials_invalidated_after_rotation(client, verification_fixtures, accounts):
    data = verification_fixtures
    t1 = data["t1"]
    t1_id = str(t1.id)
    t1_code = t1.ticket_code
    old_token = data["valid_token"]

    # 1. Exchange old token for a closure-capable JWT
    res_verify = await client.post(
        f"/api/v1/tickets/{t1_code}/verify-access",
        json={"token": old_token},
    )
    assert res_verify.status_code == 200
    old_closure_jwt = res_verify.json()["access_token"]

    # 2. Reissue / rotate credentials
    res_reissue = await client.post(
        f"/api/v1/tickets/{t1_id}/reissue-verification",
        headers=accounts["tech"],
    )
    assert res_reissue.status_code == 200
    new_closure_url = res_reissue.json()["closure_url"]
    new_token = parse_qs(urlparse(new_closure_url).query)["token"][0]

    # Gap 3: Old raw token rejected
    res_old_raw = await client.post(
        f"/api/v1/tickets/{t1_id}/confirm-closure",
        json={"token": old_token},
    )
    assert res_old_raw.status_code == 400

    # Gap 3: Old closure JWT rejected with 401 because credentials were rotated
    res_old_jwt = await client.post(
        f"/api/v1/tickets/{t1_id}/confirm-closure",
        json={"remarks": "Attempting closure with rotated JWT"},
        headers={"Authorization": f"Bearer {old_closure_jwt}"},
    )
    assert res_old_jwt.status_code == 401
    assert "rotated" in res_old_jwt.json()["detail"].lower()

    # New token succeeds and returns full TicketOut
    res_new_confirm = await client.post(
        f"/api/v1/tickets/{t1_id}/confirm-closure",
        json={"token": new_token, "remarks": "Confirmed with new token"},
    )
    assert res_new_confirm.status_code == 200
    assert res_new_confirm.json()["status"] == "CLSD"
    assert res_new_confirm.json()["id"] == t1_id


async def test_production_link_behavior(client, verification_fixtures, accounts, monkeypatch):
    data = verification_fixtures
    t1_id = str(data["t1"].id)

    async def mock_send_closure(*args, **kwargs):
        return True

    from app.services import mail
    monkeypatch.setattr(mail, "send_closure", mock_send_closure)

    original_env = settings.ENVIRONMENT
    try:
        settings.ENVIRONMENT = "production"
        res_prod = await client.post(
            f"/api/v1/tickets/{t1_id}/reissue-verification",
            headers=accounts["tech"],
        )
        assert res_prod.status_code == 200
        assert res_prod.json()["closure_url"] is None

        settings.ENVIRONMENT = "development"
        res_dev = await client.post(
            f"/api/v1/tickets/{t1_id}/reissue-verification",
            headers=accounts["tech"],
        )
        assert res_dev.status_code == 200
        assert res_dev.json()["closure_url"] is not None
        assert "token=" in res_dev.json()["closure_url"]
    finally:
        settings.ENVIRONMENT = original_env


async def test_comments_internal_privacy_enforced(client, verification_fixtures, accounts):
    data = verification_fixtures
    t1_id = str(data["t1"].id)

    # 1. Staff adds internal note
    add_internal = await client.post(
        f"/api/v1/tickets/{t1_id}/comments",
        json={"body": "INTERNAL IT NOTE: Investigating suspected faulty cabling.", "is_internal": True},
        headers=accounts["tech"],
    )
    assert add_internal.status_code == 201

    # 2. Staff adds public comment
    add_public = await client.post(
        f"/api/v1/tickets/{t1_id}/comments",
        json={"body": "PUBLIC: Please restart your terminal PC.", "is_internal": False},
        headers=accounts["tech"],
    )
    assert add_public.status_code == 201

    # 3. Staff reads comments -> Sees both internal and public
    staff_view = await client.get(
        f"/api/v1/tickets/{t1_id}/comments",
        headers=accounts["tech"],
    )
    assert staff_view.status_code == 200
    assert len(staff_view.json()) >= 2
    assert any(c["is_internal"] is True for c in staff_view.json())

    # 4. Employee reads comments via kiosk conversation token -> Internal note is STRICTLY HIDDEN
    session_id = "test-session-chat"
    match_token = issue_match_token("2015", session_id)
    verify_res = await client.post(
        f"/api/v1/tickets/{data['t1'].ticket_code}/verify-access",
        json={"match_token": match_token},
        headers={"X-Kiosk-Session-ID": session_id},
    )
    emp_token = verify_res.json()["access_token"]

    emp_view = await client.get(
        f"/api/v1/tickets/{t1_id}/comments",
        headers={"Authorization": f"Bearer {emp_token}"},
    )
    assert emp_view.status_code == 200
    emp_comments = emp_view.json()
    assert all(c["is_internal"] is False for c in emp_comments)
    assert not any("suspected faulty cabling" in c["body"] for c in emp_comments)
    assert any("Please restart your terminal PC" in c["body"] for c in emp_comments)

    # 5. Employee posts comment -> forced is_internal=False
    emp_post = await client.post(
        f"/api/v1/tickets/{t1_id}/comments",
        json={"body": "Done restarting, printer green light is on.", "is_internal": True},
        headers={"Authorization": f"Bearer {emp_token}"},
    )
    assert emp_post.status_code == 201
    assert emp_post.json()["is_internal"] is False
    assert emp_post.json()["author_role"] == "employee"
