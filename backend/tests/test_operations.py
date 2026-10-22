import runpy
import sys
from unittest.mock import MagicMock

import pytest
from sqlalchemy import func, select

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models import Ticket, User
from app.schemas import UserCreate
from app.services.mail import send_closure
from scripts.bootstrap_admin import bootstrap
from scripts.seed_demo_operations import seed as seed_demo_ops


async def test_bootstrap_is_once_and_hashes_password():
    body = UserCreate(
        username="firstadmin",
        email="admin@example.com",
        full_name="First Admin",
        role="admin",
        password="secure-first-password",
    )
    await bootstrap(body)
    with pytest.raises(ValueError, match="already exists"):
        await bootstrap(body)
    async with AsyncSessionLocal() as db:
        user = await db.scalar(select(User))
        assert user.role == "admin" and user.password_hash.startswith("$argon2id$")


async def test_smtp_uses_verified_recipient_and_tls(monkeypatch):
    smtp = MagicMock()
    monkeypatch.setattr("app.services.mail.smtplib.SMTP", smtp)
    monkeypatch.setattr(settings, "SMTP_STARTTLS", True)
    monkeypatch.setattr(settings, "SMTP_USERNAME", "smtp-user")
    monkeypatch.setattr(settings, "SMTP_PASSWORD", "test-only")
    await send_closure(
        "verified@example.com", "T-2610-0001", "ticket-id", "single-use-token"
    )
    connection = smtp.return_value.__enter__.return_value
    connection.starttls.assert_called_once()
    connection.login.assert_called_once_with("smtp-user", "test-only")
    message = connection.send_message.call_args.args[0]
    assert message["To"] == "verified@example.com"
    assert "single-use-token" in message.get_content()
    assert "confirm-closure" in message.get_content()


async def test_seed_demo_operations_idempotent():
    await seed_demo_ops()
    await seed_demo_ops()
    async with AsyncSessionLocal() as db:
        tickets_count = await db.scalar(select(func.count()).select_from(Ticket))
        assert tickets_count > 0


def test_export_openapi_check(monkeypatch):
    monkeypatch.setattr(sys, "argv", ["export_openapi.py", "--check"])
    runpy.run_module("scripts.export_openapi", run_name="__main__")
