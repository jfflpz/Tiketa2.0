import asyncio
import logging
import smtplib
from datetime import timedelta
from unittest.mock import AsyncMock
from urllib.parse import parse_qs, urlparse
from uuid import UUID, uuid4

import pytest
from sqlalchemy import select

from app.core.config import settings
from app.core.security import decrypt
from app.db.session import AsyncSessionLocal
from app.models import Employee, Ticket, TicketAttachment
from app.services.tickets import now

BODY = {
    "employee_id": "1042",
    "task_code": "PRN-TS",
    "description": "Printer jammed during dispatch",
}


async def test_queue_cache_is_encrypted_and_invalidated(client, accounts):
    from app.core.cache import cache

    assert (await client.get("/api/v1/tickets", headers=accounts["tech"])).json() == []
    row = await intake(client, accounts["tech"])
    result = await client.get("/api/v1/tickets", headers=accounts["tech"])
    assert result.json()[0]["id"] == row["id"]
    cached = await client.get("/api/v1/tickets", headers=accounts["tech"])
    assert cached.json() == result.json()
    for key in await cache.keys("queue:*:*:*"):
        assert BODY["description"] not in await cache.get(key)
    assert (await client.get("/api/v1/tickets")).status_code == 401
    await client.patch(
        "/api/v1/tickets/" + row["id"] + "/claim", headers=accounts["tech"]
    )
    assert (await client.get("/api/v1/tickets", headers=accounts["tech"])).json()[0][
        "status"
    ] == "PROG"


async def intake(client, headers):
    response = await client.post(
        "/api/v1/tickets/quick-intake", json=BODY, headers=headers
    )
    assert response.status_code == 201, response.text
    return response.json()


async def test_lookup_and_public_intake(client, accounts):
    profile = (
        await client.get("/api/v1/employees/lookup?q=1042", headers=accounts["tech"])
    ).json()
    assert (
        profile["location_name"] == "Pasay"
        and profile["department_name"] == "Cash Management"
    )
    assert (
        await client.get(
            "/api/v1/employees/lookup?q=maria.santos@example.com",
            headers=accounts["tech"],
        )
    ).status_code == 200
    assert (
        await client.get("/api/v1/employees/lookup?q=ghost", headers=accounts["tech"])
    ).status_code == 422
    assert (
        await client.get("/api/v1/employees/lookup?q=FS-1042", headers=accounts["tech"])
    ).status_code == 422
    assert await client.post(
        "/api/v1/tickets/submit", json={**BODY, "company_id": str(uuid4())}
    )
    assert (
        await client.post(
            "/api/v1/tickets/submit", json={**BODY, "employee_id": "FS-1042"}
        )
    ).status_code == 422
    assert (
        await client.post("/api/v1/tickets/submit", json={**BODY, "task_code": "FAKE"})
    ).status_code == 422
    assert (
        await client.post(
            "/api/v1/tickets/submit", json={**BODY, "description": "short"}
        )
    ).status_code == 422
    response = await client.post("/api/v1/tickets/submit", json=BODY)
    assert response.status_code == 201, response.text
    assert set(response.json()) == {"ticket_code", "status", "created_at"}
    code = response.json()["ticket_code"]
    assert (await client.get("/api/v1/tickets/track/" + code)).json() == response.json()
    assert (await client.get("/api/v1/tickets/track/missing")).status_code == 404
    assert (await client.get("/api/v1/tickets")).status_code == 401
    rows = (await client.get("/api/v1/tickets", headers=accounts["tech"])).json()
    assert len(rows) == 1 and rows[0]["company_id"] == profile["company_id"]
    async with AsyncSessionLocal() as db:
        ticket = await db.scalar(select(Ticket))
        assert BODY["description"] not in ticket.description_enc
        assert decrypt(ticket.description_enc) == BODY["description"]
        assert ticket.reported_issue_code == "PRN-TS"
        employee = await db.scalar(select(Employee))
        employee.is_active = False
        await db.commit()
    assert (await client.post("/api/v1/tickets/submit", json=BODY)).status_code == 404


