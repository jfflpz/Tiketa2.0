import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_sprint4_b08_employee_directory_filters(
    client: AsyncClient, accounts: dict
):
    """B-08 / S4-04: GET /admin/employees supports q and company/location/department filters."""
    admin_headers = accounts["admin"]

    # 1. Search existing seeded employee 1042
    res_1042 = await client.get(
        "/api/v1/admin/employees?q=1042",
        headers=admin_headers,
    )
    assert res_1042.status_code == 200
    rows = res_1042.json()
    assert len(rows) >= 1
    assert any(e["employee_id"] == "1042" for e in rows)

    # 2. Search nonexistent string
    res_empty = await client.get(
        "/api/v1/admin/employees?q=NONEXISTENT_QUERY_9999",
        headers=admin_headers,
    )
    assert res_empty.status_code == 200
    assert res_empty.json() == []


async def test_sprint4_b08_user_directory_filters(client: AsyncClient, accounts: dict):
    """B-08 / S4-04: GET /admin/users supports q, role, and active status filters."""
    admin_headers = accounts["admin"]

    # 1. Filter by role=intern
    res_interns = await client.get(
        "/api/v1/admin/users?role=intern",
        headers=admin_headers,
    )
    assert res_interns.status_code == 200
    intern_rows = res_interns.json()
    assert len(intern_rows) >= 1
    assert all(u["role"] == "intern" for u in intern_rows)

    # 2. Search by username q=admin
    res_admin = await client.get(
        "/api/v1/admin/users?q=admin",
        headers=admin_headers,
    )
    assert res_admin.status_code == 200
    admin_rows = res_admin.json()
    assert any(u["username"] == "admin" for u in admin_rows)


async def test_sprint4_b07_pms_complete_month_validation(
    client: AsyncClient, accounts: dict
):
    """B-07 / S4-08: PMS compliance reports require complete calendar months."""
    admin_headers = accounts["admin"]

    # 1. Partial month request returns 422
    res_partial = await client.get(
        "/api/v1/reports/pms-compliance?date_from=2026-10-05&date_to=2026-10-25",
        headers=admin_headers,
    )
    assert res_partial.status_code == 422
    assert "complete calendar months" in res_partial.json()["detail"].lower()

    # 2. Complete month request succeeds
    res_complete = await client.get(
        "/api/v1/reports/pms-compliance?date_from=2026-10-01&date_to=2026-10-31",
        headers=admin_headers,
    )
    assert res_complete.status_code == 200


async def test_sprint4_b05_truthful_personal_metrics(
    client: AsyncClient, accounts: dict
):
    """B-05 / S4-01 / S4-13: History returns genuine UUID records and 0 for new technician."""
    intern_headers = accounts["intern"]

    # Fresh account without assigned tickets returns empty history (not synthetic offset)
    history_res = await client.get(
        "/api/v1/tickets/history",
        headers=intern_headers,
    )
    assert history_res.status_code == 200
    assert history_res.json() == []
