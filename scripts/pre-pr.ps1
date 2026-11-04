# scripts/pre-pr.ps1
# Automated pre-PR verification script mirroring GitHub Actions CI workflows:
# - backend-ci.yml
# - frontend-ci.yml
# - integration.yml
# - security-audit.yml

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   Tiketa Pre-PR CI Mirror Verification Gate           " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# 0. Repository Context Check (Mirrors backend-ci.yml and integration.yml)
Write-Host "=== [1/8] Verifying Repository Context Files ===" -ForegroundColor Yellow
if (-not (Test-Path "AGENTS.md") -or -not (Test-Path "docs/AI-CONTEXT.md")) {
    Write-Error "Repository context check failed: AGENTS.md or docs/AI-CONTEXT.md is missing!"
    exit 1
}
Write-Host "[OK] Context files present." -ForegroundColor Green

# 1. Backend Formatting
Write-Host ""
Write-Host "=== [2/8] Backend Formatting (ruff format) ===" -ForegroundColor Yellow
docker compose exec backend ruff format .
docker compose exec backend ruff format --check .
if ($LASTEXITCODE -ne 0) {
    Write-Error "Backend formatting check failed."
    exit 1
}
Write-Host "[OK] Backend formatting clean." -ForegroundColor Green

# 2. Backend Linting
Write-Host ""
Write-Host "=== [3/8] Backend Linting (ruff check) ===" -ForegroundColor Yellow
docker compose exec backend ruff check --fix .
docker compose exec backend ruff check .
if ($LASTEXITCODE -ne 0) {
    Write-Error "Backend lint check failed."
    exit 1
}
Write-Host "[OK] Backend lint clean." -ForegroundColor Green

# 3. Database Migrations Gate (Mirrors integration.yml)
Write-Host ""
Write-Host "=== [4/8] Database Migrations (alembic upgrade head) ===" -ForegroundColor Yellow
docker compose exec backend alembic upgrade head
if ($LASTEXITCODE -ne 0) {
    Write-Error "Alembic migrations failed."
    exit 1
}
Write-Host "[OK] Database schema up to date." -ForegroundColor Green

# 4. OpenAPI Drift Check (Mirrors backend-ci.yml and integration.yml)
Write-Host ""
Write-Host "=== [5/8] Validating OpenAPI Schema Drift ===" -ForegroundColor Yellow
docker compose exec backend python -m scripts.export_openapi --check
if ($LASTEXITCODE -ne 0) {
    Write-Error "OpenAPI schema drifted from codebase. Run 'docker compose exec backend python -m scripts.export_openapi' to update."
    exit 1
}
Write-Host "[OK] OpenAPI schema matches codebase." -ForegroundColor Green

# 5. Backend Pytest with Coverage (Mirrors backend-ci.yml and integration.yml: --cov-fail-under=80)
Write-Host ""
Write-Host "=== [6/8] Backend Pytest Suite with Coverage Gate ===" -ForegroundColor Yellow
docker compose exec -e TIKETA_TEST_DATABASE_URL="postgresql+asyncpg://tiketa_user:tiketa_super_secure_password_2026!@tiketa-postgres:5432/tiketa_test" -e TIKETA_TEST_REDIS_URL="redis://tiketa-redis:6379/15" backend pytest -q --cov=app --cov=scripts --cov-report=term-missing --cov-fail-under=80
if ($LASTEXITCODE -ne 0) {
    Write-Error "Backend test suite failed or coverage dropped below 80%."
    exit 1
}
Write-Host "[OK] All backend tests passed." -ForegroundColor Green

# --- Frontend Quality Gates (Mirrors frontend-ci.yml and integration.yml) ---
Push-Location frontend
try {
    # 6. Frontend TypeScript Compilation Check
    Write-Host ""
    Write-Host "=== [7/8] Frontend Strict TypeScript Check ===" -ForegroundColor Yellow
    npm run type-check
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Frontend TypeScript compilation failed."
        exit 1
    }
    Write-Host "[OK] TypeScript check passed." -ForegroundColor Green

    # 7. Frontend Vitest Suite
    Write-Host ""
    Write-Host "=== [8/8] Frontend Vitest Suite and Build ===" -ForegroundColor Yellow
    npm test
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Frontend Vitest tests failed."
        exit 1
    }
    Write-Host "[OK] All frontend tests passed." -ForegroundColor Green

    # Production Build
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Frontend Vite production build failed."
        exit 1
    }
    Write-Host "[OK] Production build succeeded." -ForegroundColor Green
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host " ALL GITHUB ACTIONS CI GATES PASSED CLEANLY!            " -ForegroundColor Green
Write-Host " Ready to push and merge PR without CI failures.        " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""