async def test_atomic_claiming_and_codes(client, accounts):
    responses = await asyncio.gather(
        *[
            client.post(
                "/api/v1/tickets/quick-intake", json=BODY, headers=accounts["tech"]
            )
            for _ in range(12)
        ]
    )
    assert all(response.status_code == 201 for response in responses)
    assert len({response.json()["ticket_code"] for response in responses}) == 12
    ticket_id = responses[0].json()["id"]
    claimed = await asyncio.gather(
        *[
            client.patch(f"/api/v1/tickets/{ticket_id}/claim", headers=accounts[role])
            for role in ("tech", "tech2")
        ]
    )
    assert sorted(response.status_code for response in claimed) == [200, 409]
    result = next(
        response.json() for response in claimed if response.status_code == 200
    )
    assert result["status"] == "PROG" and result["started_at"]
    assert (
        await client.get(f"/api/v1/tickets/{uuid4()}", headers=accounts["tech"])
    ).status_code == 404


async def test_resolution_mode_contact_and_admin_override(
    client, accounts, monkeypatch
):
    delivery = AsyncMock()
    monkeypatch.setattr("app.services.mail.send_closure", delivery)
    row = await intake(client, accounts["tech"])
    base = "/api/v1/tickets/" + row["id"]
    await client.patch(base + "/claim", headers=accounts["tech"])

    # 1. Invalid transition from PROG directly to CLSD
    assert (
        await client.patch(
            base + "/status", json={"status": "CLSD"}, headers=accounts["tech"]
        )
    ).status_code == 409

    # 2. Mode validation: resolution requires SITE or REM
    assert (
        await client.patch(
            base + "/status", json={"status": "RESL"}, headers=accounts["tech"]
        )
    ).status_code == 422

    # 3. Missing verified requester contact returns 409
    async with AsyncSessionLocal() as db:
        ticket = await db.get(Ticket, UUID(row["id"]))
        ticket.requester_contact_enc = None
        await db.commit()
    assert (
        await client.patch(
            base + "/status",
            json={"status": "RESL", "mode": "SITE"},
            headers=accounts["tech"],
        )
    ).status_code == 409

    # Restore contact for resolution
    async with AsyncSessionLocal() as db:
        ticket = await db.get(Ticket, UUID(row["id"]))
        from app.core.security import encrypt

        ticket.requester_contact_enc = encrypt("maria.santos@example.com")
        ticket.started_at = now() - timedelta(hours=26)
        ticket.date_started = (now() - timedelta(days=2)).date()
        await db.commit()

    # 4. Successful resolution
    res = await client.patch(
        base + "/status",
        json={"status": "RESL", "mode": "SITE"},
        headers=accounts["tech"],
    )
    assert res.status_code == 200, res.text
    assert float(res.json()["duration"]) == pytest.approx(26, abs=0.01)

    # 5. Non-admin cannot force close
    assert (
        await client.patch(
            base + "/status", json={"status": "CLSD"}, headers=accounts["tech"]
        )
    ).status_code == 403

    # 6. Admin cannot force close before 72 hours
    assert (
        await client.patch(
            base + "/status", json={"status": "CLSD"}, headers=accounts["admin"]
        )
    ).status_code == 409

    # 7. Admin force close succeeds after 72 hours of inactivity
    async with AsyncSessionLocal() as db:
        ticket = await db.get(Ticket, UUID(row["id"]))
        ticket.updated_at = now() - timedelta(hours=73)
        await db.commit()
    assert (
        await client.patch(
            base + "/status", json={"status": "CLSD"}, headers=accounts["admin"]
        )
    ).status_code == 200


