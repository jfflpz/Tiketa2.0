import logging
from fastapi import HTTPException
from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.core.config import settings

logger = logging.getLogger(__name__)

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

SESSION_MATCHING_STATE = """
local session_id = KEYS[1]
local is_mismatch = tonumber(ARGV[1])

local time = redis.call('TIME')
local now = tonumber(time[1])

local cooldown_key = 'kiosk:session:' .. session_id .. ':cooldown_until'
local mismatch_key = 'kiosk:session:' .. session_id .. ':mismatches'
local level_key = 'kiosk:session:' .. session_id .. ':level'

local cooldown_until = tonumber(redis.call('GET', cooldown_key) or 0)
if now < cooldown_until then
    return {1, cooldown_until - now}
end

if is_mismatch == -1 then
    return {0, 0}
end

if is_mismatch == 0 then
    redis.call('DEL', mismatch_key)
    return {0, 0}
end

local count = redis.call('INCR', mismatch_key)
if count == 1 then
    redis.call('EXPIRE', mismatch_key, 600)
end

local level = tonumber(redis.call('GET', level_key) or 0)
if count >= 5 then
    local duration = (level == 0) and 120 or 600
    redis.call('SETEX', cooldown_key, duration, now + duration)
    redis.call('DEL', mismatch_key)
    if level == 0 then
        redis.call('SETEX', level_key, 1800, 1)
    end
    return {1, duration}
end

return {0, 0}
"""


async def rate_limit(key: str, limit: int, seconds: int):
    try:
        count = await cache.eval(INCREMENT, 1, "rate:" + key, seconds)
        if count > limit:
            raise HTTPException(
                429, "Rate limit exceeded", headers={"Retry-After": str(seconds)}
            )
    except RedisError as e:
        logger.critical(f"Redis rate_limit error: {e}")
        # Allow operation if rate limiter is down to avoid hard total failure


async def check_session_cooldown(session_id: str):
    """Checks if session is currently under matching cooldown before processing."""
    try:
        result = await cache.eval(SESSION_MATCHING_STATE, 1, session_id, -1)
        if result and result[0] == 1:
            retry_after = int(result[1])
            mins = retry_after // 60
            secs = retry_after % 60
            detail = f"Too many failed matching attempts. Please try again in {mins}:{secs:02d}"
            raise HTTPException(
                429, detail=detail, headers={"Retry-After": str(retry_after)}
            )
    except RedisError as e:
        logger.critical(f"Redis session cooldown check error: {e}")


async def record_matching_attempt(session_id: str, is_mismatch: bool):
    """
    Records matching result for session:
    is_mismatch=True increments mismatch count and enforces 2m/10m cooldown on 5th failure.
    is_mismatch=False clears the mismatch count.
    """
    try:
        arg = 1 if is_mismatch else 0
        result = await cache.eval(SESSION_MATCHING_STATE, 1, session_id, arg)
        if result and result[0] == 1:
            retry_after = int(result[1])
            mins = retry_after // 60
            secs = retry_after % 60
            detail = f"Too many failed matching attempts. Please try again in {mins}:{secs:02d}"
            raise HTTPException(
                429, detail=detail, headers={"Retry-After": str(retry_after)}
            )
    except RedisError as e:
        logger.critical(f"Redis session matching attempt error: {e}")

