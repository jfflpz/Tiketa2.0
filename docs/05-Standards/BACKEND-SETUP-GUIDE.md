# Tiketa 2.0 — Backend Developer Setup & Onboarding Guide

This guide provides step-by-step instructions for developers setting up and running the Tiketa 2.0 FastAPI backend. It covers prerequisites, environment configuration, database migration, demo seeding, and an exhaustive troubleshooting checklist for common onboarding hurdles.

---

## 📋 System Requirements & Prerequisites

Before configuring the backend, ensure your workstation meets the following prerequisites:

| Requirement | Minimum Version | Verification Command | Notes |
| :--- | :--- | :--- | :--- |
| **Python** | `3.12.x` (64-bit) | `python --version` | Python 3.12 is required for type annotations and `asyncpg`/`greenlet` binary wheels. |
| **pip** | `24.0+` | `python -m pip --version` | Upgrade using `python -m pip install --upgrade pip`. |
| **Docker Desktop** | `24.0+` & Compose v2 | `docker compose version` | Required to host PostgreSQL 16 Alpine and Redis 7 Alpine containers. |
| **Git** | `2.40+` | `git --version` | Recommended core.autocrlf: `false` or `input` to prevent bash script CRLF corruptions. |
| **PowerShell** | `5.1+` / `7+` (Windows) | `$PSVersionTable.PSVersion` | Run scripts with process execution policy bypass when activating venvs. |

---

## 🚀 Setup Workflows

Choose the workflow that matches your development objective:

- **Option A (Recommended for Active Development)**: **Hybrid Local Setup** — PostgreSQL 16 and Redis 7 run inside lightweight Docker containers, while FastAPI runs directly on your host machine inside a Python virtual environment (`.venv`). This offers instant hot-reloading, simple IDE debugging, and native terminal execution.
- **Option B (Full Containerization)**: **Full Docker Compose Setup** — PostgreSQL, Redis, and FastAPI run completely inside Docker containers.

---

### Option A: Hybrid Local Setup (Recommended)

#### Step 1: Start PostgreSQL and Redis via Docker
From the repository root (`Tiketa/`):
```powershell
# Windows PowerShell
docker compose up -d db redis
```
```bash
# macOS / Linux
docker compose up -d db redis
```
Verify the containers are healthy:
```powershell
docker compose ps
# Both tiketa-postgres (port 5432) and tiketa-redis (port 6379) should show Status: Up (healthy)
```

#### Step 2: Configure Local Backend Environment
Navigate into the `backend/` directory:
```powershell
cd backend
```
Copy the local environment template to create `backend/.env`:
```powershell
# Windows PowerShell
Copy-Item .env.example .env
```
```bash
# macOS / Linux
cp .env.example .env
```

> [!IMPORTANT]
> **Host vs. Docker Networking**: Notice that in `backend/.env`, `DATABASE_URL` and `REDIS_URL` point to `localhost:5432` and `localhost:6379`. Do **not** use `db` or `tiketa-postgres` here because the Python process running on your host cannot resolve Docker internal container DNS names.

Ensure your `backend/.env` has valid security keys:
```ini
# backend/.env
PROJECT_NAME="Tiketa 2.0"
ENVIRONMENT="development"
DEBUG=True

SECRET_KEY="tiketa_dev_secret_key_change_in_production_min_64_characters_long_12345"
APP_FIELD_ENCRYPTION_KEY="IQsktTIX7ErdFDnCWcjs41B7zJcaLX71PejokEDYlWM="
JWT_ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_DB=tiketa_db
POSTGRES_USER=tiketa_user
POSTGRES_PASSWORD=tiketa_super_secure_password_2026!
DATABASE_URL=postgresql+asyncpg://tiketa_user:tiketa_super_secure_password_2026!@localhost:5432/tiketa_db

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://localhost:6379/0

CORS_ORIGINS=["http://localhost:5173", "http://localhost:8000", "http://localhost", "http://127.0.0.1:5173"]
```

#### Step 3: Create & Activate Python Virtual Environment
Inside `backend/`:
```powershell
# Windows PowerShell
python -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```
```bash
# macOS / Linux
python3 -m venv .venv
source .venv/bin/activate
```

Verify your active Python path points to `.venv`:
```powershell
# Windows PowerShell
Get-Command python | Select-Object -ExpandProperty Source
```
```bash
# macOS / Linux
which python
```

#### Step 4: Install Dependencies
```powershell
python -m pip install --upgrade pip
pip install -r requirements-dev.txt
python -m pip check
```

#### Step 5: Run Database Migrations
Run Alembic from the `backend/` directory (where `alembic.ini` is located):
```powershell
alembic upgrade head
```
Expected output:
```text
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade  -> 0001_baseline, baseline schema
```

#### Step 6: Seed Dictionaries & Demo Operations
Populate terminal locations, departments, and realistic demo tickets & user accounts:
```powershell
# 1. Seed base dictionaries (Companies, Terminals, Departments, IT Tasks)
python -m scripts.seed_dictionaries

# 2. Seed comprehensive demo tickets, technicians, and verified employees
python -m scripts.seed_demo_operations
```

#### Step 7: Launch FastAPI Development Server
```powershell
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
You should see:
```text
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Application startup complete.
```

---

### Option B: Full Docker Compose Setup

If you prefer to run everything in Docker without installing Python locally:

#### Step 1: Configure Root Environment
From the repository root (`Tiketa/`):
```powershell
# Windows PowerShell
Copy-Item .env.example .env
```
```bash
# macOS / Linux
cp .env.example .env
```

#### Step 2: Build and Start Containers
```powershell
docker compose up -d --build
```

#### Step 3: Run Database Migrations & Seeds Inside the Container
```powershell
# Run Alembic migrations
docker compose exec backend alembic upgrade head

