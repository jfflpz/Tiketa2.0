import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models import Employee, LocationObservation, Ticket


@pytest.mark.asyncio
async def test_intake_matching_and_security(client: AsyncClient, accounts):
    session_id = f"test-session-{uuid.uuid4()}"
    headers = {"X-Kiosk-Session-ID": session_id}

    # Ensure clean test employee 0012 exists with leading zeros
    async with AsyncSessionLocal() as db:
        emp1042 = await db.scalar(
            select(Employee).where(Employee.employee_id == "1042")
        )
        assert emp1042 is not None
        emp_email = emp1042.email

        emp0012 = await db.scalar(
            select(Employee).where(Employee.employee_id == "0012")
        )
        if not emp0012:
            emp0012 = Employee(
                employee_id="0012",
                full_name="Juan Dela Cruz",
                email="juan.delacruz@external-domain.ph",
                company_id=emp1042.company_id,
                location_id=emp1042.location_id,
                department_id=emp1042.department_id,
                is_active=True,
            )
            db.add(emp0012)
            await db.commit()

    # TEST-INTAKE-01: Valid pair match
    res = await client.post(
        "/api/v1/employees/match",
        json={"employee_id": "1042", "email": emp_email},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["matched"] is True
    assert "match_token" in data and len(data["match_token"]) > 20
    assert data["employee"]["full_name"] == emp1042.full_name
    assert "email" not in data["employee"]  # Email not disclosed in profile
    match_token = data["match_token"]

    # TEST-INTAKE-02: Valid ID, wrong email -> generic 404 mismatch
    res_wrong_email = await client.post(
        "/api/v1/employees/match",
        json={"employee_id": "1042", "email": "wrong.email@fivestarbus.com"},
        headers=headers,
    )
    assert res_wrong_email.status_code == 404
    assert res_wrong_email.json()["detail"] == (
        "Employee ID and email do not match an active employee record."
    )

    # TEST-INTAKE-03: Unknown ID -> same generic 404 mismatch
    res_unknown = await client.post(
        "/api/v1/employees/match",
        json={"employee_id": "999999", "email": "any@domain.com"},
        headers=headers,
    )
    assert res_unknown.status_code == 404
    assert res_unknown.json()["detail"] == (
        "Employee ID and email do not match an active employee record."
    )

    # TEST-INTAKE-04: Leading zero numeric ID (0012)
    session_0012 = f"test-session-{uuid.uuid4()}"
    res_0012 = await client.post(
        "/api/v1/employees/match",
        json={"employee_id": "0012", "email": "juan.delacruz@external-domain.ph"},
        headers={"X-Kiosk-Session-ID": session_0012},
    )
    assert res_0012.status_code == 200
    assert res_0012.json()["employee"]["full_name"] == "Juan Dela Cruz"

    # TEST-INTAKE-05: Unauthenticated public lookup is blocked
    res_unauth_lookup = await client.get("/api/v1/employees/lookup?q=1042")
    assert res_unauth_lookup.status_code == 401

    # Authenticated lookup works for staff
    res_auth_lookup = await client.get(
        "/api/v1/employees/lookup?q=1042", headers=accounts["tech"]
    )
    assert res_auth_lookup.status_code == 200

    # TEST-INTAKE-06: Direct submission bypass attempt without match_token
    res_bypass = await client.post(
        "/api/v1/tickets/submit",
        json={
            "employee_id": "1042",
            "task_code": "PRN-TS",
            "description": "Bypass attempt without token",
        },
        headers=headers,
    )
    assert res_bypass.status_code == 403

    # TEST-INTAKE-07: Public submission with match_token populates DB scope
    res_submit = await client.post(
        "/api/v1/tickets/submit",
        json={
            "match_token": match_token,
            "reported_issue_code": "PRN-TS",
            "task_code": "PRN-TS",
            "description": "Thermal printer receipt jam at booth 2",
        },
        headers=headers,
    )
    assert res_submit.status_code == 201, res_submit.text
    ticket_code = res_submit.json()["ticket_code"]

    async with AsyncSessionLocal() as db:
        t = await db.scalar(select(Ticket).where(Ticket.ticket_code == ticket_code))
        assert t is not None
        assert t.location_id == emp1042.location_id
        assert t.department_id == emp1042.department_id
        assert t.company_id == emp1042.company_id


@pytest.mark.asyncio
async def test_matching_rate_limit_cooldowns(client: AsyncClient):
    session_id = f"test-cooldown-{uuid.uuid4()}"
    headers = {"X-Kiosk-Session-ID": session_id}

    # 4 mismatches allowed
    for _ in range(4):
        res = await client.post(
            "/api/v1/employees/match",
            json={"employee_id": "1042", "email": "wrong@test.com"},
            headers=headers,
        )
        assert res.status_code == 404

    # 5th mismatch triggers 2-min cooldown (HTTP 429)
    res5 = await client.post(
        "/api/v1/employees/match",
        json={"employee_id": "1042", "email": "wrong@test.com"},
        headers=headers,
    )
    assert res5.status_code == 429
    assert "Retry-After" in res5.headers
    retry_after = int(res5.headers["Retry-After"])
    assert 115 <= retry_after <= 120

    # Repeat during cooldown: returns 429 with remaining time and does NOT extend
    res_during = await client.post(
        "/api/v1/employees/match",
        json={"employee_id": "1042", "email": "wrong@test.com"},
        headers=headers,
    )
    assert res_during.status_code == 429
    retry_after2 = int(res_during.headers["Retry-After"])
    assert retry_after2 <= retry_after


@pytest.mark.asyncio
async def test_location_observations_and_linking(client: AsyncClient):
    session_id = f"test-loc-session-{uuid.uuid4()}"
    headers = {"X-Kiosk-Session-ID": session_id}

    # Match employee first to obtain token
    async with AsyncSessionLocal() as db:
        emp = await db.scalar(select(Employee).where(Employee.employee_id == "1042"))
        emp_email = emp.email

    match_res = await client.post(
        "/api/v1/employees/match",
        json={"employee_id": "1042", "email": emp_email},
        headers=headers,
    )
    assert match_res.status_code == 200
    match_token = match_res.json()["match_token"]

    # TEST-LOC-01: Ingest valid coordinates
    loc_res = await client.post(
        "/api/v1/locations/observations",
        json={
            "session_id": session_id,
            "latitude": 14.5378,
            "longitude": 121.0014,
            "accuracy": 12.5,
        },
    )
    assert loc_res.status_code == 201, loc_res.text
    obs_id = loc_res.json()["observation_id"]

    # TEST-LOC-02: Invalid latitude out of range rejected
    bad_loc_res = await client.post(
        "/api/v1/locations/observations",
        json={
            "session_id": session_id,
            "latitude": 95.0,  # > 90
            "longitude": 121.0014,
            "accuracy": 10.0,
        },
    )
    assert bad_loc_res.status_code == 422

    # TEST-LOC-03 & TEST-LOC-04: Submit ticket with observation_id
    ticket_res = await client.post(
        "/api/v1/tickets/submit",
        json={
            "match_token": match_token,
            "reported_issue_code": "NET-CFG",
            "task_code": "NET-CFG",
            "description": "Terminal Wi-Fi access point offline at ticketing bays",
            "observation_id": obs_id,
        },
        headers=headers,
    )
    assert ticket_res.status_code == 201, ticket_res.text
    t_code = ticket_res.json()["ticket_code"]

    async with AsyncSessionLocal() as db:
        ticket = await db.scalar(select(Ticket).where(Ticket.ticket_code == t_code))
        obs = await db.get(LocationObservation, uuid.UUID(obs_id))
        assert ticket is not None
        assert obs is not None
        assert obs.ticket_id == ticket.id
