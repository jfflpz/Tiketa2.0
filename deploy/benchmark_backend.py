"""Record reproducible synthetic import/query measurements on the test stack only."""
import asyncio
import json
import os
import tempfile
import time
from uuid import uuid4
from pathlib import Path

import pandas as pd
from sqlalchemy import select, text
from sqlalchemy.engine import make_url

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models import User
from scripts.seed_dictionaries import seed
from scripts.seed_historical_logs import import_file


async def main():
    if not (make_url(os.environ.get("TIKETA_TEST_DATABASE_URL", "")).database or "").endswith("_test"):
        raise RuntimeError("Only an explicit disposable test database is allowed")
    await seed(demo=True)
    async with AsyncSessionLocal() as db:
        if not await db.scalar(select(User).where(User.username == "benchmark")):
            db.add(User(username="benchmark", email="benchmark@example.com", full_name="Benchmark", role="it", password_hash=hash_password("disposable-benchmark-password")))
            await db.commit()
    run_id = uuid4().hex[:8]
    rows = [{"Company": "FS", "Mode": "REM", "Department": "CASH", "Requestor": f"Benchmark {run_id} {index}", "Task": "PRN-TS", "Description": "Synthetic printer repair benchmark",
             "Month": "August 2026", "Date started": "2026-08-01", "Time Started": "10:00:00", "Time Finished": "11:00:00", "Duration": 1,
             "Date finished": "2026-08-03", "Status": "RESL", "Location": "PSY", "Worked by": "benchmark"} for index in range(5000)]
    with tempfile.TemporaryDirectory() as temporary:
        path = Path(temporary)/"benchmark.csv"
        pd.DataFrame(rows).to_csv(path, index=False)
        started = time.perf_counter()
        imported = await import_file(path)
        elapsed = time.perf_counter()-started
    async with AsyncSessionLocal() as db:
        await db.execute(text("ANALYZE tickets"))
        plans = {}
        for name, query in {
            "queue": "SELECT * FROM tickets WHERE status IN ('OPEN','PROG') ORDER BY created_at LIMIT 50",
            "report_window": "SELECT count(*), avg(duration) FROM tickets WHERE date_started BETWEEN '2026-08-01' AND '2026-08-31'",
            "pms_window": "SELECT count(*) FROM tickets WHERE date_finished BETWEEN '2026-08-01' AND '2026-08-31' AND task_code IN ('PC-PMS','PRN-PMS')",
        }.items():
            plans[name] = [row[0] for row in await db.execute(text("EXPLAIN (ANALYZE, BUFFERS) " + query))]
    print(json.dumps({"rows": 5000, "import_seconds": round(elapsed, 3), "result": imported, "query_plans": plans}, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