# Seed dictionaries and demo data
docker compose exec backend python -m scripts.seed_dictionaries
docker compose exec backend python -m scripts.seed_demo_operations
```

---

## 🔑 Built-in Demo Credentials & Test IDs

Running `python -m scripts.seed_demo_operations` provisions the following accounts:

### 1. Authenticated IT & Admin Accounts
| Role | Username | Password | Email | Access |
| :--- | :--- | :--- | :--- | :--- |
| **System Administrator** | `admin` | `Tiketa2026!Pass` | `admin@fivestar.com.ph` | Full access (`/dashboard`, `/reports`, `/teams`, `/queue`) |
| **IT Support Specialist** | `technician` | `Tiketa2026!Pass` | `technician@fivestar.com.ph` | Queue triage, claiming (`c`), walk-in hotkey (`v`) |

### 2. Verified Terminal Employee IDs for Kiosk (`/report`)
Terminal employees do **not** use passwords. Entering any of the following Employee IDs auto-verifies their identity and locks their Location & Department:

| Employee ID | Name | Company | Terminal Location | Department |
| :--- | :--- | :--- | :--- | :--- |
| `FS-1042` | Maria Santos | Five Star | Pasay (`PSY`) | Cashiering (`CASH`) |
| `FS-1088` | Juan Dela Cruz | Five Star | Pasay (`PSY`) | Operations (`OPS`) |
| `FS-1092` | Roberto D. Garcia | Five Star | Pasay (`PSY`) | Maintenance (`MAINT`) |
| `FS-2015` | Ricardo Ramos | Five Star | Caloocan (`CAL`) | Cashiering (`CASH`) |
| `FS-3011` | Grace P. Mendoza | Five Star | Cubao (`CMA`) | Cashiering (`CASH`) |
| `FS-5012` | Nestor V. Macaraeg | Five Star | Bataan (`BTM`) | Operations (`OPS`) |

---

## 🧪 Verification & Health Check Gate

Verify your setup is 100% operational:

### 1. Check Service Readiness
Open in browser or test via curl:
```powershell
# Windows PowerShell
Invoke-RestMethod -Uri "http://localhost:8000/health/ready"
```
```bash
# macOS / Linux
curl -s http://localhost:8000/health/ready
```
**Expected Response**:
```json
{
  "status": "ready",
  "database": "connected",
  "migration_version": "0001_baseline",
  "redis": "connected"
}
```

### 2. Check Swagger Interactive API Docs
Open your browser to:
- **Interactive OpenAPI Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Alternative ReDoc UI**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

### 3. Run Automated Sanity Tests
From the `backend/` directory with `.venv` active:
```powershell
pytest -q tests/test_health.py
```
All health and readiness tests should pass green.

---

## 🛠️ Troubleshooting & Common Gotchas

### 1. `socket.gaierror: [Errno 11001] getaddrinfo failed` or connection refused
- **Cause**: Your `DATABASE_URL` or `REDIS_URL` in `backend/.env` is set to container hostnames like `db` or `tiketa-postgres`.
- **Solution**: Change `POSTGRES_SERVER` and `REDIS_HOST` to `localhost` in `backend/.env`. Docker container hostnames only resolve inside the Docker bridge network, not on your host machine.

### 2. `ValidationError: APP_FIELD_ENCRYPTION_KEY Field required`
- **Cause**: You ran `uvicorn` or `alembic` from the root directory or without a `.env` in `backend/`. Pydantic Settings reads `.env` relative to the current working directory.
- **Solution**: Make sure `backend/.env` exists (`Copy-Item backend/.env.example backend/.env`) and run commands from the `backend/` directory.

### 3. `ValueError: APP_FIELD_ENCRYPTION_KEY must decode to 32 bytes`
- **Cause**: The key in `.env` is plain text or does not decode to exactly 32 raw bytes under base64 decoding.
- **Solution**: Generate a valid 32-byte base64 encryption key using Python:
  ```powershell
  python -c "import secrets,base64; print(base64.b64encode(secrets.token_bytes(32)).decode())"
  ```
  Paste the output into `APP_FIELD_ENCRYPTION_KEY` in `backend/.env`.

### 4. PowerShell `File ... cannot be loaded because running scripts is disabled`
- **Cause**: Windows PowerShell restricts execution of un-signed scripts by default.
- **Solution**: Run this in your current PowerShell session before activating:
  ```powershell
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  .\.venv\Scripts\Activate.ps1
  ```

### 5. `ModuleNotFoundError: No module named 'scripts'`
- **Cause**: You ran `python -m scripts.seed_demo_operations` from the root `Tiketa/` directory instead of `Tiketa/backend/`.
- **Solution**: `cd backend` before running any `python -m scripts.*` or `alembic` commands.

### 6. `asyncpg.exceptions.InvalidPasswordError: password authentication failed`
- **Cause**: The PostgreSQL credentials in `backend/.env` do not match the credentials used when the Docker volume was initially initialized.
- **Solution**:
  1. Inspect the credentials in your root `.env` or `docker-compose.yml`.
  2. If you changed `.env` after first starting the container, the PostgreSQL data volume retains the old credentials. Reset the local development database volume:
     ```powershell
     docker compose down -v
     docker compose up -d db redis
     alembic upgrade head
     python -m scripts.seed_demo_operations
     ```

### 7. Port Conflicts (`Port 5432 or 6379 already in use`)
- **Cause**: A local instance of PostgreSQL or Redis is running as a Windows/system service on your host machine.
- **Solution**: Stop the local host service via Windows Services (`services.msc`), or change the host port mapping in `docker-compose.yml` (e.g. `"5433:5432"`) and update `POSTGRES_PORT=5433` in `backend/.env`.
