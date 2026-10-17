import asyncio
from datetime import UTC, datetime

import bcrypt
import jwt
from sqlalchemy import select

from app.core.cache import cache
from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models import User


async def test_login_refresh_logout(client, accounts):
    response = await client.post(
        "/api/v1/auth/login",
        json={"username": "tech", "password": "correct-horse-battery"},
    )
    assert (
        "HttpOnly" in response.headers["set-cookie"]
        and "SameSite=strict" in response.headers["set-cookie"]
    )
    old_refresh = client.cookies.get("refresh_token")
    access = response.json()["access_token"]
    assert (
        await client.get(
            "/api/v1/auth/me", headers={"Authorization": "Bearer " + access}
        )
    ).status_code == 200
    responses = await asyncio.gather(
        *[
            client.post(
                "/api/v1/auth/refresh",
                headers={"Cookie": f"refresh_token={old_refresh}"},
            )
            for _ in range(2)
        ]
    )
    assert sorted(response.status_code for response in responses) == [200, 401]
    fresh = next(response for response in responses if response.status_code == 200)
    token = fresh.json()["access_token"]
    refresh = fresh.cookies.get("refresh_token")
    headers = {"Authorization": "Bearer " + token}
    assert (
        await client.post("/api/v1/auth/logout", headers=headers)
    ).status_code == 204
    assert (await client.get("/api/v1/auth/me", headers=headers)).status_code == 401
    assert (
        await client.post(
            "/api/v1/auth/refresh", headers={"Cookie": f"refresh_token={refresh}"}
        )
    ).status_code == 401
    assert (
        await client.get(
            "/api/v1/auth/me", headers={"Authorization": "Bearer " + access}
        )
    ).status_code == 401


async def test_auth_rejections(client, accounts):
    assert (await client.get("/api/v1/auth/me")).status_code == 401
    assert (
        await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid"})
    ).status_code == 401
    assert (
        await client.get("/api/v1/admin/users", headers=accounts["tech"])
    ).status_code == 403
    for path in ("register", "signup", "auth/enroll-device"):
        assert (await client.post("/api/v1/" + path)).status_code == 404
    token = accounts["tech"]["Authorization"].split()[1]
    claims = jwt.decode(
        token, settings.SECRET_KEY, algorithms=["HS256"], audience="tiketa-api"
    )
    claims["exp"] = int(datetime.now(UTC).timestamp()) - 60
    expired = jwt.encode(claims, settings.SECRET_KEY, algorithm="HS256")
    assert (
        await client.get(
            "/api/v1/auth/me", headers={"Authorization": "Bearer " + expired}
        )
    ).status_code == 401
    refresh = client.cookies.get("refresh_token")
    assert (
        await client.get(
            "/api/v1/auth/me", headers={"Authorization": "Bearer " + refresh}
        )
    ).status_code == 401
    assert (
        await client.post(
            "/api/v1/auth/refresh", headers={"Origin": "https://evil.example"}
        )
    ).status_code == 403
    client.cookies.clear()
    assert (await client.post("/api/v1/auth/refresh")).status_code == 401


async def test_rate_limit(client):
    for _ in range(5):
        assert (
            await client.post(
                "/api/v1/auth/login", json={"username": "ghost", "password": "wrong"}
            )
        ).status_code == 401
    assert (
        await client.post(
            "/api/v1/auth/login", json={"username": "ghost", "password": "wrong"}
        )
    ).status_code == 429
    for key in await cache.keys("login:*"):
        assert await cache.ttl(key) > 0


async def test_admin_provision_and_revocation(client, accounts):
    body = dict(
        username="newtech",
        email="new@example.com",
        full_name="New Tech",
        role="it",
        password="a-long-password",
    )
    assert (
        await client.post(
            "/api/v1/admin/users",
            json={**body, "role": "office"},
            headers=accounts["admin"],
        )
    ).status_code == 422
    response = await client.post(
        "/api/v1/admin/users", json=body, headers=accounts["admin"]
    )
    assert response.status_code == 201 and "password_hash" not in response.text
    assert (
        await client.post("/api/v1/admin/users", json=body, headers=accounts["admin"])
    ).status_code == 409
    users = (await client.get("/api/v1/admin/users", headers=accounts["admin"])).json()
    tech_id = next(row["id"] for row in users if row["username"] == "tech")
    response = await client.patch(
        "/api/v1/admin/users/" + tech_id,
        json={"is_active": False},
        headers=accounts["admin"],
    )
    assert response.status_code == 200
    assert (
        await client.get("/api/v1/auth/me", headers=accounts["tech"])
    ).status_code == 401
    admin_id = next(row["id"] for row in users if row["username"] == "admin")
    assert (
        await client.patch(
            "/api/v1/admin/users/" + admin_id,
            json={"role": "it"},
            headers=accounts["admin"],
        )
    ).status_code == 409


async def test_bcrypt_upgrade(client, accounts):
    async with AsyncSessionLocal() as db:
        user = await db.scalar(select(User).where(User.username == "tech"))
        user.password_hash = bcrypt.hashpw(
            b"legacy-password", bcrypt.gensalt(rounds=12)
        ).decode()
        await db.commit()
    response = await client.post(
        "/api/v1/auth/login",
        json={"username": "tech@example.com", "password": "legacy-password"},
    )
    assert response.status_code == 200
    async with AsyncSessionLocal() as db:
        user = await db.scalar(select(User).where(User.username == "tech"))
        assert user.password_hash.startswith("$argon2id$")
