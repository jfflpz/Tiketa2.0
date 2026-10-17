from typing import Annotated
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import cache
from app.core.security import decode_token
from app.db.session import get_db
from app.models import User

DB = Annotated[AsyncSession, Depends(get_db)]
bearer = HTTPBearer(auto_error=False)


async def validated_user(token: str, kind: str, db: AsyncSession):
    try:
        claims = decode_token(token, kind)
        user_id = UUID(claims["sub"])
    except (jwt.InvalidTokenError, ValueError, TypeError, KeyError):
        raise HTTPException(401, "Invalid or expired credentials") from None
    if await cache.exists(
        "revoked:" + claims["jti"], "session-revoked:" + claims["sid"]
    ):
        raise HTTPException(401, "Session revoked")
    user = await db.get(User, user_id)
    if (
        not user
        or not user.is_active
        or user.role not in ("it", "admin")
        or user.token_version != claims["ver"]
    ):
        raise HTTPException(401, "Account unavailable or credentials changed")
    return user, claims


async def current_user(
    db: DB, auth: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]
):
    if not auth:
        raise HTTPException(
            401, "Authentication required", headers={"WWW-Authenticate": "Bearer"}
        )
    return (await validated_user(auth.credentials, "access", db))[0]


CurrentUser = Annotated[User, Depends(current_user)]


async def administrator(user: CurrentUser):
    if user.role != "admin":
        raise HTTPException(403, "Administrator required")
    return user


Admin = Annotated[User, Depends(administrator)]
