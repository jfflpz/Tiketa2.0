import base64
from unittest.mock import AsyncMock

import pytest
from cryptography.exceptions import InvalidTag
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.core.config import Settings
from app.core.security import decrypt, encrypt, hash_password, verify_password
from app.db.session import AsyncSessionLocal
from app.models import Company, Department, Employee, Location, TaskCategory, User
from scripts.seed_dictionaries import seed


async def test_seed_idempotent():
    await seed(demo=True)
    await seed(demo=True)
    async with AsyncSessionLocal() as db:
        for model, expected in (
            (Company, 11),
            (Location, 15),
            (Department, 19),
            (TaskCategory, 13),
            (Employee, 1),
        ):
            assert await db.scalar(select(func.count()).select_from(model)) == expected


async def test_health(client, monkeypatch):
    assert (await client.get("/health")).status_code == 200
    assert (await client.get("/health/ready")).status_code == 200
    assert (await client.get("/api/v1/ping")).json() == {"ping": "pong"}
    monkeypatch.setattr("app.main.cache.ping", AsyncMock(side_effect=ConnectionError))
    assert (await client.get("/health/ready")).status_code == 503


async def test_database_rejects_third_role():
    async with AsyncSessionLocal() as db:
        db.add(
            User(
                username="office",
                email="office@example.com",
                full_name="Office",
                role="office",
                password_hash="unused",
            )
        )
        with pytest.raises(IntegrityError):
            await db.commit()


def test_encryption_and_hash():
    encoded = hash_password("correct-password")
    assert encoded.startswith("$argon2id$v=19$m=65536,t=3,p=4$")
    assert verify_password("correct-password", encoded)
    assert not verify_password("wrong-password", encoded)
    assert not verify_password("password", "malformed")
    one, two = (
        encrypt("private-network-credential"),
        encrypt("private-network-credential"),
    )
    assert one != two
    assert decrypt(one) == "private-network-credential"
    data = bytearray(base64.b64decode(one))
    data[-1] ^= 1
    with pytest.raises(InvalidTag):
        decrypt(base64.b64encode(data).decode())


def test_settings_reject_weak_keys():
    with pytest.raises(ValueError):
        Settings(APP_FIELD_ENCRYPTION_KEY="invalid")
    with pytest.raises(ValueError):
        Settings(APP_FIELD_ENCRYPTION_KEY="YWJj")
    with pytest.raises(ValueError):
        Settings(ENVIRONMENT="production", PUBLIC_BASE_URL="http://unsafe")
    with pytest.raises(ValueError):
        Settings(
            ENVIRONMENT="production",
            PUBLIC_BASE_URL="https://example.com",
            SMTP_STARTTLS=False,
        )
