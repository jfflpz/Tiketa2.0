import base64
import hashlib
import os
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import bcrypt
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import settings

hasher = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4, salt_len=16)


def hash_password(password: str) -> str:
    return hasher.hash(password)


def verify_password(password: str, encoded: str) -> bool:
    try:
        if encoded.startswith(("$2a$", "$2b$", "$2y$")):
            # Laravel bcrypt supports at most 72 UTF-8 bytes. Reject rather than truncate.
            return len(password.encode()) <= 72 and bcrypt.checkpw(
                password.encode(), encoded.encode()
            )
        return hasher.verify(encoded, password)
    except (VerificationError, InvalidHashError, ValueError):
        return False


def digest(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def encrypt_bytes(value: bytes) -> bytes:
    nonce = os.urandom(12)
    cipher = AESGCM(base64.b64decode(settings.APP_FIELD_ENCRYPTION_KEY))
    return nonce + cipher.encrypt(nonce, value, b"tiketa-v1")


def decrypt_bytes(value: bytes) -> bytes:
    cipher = AESGCM(base64.b64decode(settings.APP_FIELD_ENCRYPTION_KEY))
    return cipher.decrypt(value[:12], value[12:], b"tiketa-v1")


def encrypt(value: str) -> str:
    return base64.b64encode(encrypt_bytes(value.encode())).decode()


def decrypt(value: str) -> str:
    return decrypt_bytes(base64.b64decode(value)).decode()


def issue_token(user, kind: str, session_id: str) -> tuple[str, dict]:
    now = datetime.now(UTC)
    lifetime = (
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        if kind == "access"
        else timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    claims = {
        "sub": str(user.id),
        "type": kind,
        "sid": session_id,
        "ver": user.token_version,
        "jti": str(uuid4()),
        "iat": int(now.timestamp()),
        "exp": int((now + lifetime).timestamp()),
        "iss": "tiketa",
        "aud": "tiketa-api",
    }
    return jwt.encode(claims, settings.SECRET_KEY, algorithm="HS256"), claims


def decode_token(token: str, kind: str) -> dict:
    claims = jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=["HS256"],
        audience="tiketa-api",
        issuer="tiketa",
        options={"require": ["sub", "type", "sid", "ver", "jti", "iat", "exp"]},
    )
    if claims["type"] != kind:
        raise jwt.InvalidTokenError("Incorrect token type")
    return claims


def issue_match_token(employee_id: str, session_id: str) -> str:
    now = datetime.now(UTC)
    claims = {
        "sub": employee_id,
        "type": "employee_match",
        "sid": session_id,
        "jti": str(uuid4()),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=15)).timestamp()),
        "iss": "tiketa",
        "aud": "tiketa-intake",
    }
    return jwt.encode(claims, settings.SECRET_KEY, algorithm="HS256")


def verify_match_token(token: str, session_id: str | None = None) -> str:
    claims = jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=["HS256"],
        audience="tiketa-intake",
        issuer="tiketa",
        options={"require": ["sub", "type", "sid", "jti", "iat", "exp"]},
    )
    if claims.get("type") != "employee_match":
        raise jwt.InvalidTokenError("Incorrect token type")
    if session_id and claims.get("sid") != session_id:
        raise jwt.InvalidTokenError("Session mismatch")
    return str(claims["sub"])


def issue_employee_ticket_token(
    ticket_id: str,
    ticket_code: str,
    employee_id: str,
    session_id: str = "",
    can_close: bool = False,
    can_reopen: bool = False,
    closure_hash: str | None = None,
    scope: str = "ticket_conversation",
) -> str:
    now = datetime.now(UTC)
    claims = {
        "sub": ticket_id,
        "ticket_code": ticket_code,
        "employee_id": employee_id,
        "type": "employee_ticket_access",
        "scope": scope,
        "sid": session_id,
        "can_close": can_close,
        "can_reopen": can_reopen,
        "closure_hash": closure_hash,
        "jti": str(uuid4()),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=2)).timestamp()),
        "iss": "tiketa",
        "aud": "tiketa-ticket-access",
    }
    return jwt.encode(claims, settings.SECRET_KEY, algorithm="HS256")


def verify_employee_ticket_token(token: str) -> dict:
    claims = jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=["HS256"],
        audience="tiketa-ticket-access",
        issuer="tiketa",
        options={"require": ["sub", "ticket_code", "type", "jti", "iat", "exp"]},
    )
    if claims.get("type") != "employee_ticket_access":
        raise jwt.InvalidTokenError("Incorrect token type")
    return claims

