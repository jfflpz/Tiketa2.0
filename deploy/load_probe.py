"""HTTP latency probe against the disposable backend service only."""
import asyncio
import json
import os
import time

import httpx


async def main():
    if os.environ.get("ENVIRONMENT") != "test":
        raise RuntimeError("Load probe only runs in the disposable test stack")
    async with httpx.AsyncClient(base_url="http://backend:8000", limits=httpx.Limits(max_connections=200, max_keepalive_connections=200), timeout=60) as client:
        login = await client.post("/api/v1/auth/login", json={"username": "benchmark", "password": "disposable-benchmark-password"})
        login.raise_for_status()
        headers = {"Authorization": "Bearer "+login.json()["access_token"]}
        async def request():
            start = time.perf_counter()
            response = await client.get("/api/v1/tickets", headers=headers)
            response.raise_for_status()
            return (time.perf_counter()-start)*1000
        await asyncio.gather(*[request() for _ in range(200)])
        values = []
        for _ in range(5):
            values.extend(await asyncio.gather(*[request() for _ in range(200)]))
        values.sort()
        print(json.dumps({"requests": len(values), "concurrency": 200, "p50_ms": round(values[499], 2), "p95_ms": round(values[949], 2), "target_p95_ms": 100}))


if __name__ == "__main__":
    asyncio.run(main())
