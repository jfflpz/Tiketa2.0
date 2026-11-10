import io

import pytest
from httpx import AsyncClient
from PIL import Image

pytestmark = pytest.mark.asyncio


def make_test_png() -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGBA", (32, 32), color=(255, 0, 0, 255))
    img.save(buf, format="PNG")
    return buf.getvalue()


async def test_sprint4_b06_intern_photo_lifecycle_and_avatar_metadata(
    client: AsyncClient, accounts: dict
):
    """B-06 / S4-02 / S4-12: Intern photo upload, delete, and avatar metadata in /auth/me and /admin/users."""
    intern_headers = accounts["intern"]
    admin_headers = accounts["admin"]

    # 1. Before upload, /auth/me has avatar_url=None
    me_res_before = await client.get("/api/v1/auth/me", headers=intern_headers)
    assert me_res_before.status_code == 200
    intern_user = me_res_before.json()
    assert intern_user["role"] == "intern"
    assert intern_user["avatar_url"] is None

    # 2. Upload photo as Intern
    png_bytes = make_test_png()
    upload_res = await client.put(
        "/api/v1/users/me/photo",
        headers=intern_headers,
        files={"file": ("avatar.png", png_bytes, "image/png")},
    )
    assert upload_res.status_code == 200, upload_res.text
    upload_data = upload_res.json()
    assert "avatar_url" in upload_data
    assert str(intern_user["id"]) in upload_data["avatar_url"]

    # 3. Read photo as another authenticated role (admin)
    photo_res = await client.get(
        f"/api/v1/users/{intern_user['id']}/photo",
        headers=admin_headers,
    )
    assert photo_res.status_code == 200
    assert photo_res.headers["content-type"] == "image/png"

    # 4. Avatar metadata survives in /auth/me
    me_res_after = await client.get("/api/v1/auth/me", headers=intern_headers)
    assert me_res_after.status_code == 200
    assert me_res_after.json()["avatar_url"] is not None

    # 5. Avatar metadata appears in /admin/users
    users_res = await client.get("/api/v1/admin/users", headers=admin_headers)
    assert users_res.status_code == 200
    users = users_res.json()
    matched_intern = next((u for u in users if u["id"] == intern_user["id"]), None)
    assert matched_intern is not None
    assert matched_intern["avatar_url"] is not None

    # 6. Intern deletes photo
    del_res = await client.delete("/api/v1/users/me/photo", headers=intern_headers)
    assert del_res.status_code == 204

    # 7. Photo now 404 and /auth/me returns avatar_url=None
    get_del_photo = await client.get(
        f"/api/v1/users/{intern_user['id']}/photo",
        headers=admin_headers,
    )
    assert get_del_photo.status_code == 404

    me_res_del = await client.get("/api/v1/auth/me", headers=intern_headers)
    assert me_res_del.json()["avatar_url"] is None


async def test_sprint4_b06_intern_account_request_proposal_and_approval(
    client: AsyncClient, accounts: dict
):
    """B-06 / S4-02: Intern role can be proposed by Admin and approved by Supervisor."""
    admin_headers = accounts["admin"]
    supervisor_headers = accounts["supervisor"]

    # 1. Admin proposes an Intern account
    req_res = await client.post(
        "/api/v1/account-requests",
        headers=admin_headers,
        json={
            "request_type": "create",
            "username": "intern_ojt_juan",
            "email": "juan.intern@example.com",
            "full_name": "Juan Dela Cruz",
            "role": "intern",
            "department": "IT Support",
        },
    )
    assert req_res.status_code == 201, req_res.text
    req_id = req_res.json()["id"]

    # 2. Supervisor approves the request
    approve_res = await client.post(
        f"/api/v1/account-requests/{req_id}/approve",
        headers=supervisor_headers,
    )
    assert approve_res.status_code == 200, approve_res.text
    created_user = approve_res.json()["user"]
    assert created_user["role"] == "intern"
    assert created_user["username"] == "intern_ojt_juan"
