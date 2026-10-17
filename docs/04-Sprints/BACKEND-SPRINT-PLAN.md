# Backend sprint plan — reconciled 2026-10-17

Scope: Employee ID intake, it/admin RBAC, backend-only historical CLI, eight reports,
and operational readiness. Source: current API contracts and SRS v2.1 amendment.
See BACKEND-PROGRESS.md for evidence and remaining release gates; this plan is not
proof of implementation. No device enrollment, device cookies/table, branch login,
public registration, historical web uploader, or frontend changes.

| Phase | Requirements | Deliverables and acceptance |
| --- | --- | --- |
| B1 Foundation | B1.0–B1.5 | Importable FastAPI; explicit Alembic schema; 11/15/19 dictionaries plus 13 tasks; idempotent seeding; Docker health; actual OpenAPI; develop-targeted CI |
| B2 Identity/intake | B2.1–B2.6 | Argon2id 64 MiB/3/4; legacy bcrypt upgrade; 15-minute JWT; seven-day HttpOnly refresh rotation; Redis revocation; admin provisioning; verified employee lookup and scope validation; login/lookup rate limits |
| B3 Workflows/import | B3.1–B3.5 | Public submit and IT quick intake; unique codes and concurrent claims; OPEN→PROG→RESL→CLSD; UTC labor timestamps and canonical calendar fields; AES-GCM; comments/evidence; single-use closure tokens and 72-hour admin override; validated/dry-run/idempotent historical CLI |
| B4 Analytics | B4.1–B4.3 | KPI plus monthly SLA, staff productivity, department demand, backlog, transit lag, hardware risk, PMS service-plan coverage, chronic requestors; authorized CSV; known-result and boundary tests; measured indexes |
| B5 Operations | B5.1–B5.5 | Non-root production image; isolated DB/cache; TLS proxy; backup and restore validation; deploy/rollback/recovery runbook; >=80% coverage and CI |

The former Solution 4 items B2.3–B2.5 and B3.2 are superseded by employee-directory
validation and `/api/v1/tickets/submit`. They must not be implemented. The former
fixed table count is superseded by the actual normalized migration schema. PMS plans
represent expected services, not enrolled devices. Report formulas and policy
choices are defined in ../03-Contracts/REPORTING-RULES.md and mirrored to the SRS.

All feature work starts from develop; all PRs target develop. Only Jefferson Lopez
may merge. No force-push, protected-branch write, release promotion, or production
cutover is authorized by this sprint implementation request.

Verification must include PostgreSQL 16, Redis 7, migrations/drift, seeds, API and
RBAC tests, concurrency, reports, import and actual recovery. Do not equate local
checks with production acceptance or a successful admin merge.