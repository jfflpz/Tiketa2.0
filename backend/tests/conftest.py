import os
from pathlib import Path

import httpx
import pytest
import pytest_asyncio
from alembic import command
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.engine import make_url

# No SQLite fallback and no implicit use of a developer .env database.
url = os.environ.get("TIKETA_TEST_DATABASE_URL", "")
redis_url = os.environ.get("TIKETA_TEST_REDIS_URL", "")
if (
    not url
    or not (make_url(url).database or "").endswith("_test")
    or not redis_url.endswith("/15")
):
    raise RuntimeError(
        "Explicit disposable TIKETA_TEST_DATABASE_URL ending _test and TIKETA_TEST_REDIS_URL ending /15 are required"
    )
os.environ.update(
    DATABASE_URL=url,
    REDIS_URL=redis_url,
    ENVIRONMENT="test",
    SECRET_KEY="test-only-signing-key-with-more-than-32-characters",
    APP_FIELD_ENCRYPTION_KEY="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
)

from app.core.cache import cache  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.db.session import AsyncSessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import User  # noqa: E402
from scripts.seed_dictionaries import seed  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def migrations():
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    command.upgrade(config, "head")
    command.downgrade(config, "base")
    command.upgrade(config, "head")
    command.check(config)


@pytest_asyncio.fixture(autouse=True)
async def clean_database(migrations):
    async with engine.begin() as connection:
        await connection.execute(
            text(
                "TRUNCATE companies, departments, locations, users, task_categories, ticket_counters CASCADE"
            )
        )
    await cache.flushdb()
    await seed(demo=True)
    yield
    await cache.aclose()
    await engine.dispose()


@pytest_asyncio.fixture
async def client():
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client


@pytest_asyncio.fixture
async def accounts(client):
    async with AsyncSessionLocal() as db:
        password_hash = hash_password("correct-horse-battery")
        for username, role in (("admin", "admin"), ("tech", "it"), ("tech2", "it")):
            db.add(
                User(
                    username=username,
                    email=username + "@example.com",
                    full_name=username.title(),
                    role=role,
                    password_hash=password_hash,
                )
            )
        await db.commit()
    result = {}
    for username in ("admin", "tech", "tech2"):
        response = await client.post(
            "/api/v1/auth/login",
            json={"username": username, "password": "correct-horse-battery"},
        )
        assert response.status_code == 200, response.text
        result[username] = {
            "Authorization": "Bearer " + response.json()["access_token"]
        }
    return result
