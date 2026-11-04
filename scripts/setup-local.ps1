# scripts/setup-local.ps1
# One-command developer onboarding script for Tiketa
# Usage: .\scripts\setup-local.ps1

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   Tiketa - Local Developer Environment Bootstrap      " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Environment file setup
if (-not (Test-Path ".env")) {
    Write-Host "[1/5] Creating .env from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "[OK] Created .env file." -ForegroundColor Green
}
else {
    Write-Host "[1/5] .env already exists. Skipping." -ForegroundColor Gray
}

# 2. Build and start container infrastructure
Write-Host ""
Write-Host "[2/5] Starting PostgreSQL 16, Redis 7, and FastAPI Backend..." -ForegroundColor Yellow
docker compose up -d --build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker Compose failed to start containers."
    exit 1
}
Write-Host "[OK] Containers started." -ForegroundColor Green

# 3. Apply database migrations
Write-Host ""
Write-Host "[3/5] Applying Alembic database migrations..." -ForegroundColor Yellow
docker compose exec backend alembic upgrade head
if ($LASTEXITCODE -ne 0) {
    Write-Error "Database migration failed."
    exit 1
}
Write-Host "[OK] Database migrations applied." -ForegroundColor Green

# 4. Seed reference dictionaries and demo operational data
Write-Host ""
Write-Host "[4/5] Seeding reference dictionaries and demo operations..." -ForegroundColor Yellow
docker compose exec backend python -m scripts.seed_dictionaries
docker compose exec backend python -m scripts.seed_demo_operations
if ($LASTEXITCODE -ne 0) {
    Write-Error "Database seeding failed."
    exit 1
}
Write-Host "[OK] Reference dictionaries and demo dataset seeded." -ForegroundColor Green

# 5. Frontend dependencies and initial build
Write-Host ""
Write-Host "[5/5] Installing frontend dependencies and compiling Vite build..." -ForegroundColor Yellow
Push-Location frontend
try {
    npm ci
    if ($LASTEXITCODE -ne 0) {
        Write-Error "npm ci failed."
        exit 1
    }
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "npm run build failed."
        exit 1
    }
}
finally {
    Pop-Location
}
Write-Host "[OK] Frontend installed and verified." -ForegroundColor Green

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host " SETUP COMPLETE! Tiketa is ready for development.       " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host "Backend API Docs:    http://localhost:8000/docs"
Write-Host "Backend Health:      http://localhost:8000/health/ready"
Write-Host "Terminal Kiosk:      http://localhost:5173/report"
Write-Host "IT Queue:            http://localhost:5173/queue"
Write-Host "Admin Reports:       http://localhost:5173/reports"
Write-Host ""
Write-Host "To start the frontend dev server:"
Write-Host "  cd frontend; npm run dev" -ForegroundColor Cyan
Write-Host ""
