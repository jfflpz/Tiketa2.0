import io
import uuid
import pytest
from httpx import AsyncClient
from PIL import Image


@pytest.mark.asyncio
async def test_admin_proposal_and_supervisor_decision(client: AsyncClient, accounts):
    """B-03: Admin proposes create/deactivate, Supervisor approves/rejects, non-supervisor cannot decide."""
    # 1. Admin creates account request for intern
    res_prop = await client.post(
        "/api/v1/account-requests",
        json={
            "request_type": "create",
            "username": "s1_intern",
            "email": "s1_intern@example.com",
            "full_name": "S1 Intern User",
            "role": "intern",
        },
        headers=accounts["admin"],
    )
    assert res_prop.status_code == 201
    req_data = res_prop.json()
    assert req_data["status"] == "pending"
    req_id = req_data["id"]

    # 2. Tech or Intern cannot approve (403)
    res_bad_approve = await client.post(
        f"/api/v1/account-requests/{req_id}/approve",
        headers=accounts["tech"],
    )
    assert res_bad_approve.status_code == 403

    # 3. Supervisor approves -> user created and temp password returned
    res_approve = await client.post(
        f"/api/v1/account-requests/{req_id}/approve",
        headers=accounts["supervisor"],
    )
    assert res_approve.status_code == 200
    approval_data = res_approve.json()
    assert approval_data["request_type"] == "create"
    assert approval_data["temporary_password"] is not None
    created_user_id = approval_data["user"]["id"]

    # 4. Duplicate decision returns 409
    res_dup = await client.post(
        f"/api/v1/account-requests/{req_id}/approve",
        headers=accounts["supervisor"],
    )
    assert res_dup.status_code == 409

    # 5. Admin proposes deactivation for the newly created user
    res_deact_prop = await client.post(
        "/api/v1/account-requests",
        json={
            "request_type": "deactivate",
            "target_user_id": created_user_id,
        },
        headers=accounts["admin"],
    )
    assert res_deact_prop.status_code == 201
    deact_req_id = res_deact_prop.json()["id"]

    # 6. Supervisor approves deactivation
    res_deact_app = await client.post(
        f"/api/v1/account-requests/{deact_req_id}/approve",
        headers=accounts["supervisor"],
    )
    assert res_deact_app.status_code == 200
    assert res_deact_app.json()["user"]["is_active"] is False


@pytest.mark.asyncio
async def test_direct_user_creation_and_deactivation_bypass_blocked(client: AsyncClient, accounts):
    """B-03: Direct user creation and role changes via /admin/users are blocked."""
    res_direct = await client.post(
        "/api/v1/admin/users",
        json={
            "username": "bypass_user",
            "email": "bypass@example.com",
            "full_name": "Bypass User",
            "role": "it",
            "password": "Password12345!",
        },
        headers=accounts["admin"],
    )
    assert res_direct.status_code == 403


@pytest.mark.asyncio
async def test_staff_profile_photos(client: AsyncClient, accounts):
    """B-04: Staff can upload, read, and delete their own profile photos with validation."""
    # 1. Create a 100x100 PNG
    img = Image.new("RGB", (100, 100), color=(73, 109, 137))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    png_bytes = buf.getvalue()

    # 2. Tech uploads photo
    res_up = await client.put(
        "/api/v1/users/me/photo",
        files={"file": ("profile.png", png_bytes, "image/png")},
        headers=accounts["tech"],
    )
    assert res_up.status_code == 200
    res_data = res_up.json()
    assert "avatar_url" in res_data
    photo_url = res_data["avatar_url"]

    # 3. Authenticated staff can read the photo
    res_get = await client.get(photo_url, headers=accounts["supervisor"])
    assert res_get.status_code == 200
    assert res_get.headers["content-type"] == "image/png"
    assert res_get.headers["x-content-type-options"] == "nosniff"

    # 4. Unauthenticated read is rejected
    res_unauth = await client.get(photo_url)
    assert res_unauth.status_code == 401

    # 5. Delete photo
    res_del = await client.delete("/api/v1/users/me/photo", headers=accounts["tech"])
    assert res_del.status_code == 204

    # 6. Read after delete returns 404
    res_get_del = await client.get(photo_url, headers=accounts["tech"])
    assert res_get_del.status_code == 404