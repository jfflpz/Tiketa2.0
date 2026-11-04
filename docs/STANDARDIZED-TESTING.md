# Tiketa — Standardized Testing & Pre-PR Quality Guide

This guide documents the exact quality gates enforced by GitHub Actions CI workflows (`backend-ci.yml`, `frontend-ci.yml`, `integration.yml`, and `security-audit.yml`). Running these checks locally ensures your Pull Request passes CI on the first run.

---

## 1. CI Workflow Matrix Comparison

| GitHub Action Step | Local / Container Equivalent Command | Purpose |
| :--- | :--- | :--- |
| **Lint & Format (Backend)** | `docker compose exec backend ruff check backend`<br>`docker compose exec backend ruff format --check backend` | Ensures no lint violations or unformatted code |
| **Repo Context Integrity** | Test existence of `AGENTS.md` and `docs/AI-CONTEXT.md` | Enforces architectural context docs are not deleted |
| **Database Migrations** | `docker compose exec backend alembic upgrade head` | Verifies all Alembic migrations apply cleanly |
| **Backend Test & Coverage** | `docker compose exec -e TIKETA_TEST_DATABASE_URL=... -e TIKETA_TEST_REDIS_URL=... backend pytest -q --cov=app --cov=scripts --cov-report=term-missing --cov-fail-under=80` | Runs tests, verifies $\ge 80\%$ coverage threshold |
| **OpenAPI Drift Check** | `docker compose exec backend python -m scripts.export_openapi --check` | Prevents API route changes without committing `openapi.json` |
| **TypeScript Gate (Frontend)** | `npm run type-check` (in `frontend/`) | Strict TypeScript compiler check without emitting files |
| **Frontend Unit Tests** | `npm test` (in `frontend/`) | Validates all React components, stores, and export utilities |
| **Production Vite Build** | `npm run build` (in `frontend/`) | Verifies production minification and asset bundling |
| **Security Audit (Optional)** | `docker compose exec backend pip-audit -r requirements.txt`<br>`npm audit --audit-level=critical` | Checks dependencies for known CVEs |

---

## 2. Pre-PR Checklist (Manual Steps)

### Backend

From the repository root (`Tiketa/`):

```powershell
# 1. Format code and fix import sorting
docker compose exec backend ruff format .
docker compose exec backend ruff check --fix .

# 2. Verify all Alembic migrations apply
docker compose exec backend alembic upgrade head

# 3. Verify OpenAPI schema is up to date (sync if needed)
docker compose exec backend python -m scripts.export_openapi
docker compose exec backend python -m scripts.export_openapi --check

# 4. Run Pytest with strict coverage gate (>=80%)
docker compose exec -e TIKETA_TEST_DATABASE_URL="postgresql+asyncpg://tiketa_user:tiketa_super_secure_password_2026!@tiketa-postgres:5432/tiketa_test" -e TIKETA_TEST_REDIS_URL="redis://tiketa-redis:6379/15" backend pytest -q --cov=app --cov=scripts --cov-report=term-missing --cov-fail-under=80
```

### Frontend

From the `frontend/` directory (`cd frontend`):

```powershell
# 1. Strict TypeScript check
npm run type-check

# 2. Component & Unit tests
npm test

# 3. Vite production bundle compilation
npm run build
```

---

## 3. Automated One-Command Runner

To run all CI checks in one shot before committing or pushing:

```powershell
.\scripts\pre-pr.ps1
```

Or with execution policy bypass:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\pre-pr.ps1
```

If any check fails, the script immediately halts and points directly to the failing step.
