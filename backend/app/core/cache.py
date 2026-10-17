from fastapi import HTTPException
from redis.asyncio import Redis

from app.core.config import settings

cache = Redis.from_url(
    settings.REDIS_URL,
    decode_responses=True,
    socket_connect_timeout=3,
    socket_timeout=3,
)

# Increment and expiry must be atomic, including under worker concurrency.
INCREMENT = """
local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return n
"""


async def rate_limit(key: str, limit: int, seconds: int):
    count = await cache.eval(INCREMENT, 1, "rate:" + key, seconds)
    if count > limit:
        raise HTTPException(
            429, "Rate limit exceeded", headers={"Retry-After": str(seconds)}
        )
