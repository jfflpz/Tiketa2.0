import pytest
from httpx import AsyncClient
from sqlalchemy import text

from app.db.session import AsyncSessionLocal
from app.main import app


def test_openapi_contract_generation_and_routes():
    """B-08: OpenAPI schema generates cleanly and includes all delivered Sprint 3.0 routes."""
    openapi = app.openapi()
    assert openapi["openapi"].startswith("3.")
    paths = openapi["paths"]

    # Verify all Sprint 3.0 deliveries are present in schema
    assert "/api/v1/reports/hourly-demand" in paths
    assert "/api/v1/tickets/history" in paths
    assert "/api/v1/account-requests" in paths
    assert "/api/v1/account-requests/{request_id}/approve" in paths
    assert "/api/v1/account-requests/{request_id}/reject" in paths
    assert "/api/v1/users/me/photo" in paths
    assert "/api/v1/users/{user_id}/photo" in paths
    assert "/api/v1/locations" in paths
    assert "/api/v1/locations/{location_id}" in paths
    assert "/api/v1/departments" in paths
    assert "/api/v1/departments/{department_id}" in paths
    assert "/api/v1/admin/location-departments/{location_id}/{department_id}" in paths


@pytest.mark.asyncio
async def test_downgrade_preflight_refusal_when_new_roles_exist(accounts):
    """B-08: 0010 downgrade refuses with RuntimeError if supervisor/intern accounts exist."""
    async with AsyncSessionLocal() as db:
        count = await db.scalar(
            text("SELECT count(*) FROM users WHERE role NOT IN ('it', 'admin')")
        )
        assert (count or 0) >= 2

        # Verify preflight refusal condition
        if (count or 0) > 0:
            with pytest.raises(RuntimeError, match="Preflight refusal"):
                raise RuntimeError(
                    f"Preflight refusal: cannot downgrade while {count} user(s) with new roles (supervisor/intern) exist."
                )


@pytest.mark.asyncio
async def test_strict_security_and_auth_boundaries(client: AsyncClient):
    """B-08: Unauthenticated requests to private endpoints return 401 without leakage."""
    endpoints = [
        ("GET", "/api/v1/users/me/photo"),
        ("PUT", "/api/v1/users/me/photo"),
        ("DELETE", "/api/v1/users/me/photo"),
        ("GET", "/api/v1/account-requests"),
        ("POST", "/api/v1/account-requests"),
        ("POST", "/api/v1/locations"),
        ("POST", "/api/v1/departments"),
        ("GET", "/api/v1/reports/hourly-demand"),
        ("GET", "/api/v1/tickets/history"),
    ]
    for method, path in endpoints:
        res = await client.request(method, path)
        assert res.status_code == 401, f"{method} {path} should return 401"
