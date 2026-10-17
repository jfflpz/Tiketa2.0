from contextlib import asynccontextmanager
from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from redis.exceptions import RedisError
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.api import auth, directory, reports, tickets
from app.core.cache import cache
from app.core.config import settings
from app.db.session import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await cache.aclose()
    await engine.dispose()


app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION, lifespan=lifespan)
schema_head = ScriptDirectory.from_config(
    Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
).get_current_head()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH"],
    allow_headers=["Authorization", "Content-Type"],
)
for router in (auth.router, directory.router, tickets.router, reports.router):
    app.include_router(router, prefix=settings.API_V1_STR)


@app.exception_handler(IntegrityError)
async def integrity_error(request: Request, exc: IntegrityError):
    return JSONResponse(
        status_code=409, content={"detail": "Duplicate record or invalid relationship"}
    )


@app.exception_handler(RedisError)
async def redis_error(request: Request, exc: RedisError):
    return JSONResponse(
        status_code=503, content={"detail": "Session service unavailable"}
    )


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
    }


@app.get("/health/ready", tags=["Health"])
async def ready():
    try:
        async with engine.connect() as connection:
            revision = await connection.scalar(
                text("SELECT version_num FROM alembic_version")
            )
            if revision != schema_head:
                return JSONResponse(
                    status_code=503, content={"status": "migration required"}
                )
        await cache.ping()
    except Exception:
        return JSONResponse(status_code=503, content={"status": "unavailable"})
    return {"status": "ready"}


@app.get(f"{settings.API_V1_STR}/ping", tags=["Diagnostics"])
async def ping():
    return {"ping": "pong"}
