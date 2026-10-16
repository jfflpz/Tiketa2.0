# Tiketa 2.0 — In-Repository AI Context Router

This document serves as the primary routing guide for developers and AI agents working in this repository.

---

## 1. System Topology & Tech Stack
- **Backend Tier**: Python 3.12+ (FastAPI, SQLAlchemy 2.0 Async, AsyncPG, Pydantic v2, Redis 7, Pandas)
- **Frontend Tier**: React 18/19 SPA (Vite, Strict TypeScript 5+, TailwindCSS, Zustand, Recharts, Lucide Icons)
- **Database Tier**: PostgreSQL 16 Alpine (12 normalized tables) + Redis 7 Alpine
- **Containerization**: Docker Compose (`tiketa-backend`, `tiketa-postgres`, `tiketa-redis`)

---

## 2. Context Navigation Pointers
Direct your search to these targeted documentation modules:
- **System Architecture & Auth**: `docs/01-Architecture/SYSTEM-ARCHITECTURE.md`
- **Database Schema & 15 Canonical Fields**: `docs/02-Database/DATA-DICTIONARY.md`
- **REST API Contracts**: `docs/03-Contracts/OPENAPI-CONTRACTS.md`
- **Active Sprints**: `docs/04-Sprints/SPRINT-BOARD.md`
  - Master Engineering Plan: `docs/04-Sprints/MASTER-SPRINT-PLAN.md`
  - Backend Track: `docs/04-Sprints/BACKEND-SPRINT-PLAN.md`
  - Frontend Track: `docs/04-Sprints/FRONTEND-SPRINT-PLAN.md`
- **Git Rebase & Standards**: `docs/05-Standards/GIT-REBASE-WORKFLOW.md`

---

## 3. Account & Ticket Intake Architecture
1. **Public/Intranet Intake (`/report`)**:
   - Employees input their **Employee ID No.** (e.g. `FS-1042`).
   - Backend auto-fetches verified profile from `employees` table and **hard-locks Location and Department**.
   - Employee taps 1 of 6 visual category buttons and submits.
2. **IT Fallback Intake (Hotkey `v`)**:
   - Technicians on the IT Queue (`/queue`) tap hotkey `v` to log walk-in or Viber requests in <4 seconds.
3. **Authenticated Roles**:
   - `admin`: System management, employee directory, 8 executive reports.
   - `it`: IT triage queue (`/queue`), ticket claiming (`c`), labor duration logging.
