#!/usr/bin/env bash
# scripts/setup-local.sh
# One-command developer onboarding script for Tiketa (macOS / Linux)
# Usage: ./scripts/setup-local.sh

set -euo pipefail

echo ""
echo "========================================================"
echo "   Tiketa — Local Developer Environment Bootstrap      "
echo "========================================================"
echo ""

# 1. Environment file setup
if [ ! -f ".env" ]; then
    echo "[1/5] Creating .env from .env.example..."
    cp .env.example .env
    echo "✓ Created .env file."
else
    echo "[1/5] .env already exists. Skipping."
fi

# 2. Build and start containers
echo ""
echo "[2/5] Starting PostgreSQL 16, Redis 7, and FastAPI Backend..."
docker compose up -d --build

# 3. Apply database migrations
echo ""
echo "[3/5] Applying Alembic database migrations..."
docker compose exec backend alembic upgrade head

# 4. Seed dictionaries and demo data
echo ""
echo "[4/5] Seeding reference dictionaries and demo operations..."
docker compose exec backend python -m scripts.seed_dictionaries
docker compose exec backend python -m scripts.seed_demo_operations

# 5. Frontend setup
echo ""
echo "[5/5] Installing frontend dependencies & compiling Vite build..."
(
    cd frontend
    npm ci
    npm run build
)

echo ""
echo "========================================================"
echo " SETUP COMPLETE! Tiketa is ready for development.       "
echo "========================================================"
echo "Backend API Docs:    http://localhost:8000/docs"
echo "Backend Health:      http://localhost:8000/health/ready"
echo "Terminal Kiosk:      http://localhost:5173/report"
echo "IT Queue:            http://localhost:5173/queue"
echo "Admin Reports:       http://localhost:5173/reports"
echo ""
echo "To start the frontend dev server:"
echo "  cd frontend && npm run dev"
echo ""