async def test_mail_failure_production_rollback(client, accounts, monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")

    for exc_cls in (OSError, smtplib.SMTPException):
        monkeypatch.setattr(
            "app.services.mail.send_closure", AsyncMock(side_effect=exc_cls)
        )
        row = await intake(client, accounts["tech"])
        base = "/api/v1/tickets/" + row["id"]
        await client.patch(base + "/claim", headers=accounts["tech"])

        res = await client.patch(
            base + "/status",
            json={"status": "RESL", "mode": "REM"},
            headers=accounts["tech"],
        )
        assert res.status_code == 503

        # Verify DB fields completely unchanged
        async with AsyncSessionLocal() as db:
            ticket = await db.get(Ticket, UUID(row["id"]))
            assert ticket.status == "PROG"
            assert ticket.mode is None
            assert ticket.resolved_at is None
            assert ticket.date_finished is None
            assert ticket.duration is None
            assert ticket.closure_token_hash is None

        # Verify API view also unchanged
        detail = (await client.get(base, headers=accounts["tech"])).json()
        assert detail["status"] == "PROG"
        assert detail["mode"] is None
        assert detail["resolved_at"] is None
        assert detail["date_finished"] is None
        assert detail["duration"] is None
        assert detail.get("closure_url") is None


async def test_mail_failure_development_fallback(client, accounts, monkeypatch, caplog):
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")

    for exc_cls in (OSError, smtplib.SMTPException):
        caplog.clear()
        monkeypatch.setattr(
            "app.services.mail.send_closure", AsyncMock(side_effect=exc_cls)
        )
        row = await intake(client, accounts["tech"])
        base = "/api/v1/tickets/" + row["id"]
        await client.patch(base + "/claim", headers=accounts["tech"])

        with caplog.at_level(logging.WARNING):
            res = await client.patch(
                base + "/status",
                json={"status": "RESL", "mode": "SITE"},
                headers=accounts["tech"],
            )

        assert res.status_code == 200, res.text
        data = res.json()
        assert data["status"] == "RESL"
        assert data["mode"] == "SITE"
        assert data["closure_url"] is not None
        assert "closure_token" not in res.text

        # Verify sanitized logging (no tokens, closure URLs, or emails)
        assert any(
            "Closure confirmation delivery failed in non-production environment"
            in rec.message
            for rec in caplog.records
        )
        for rec in caplog.records:
            assert data["closure_url"] not in rec.message
            assert "maria.santos@example.com" not in rec.message

        # Fresh database read: verify RESL persisted
        async with AsyncSessionLocal() as db:
            ticket = await db.get(Ticket, UUID(row["id"]))
            assert ticket.status == "RESL"
            assert ticket.mode == "SITE"
            assert ticket.resolved_at is not None
            assert ticket.date_finished is not None
            assert ticket.duration is not None
            assert ticket.closure_token_hash is not None

        # Verify URL structure and extract single-use token and ticketId
        parsed = urlparse(data["closure_url"])
        query_params = parse_qs(parsed.query)
        assert query_params["verifyTicket"][0] == row["ticket_code"]
        assert query_params["ticketId"][0] == row["id"]
        token = query_params["token"][0]

        # Single-use confirmation: confirm closure once
        confirm_res = await client.post(
            f"{base}/confirm-closure",
            json={"token": token},
        )
        assert confirm_res.status_code == 200
        assert confirm_res.json()["status"] == "CLSD"

        # Reject confirmation token on reuse
        confirm_reuse = await client.post(
            f"{base}/confirm-closure",
            json={"token": token},
        )
        assert confirm_reuse.status_code == 400


async def test_resolution_endpoints_do_not_leak_closure_url(
    client, accounts, monkeypatch
):
    # 1. In production, successful resolution exposes no closure_url
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr("app.services.mail.send_closure", AsyncMock())
    row_prod = await intake(client, accounts["tech"])
    base_prod = "/api/v1/tickets/" + row_prod["id"]
    await client.patch(base_prod + "/claim", headers=accounts["tech"])
    res_prod = await client.patch(
        base_prod + "/status",
        json={"status": "RESL", "mode": "REM"},
        headers=accounts["tech"],
    )
    assert res_prod.status_code == 200
    assert res_prod.json().get("closure_url") is None

    # 2. In development, subsequent queue reads return closure_url: null
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    row_dev = await intake(client, accounts["tech"])
    base_dev = "/api/v1/tickets/" + row_dev["id"]
    await client.patch(base_dev + "/claim", headers=accounts["tech"])
    res_dev = await client.patch(
        base_dev + "/status",
        json={"status": "RESL", "mode": "SITE"},
        headers=accounts["tech"],
    )
    assert res_dev.status_code == 200
    assert res_dev.json()["closure_url"] is not None

    queue_res = (await client.get("/api/v1/tickets", headers=accounts["tech"])).json()
    matched_queue = next((t for t in queue_res if t["id"] == row_dev["id"]), None)
    assert matched_queue is not None
    assert matched_queue.get("closure_url") is None

    # 3. Subsequent detail reads return closure_url: null
    detail_res = (await client.get(base_dev, headers=accounts["tech"])).json()
    assert detail_res.get("closure_url") is None

    # 4. Public tracking endpoint exposes neither URL nor token
    track_res = (
        await client.get(f"/api/v1/tickets/track/{row_dev['ticket_code']}")
    ).json()
    assert "closure_url" not in track_res
    assert "token" not in str(track_res)


async def test_encrypted_comments_and_attachments(client, accounts):
    row = await intake(client, accounts["tech"])
    base = "/api/v1/tickets/" + row["id"]
    body = {"body": "Network secret is restricted", "is_internal": True}
    assert (
        await client.post(base + "/comments", json=body, headers=accounts["tech"])
    ).status_code == 201
    assert (await client.get(base + "/comments", headers=accounts["tech"])).json()[0][
        "body"
    ] == body["body"]
    response = await client.post(
        base + "/attachments",
        files={"file": ("../../evidence.txt", b"diagnostic secret", "text/plain")},
        headers=accounts["tech"],
    )
    assert response.status_code == 201, response.text
    assert response.json()["file_name"] == "evidence.txt"
    attachment_id = response.json()["id"]
    assert (
        len((await client.get(base + "/attachments", headers=accounts["tech"])).json())
        == 1
    )
    download = await client.get(
        base + "/attachments/" + attachment_id, headers=accounts["tech"]
    )
    assert (
        download.content == b"diagnostic secret"
        and download.headers["x-content-type-options"] == "nosniff"
    )
    assert (await client.get(base + "/attachments/" + attachment_id)).status_code == 401
    assert (
        await client.get(
            base + "/attachments/" + str(uuid4()), headers=accounts["tech"]
        )
    ).status_code == 404
    async with AsyncSessionLocal() as db:
        item = await db.get(TicketAttachment, UUID(attachment_id))
        assert b"diagnostic secret" not in item.content_enc
    assert (
        await client.post(
            base + "/attachments",
            files={"file": ("x.csv", b"payload", "text/csv")},
            headers=accounts["tech"],
        )
    ).status_code == 415
    assert (
        await client.post(
            base + "/attachments",
            files={"file": ("x.txt", b"x" * (5 * 1024 * 1024 + 1), "text/plain")},
            headers=accounts["tech"],
        )
    ).status_code == 413


async def test_directory_scope_and_governance(client, accounts):
    dictionaries = (
        await client.get("/api/v1/dictionaries", headers=accounts["admin"])
    ).json()
    company = dictionaries["companies"][0]["id"]
    location = next(
        row["id"] for row in dictionaries["locations"] if row["code"] == "CAL"
    )
    department = next(
        row["id"] for row in dictionaries["departments"] if row["code"] == "OPS"
    )
    body = dict(
        employee_id="2000",
        full_name="New Employee",
        email="new@example.com",
        company_id=company,
        location_id=location,
        department_id=department,
    )
    assert (
        await client.post(
            "/api/v1/admin/employees", json=body, headers=accounts["tech"]
        )
    ).status_code == 403
    assert (
        await client.post(
            "/api/v1/admin/employees", json=body, headers=accounts["admin"]
        )
    ).status_code == 422
    scope = dict(location_id=location, department_id=department)
    assert (
        await client.post(
            "/api/v1/admin/location-departments", json=scope, headers=accounts["admin"]
        )
    ).status_code == 201
    response = await client.post(
        "/api/v1/admin/employees", json=body, headers=accounts["admin"]
    )
    assert response.status_code == 201
    body["is_active"] = False
    assert (
        await client.put(
            "/api/v1/admin/employees/" + response.json()["id"],
            json=body,
            headers=accounts["admin"],
        )
    ).status_code == 200
    assert (
        len(
            (
                await client.get("/api/v1/admin/employees", headers=accounts["admin"])
            ).json()
        )
        == 2
    )
    assert (
        await client.get("/api/v1/employees/lookup?q=2000", headers=accounts["admin"])
    ).status_code == 404


async def test_lookup_rate_limit(client, accounts):
    for _ in range(60):
        assert (
            await client.get(
                "/api/v1/employees/lookup?q=1042", headers=accounts["tech"]
            )
        ).status_code == 200
    assert (
        await client.get("/api/v1/employees/lookup?q=1042", headers=accounts["tech"])
    ).status_code == 429
