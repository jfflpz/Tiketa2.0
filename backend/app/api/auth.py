import time
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Cookie, HTTPException, Request, Response
from sqlalchemy import func, or_, select
from starlette.concurrency import run_in_threadpool

from app.api.deps import DB, CurrentUser, validated_user
from app.core.cache import INCREMENT, cache
from app.core.config import settings
from app.core.security import (
    digest,
    hash_password,
    hasher,
    issue_token,
    verify_password,
)
from app.models import User
from app.schemas import Login, TokenOut, UserOut

router = APIRouter(prefix="/auth", tags=["Authentication"])
COOKIE_PATH = "/api/v1/auth"
DUMMY_HASH = hash_password("unavailable-user-timing-padding")
ROTATE = """
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
return 1
"""


def set_cookie(response: Response, token: str):
    response.set_cookie(
        "refresh_token",
        token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="strict",
        path=COOKIE_PATH,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )


def check_origin(request: Request):
    origin = request.headers.get("origin")
    if not origin:
        return
    norm_origin = origin.rstrip("/")
    allowed = {o.rstrip("/") for o in settings.CORS_ORIGINS}
    if norm_origin in allowed:
        return
    if settings.ENVIRONMENT == "development":
        from urllib.parse import urlparse

        parsed = urlparse(norm_origin)
        if parsed.hostname in ("localhost", "127.0.0.1", "0.0.0.0", "testserver") or (
            parsed.hostname
            and (
                parsed.hostname.startswith("192.168.")
                or parsed.hostname.startswith("10.")
                or parsed.hostname.startswith("172.")
            )
        ):
            return
    raise HTTPException(403, "Untrusted origin")


@router.post("/login", response_model=TokenOut)
async def login(body: Login, request: Request, response: Response, db: DB):
    check_origin(request)
    keys = [
        "login:ip:" + digest(request.client.host),
        "login:user:" + digest(body.username.lower()),
    ]
    if any(int(value or 0) >= 5 for value in await cache.mget(keys)):
        raise HTTPException(
            429, "Too many failed attempts", headers={"Retry-After": "900"}
        )
    user = await db.scalar(
        select(User).where(
            or_(
                func.lower(User.username) == body.username.lower(),
                func.lower(User.email) == body.username.lower(),
            )
        )
    )
    valid = await run_in_threadpool(
        verify_password, body.password, user.password_hash if user else DUMMY_HASH
    )
    if not valid or not user or not user.is_active:
        for key in keys:
            await cache.eval(INCREMENT, 1, key, 900)
        raise HTTPException(401, "Invalid credentials")
    if not user.password_hash.startswith("$argon2id$") or hasher.check_needs_rehash(
        user.password_hash
    ):
        user.password_hash = await run_in_threadpool(hash_password, body.password)
        await db.commit()
    # Successful logins do not reset IP counters for other accounts.
    await cache.delete(keys[1])
    sid = str(uuid4())
    access, _ = issue_token(user, "access", sid)
    refresh, claims = issue_token(user, "refresh", sid)
    await cache.set(
        "refresh:" + sid, claims["jti"], ex=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400
    )
    set_cookie(response, refresh)
    return TokenOut(access_token=access, user=UserOut.model_validate(user))


@router.post("/refresh", response_model=TokenOut)
async def refresh(
    request: Request,
    response: Response,
    db: DB,
    refresh_token: Annotated[str | None, Cookie()] = None,
):
    check_origin(request)
    if not refresh_token:
        raise HTTPException(401, "Refresh cookie required")
    user, old = await validated_user(refresh_token, "refresh", db)
    new_token, new = issue_token(user, "refresh", old["sid"])
    rotated = await cache.eval(
        ROTATE,
        1,
        "refresh:" + old["sid"],
        old["jti"],
        new["jti"],
        settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )
    if not rotated:
        raise HTTPException(401, "Refresh token already consumed")
    access, _ = issue_token(user, "access", old["sid"])
    set_cookie(response, new_token)
    return TokenOut(access_token=access, user=UserOut.model_validate(user))


@router.post("/logout", status_code=204)
async def logout(request: Request, response: Response, db: DB, user: CurrentUser):
    check_origin(request)
    _, claims = await validated_user(
        request.headers["authorization"].split()[1], "access", db
    )
    async with cache.pipeline(transaction=True) as pipeline:
        pipeline.set(
            "revoked:" + claims["jti"], "1", ex=max(1, claims["exp"] - int(time.time()))
        )
        pipeline.set(
            "session-revoked:" + claims["sid"],
            "1",
            ex=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400 + 900,
        )
        pipeline.delete("refresh:" + claims["sid"])
        await pipeline.execute()
    response.delete_cookie(
        "refresh_token",
        path=COOKIE_PATH,
        httponly=True,
        samesite="strict",
        secure=settings.ENVIRONMENT == "production",
    )


@router.get("/me", response_model=UserOut)
async def me(user: CurrentUser):
    return user
