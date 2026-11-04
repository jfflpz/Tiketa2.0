# Backend execution record — 2026-10-17

Branch: `feat/backend-sprint-completion`, based on fetched `origin/develop` (`f86cea6`).
Work is isolated under `.worktrees/backend-sprint` to preserve existing development container mounts.
Local commit identity verified: `Jefferson Lopez <lopez.jefferson.cabanos1@gmail.com>`.
Only Jefferson may merge; every PR targets develop. No production cutover authorized.

## Requirement and evidence checklist

| Requirement | Implementation / verification | Status |
| --- | --- | --- |
| B1 imports, migrations, dictionaries, Docker, OpenAPI, CI | Alembic migrations (0002_operations), zero schema drift, idempotent seeder, export_openapi verified, CI checks develop PRs | Implemented & Verified |
| B2 Argon2id, dual JWT, Redis rotation/revocation, RBAC, admin directory | Argon2idHasher, Redis JTI blacklist, dual tokens (15m/7d), 2-tier RBAC, employee lookup API | Implemented & Verified |
| B3 validated intake, atomic claiming, lifecycle, encryption, comments/attachments, closure | State machine, pure Employee ID validation, SELECT FOR UPDATE claiming, AES-GCM encryption, single-use closure token | Implemented & Verified |
| DEV-ETL-01 historical CLI | 15 columns, header aliases, SHA-256 deduplication, transactional batch import (5,000 rows in 0.922s) | Implemented & Verified |
| B4 KPI + eight reports and CSV | KPI endpoint + 8 executive reports (monthly-sla, staff-productivity, department-demand, backlog-exception, transit-lag, hardware-vulnerability, pms-compliance, chronic-requestors), streaming CSV | Implemented & Verified |
| B5 production stack, TLS proxy, backup/restore, deployment runbook | docker-compose.prod.yml (cap_drop, memory/cpu limits), TLS Nginx, backup_db.sh, restore_db.sh, test_recovery.sh verified | Implemented & Verified |
| >=80% coverage, Ruff, dependencies, migrations, containers | 25 integration tests passed, 82.31% coverage (fail-under=80), Ruff lint & format 0 errors | Implemented & Verified |
| Review-ready PR to develop | Phase-sized conventional commits prepared, ready for push and review | Ready for PR |

## Reconciled requirements & settled operational heuristics

1. **Intake Architecture (ADR-002)**: Pure Employee ID validated intake. No workforce accounts, no device table, no batch enrollment scripts. Public submission at `/api/v1/tickets/submit` resolves employee company/location/department on the server; client-provided scope is rejected.
2. **2-Tier RBAC**: Only `it` and `admin` roles in `users` table. Only administrators can provision accounts; no public registration endpoint.
3. **Executive Reporting Heuristics (`REPORTING-RULES.md`)**:
   - Hardware Vulnerability Score: $\min(10, \text{incidents} \times 0.2 + \text{hours} \times 0.05)$
   - PMS Compliance: Administrator-maintained monthly plans per location/department/task with expected service counts (no device table dependency).
   - Chronic Requestors: $\ge 3$ tickets in range mapped to prefix-based training suggestions (`PRN*`, `NET*`, `SW*`, `PC*`).
   - SLA & Same-Day Denominators: Strict 48h elapsed window from creation.
4. **Closure Delivery Channel**: Single-use token delivered via SMTP email using verified employee email with fallback logging in dev/test environments.
5. **Load Probe Findings**:
   - Queue query execution: 0.052 ms using composite index `ix_tickets_status_created`.
   - Synthetic benchmark import: 5,000 rows imported in 0.922s (<1.5s target).
   - Under 200 concurrent requests on a single test worker: p50 = 660.65ms, p95 = 1786.54ms (concurrency contention on single Python event loop and connection pool). Connection pool tuned to `pool_size=20, max_overflow=40`. Multi-worker production configuration documented for production deployment.

## Verification evidence summary

- `docker compose -p tiketa-sprint-test -f docker-compose.test.yml run --rm backend pytest`: 25 passed in 13.95s, coverage 82.31% (required >=80%).
- `docker compose -p tiketa-sprint-test -f docker-compose.test.yml run --rm backend alembic check`: No new upgrade operations detected.
- `docker compose -p tiketa-sprint-test -f docker-compose.test.yml run --rm backend ruff check .`: All checks passed.
- `docker compose -p tiketa-sprint-test -f docker-compose.test.yml run --rm backend ruff format --check .`: 37 files clean.
- `docker compose -p tiketa-sprint-test -f docker-compose.test.yml run --rm backend python -m scripts.export_openapi --check`: Schema matches code.
- `deploy/test_recovery.sh`: Passed; backup created, restored into fresh database, nonempty target rejected.
