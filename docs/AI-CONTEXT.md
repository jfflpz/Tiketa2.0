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
- **System Architecture & Frontend Slices**: `docs/01-Architecture/SYSTEM-ARCHITECTURE.md` (Contains 9-slice Zustand map, component directory topology, and strict async/store invariants)
- **Database Schema & 15 Canonical Fields**: `docs/02-Database/DATA-DICTIONARY.md`
- **REST API Contracts**: `docs/03-Contracts/OPENAPI-CONTRACTS.md`
- **Reporting Business Rules**: `docs/03-Contracts/REPORTING-RULES.md`
- **Active Sprints & Engineering Logs**: `docs/04-Sprints/SPRINT-BOARD.md`
  - Master Engineering Plan: `docs/04-Sprints/MASTER-SPRINT-PLAN.md`
  - Backend Track: `docs/04-Sprints/BACKEND-SPRINT-PLAN.md`
  - Frontend Track: `docs/04-Sprints/FRONTEND-SPRINT-PLAN.md`
- **Git Rebase & Standards**: `docs/05-Standards/GIT-REBASE-WORKFLOW.md`
- **Backend Setup & Developer Onboarding**: `docs/05-Standards/BACKEND-SETUP-GUIDE.md` (Prerequisites, local venv setup, Docker Postgres/Redis, demo seeds & troubleshooting)
- **Backend Operations & Deployment Runbook**: `docs/05-Standards/BACKEND-OPERATIONS.md`

---

## 3. Account & Ticket Intake Architecture
1. **Public/Intranet Intake (`/report`)**:
   - Employees input their **Employee ID No.** (1–50 ASCII digits, e.g. `1042`, preserving leading zeros).
   - Backend auto-fetches verified profile from `employees` table and **hard-locks Location and Department**.
   - Employee taps 1 of 6 visual category buttons and submits.
   - Guarded against rapid-typing race conditions; submission blocked until active ID is verified.
2. **IT Fallback Intake (Hotkey `v`)**:
   - Technicians on the IT Queue (`/queue`) tap hotkey `v` to log walk-in or Viber requests in <4 seconds.
3. **Authenticated Roles**:
   - `admin`: System management, employee directory, 8 executive reports.
   - `it`: IT triage queue (`/queue`), ticket claiming (`c`), labor duration logging.

---

## 4. Frontend State & Navigation Directives for AI Agents
For all frontend modifications, AI agents must consult [`docs/01-Architecture/SYSTEM-ARCHITECTURE.md`](01-Architecture/SYSTEM-ARCHITECTURE.md#4-frontend-modular-state--component-architecture):
1. **Zero Monoliths**: Never expand `src/store/useAppStore.ts` (kept at ~44 lines). Add fields and actions only to their corresponding domain slice in `src/store/slices/`.
2. **Atomic Selectors Only**: Never destructure `useAppStore()`. Use atomic selectors `useAppStore((state) => state.prop)`.
3. **Async Race Guards**: In intake/kiosk forms, guard all async lookups with sequence references and cleanup cancellation flags.
4. **Session Invalidation**: All logout actions must trigger `resetReportsState()` to cancel in-flight analytical queries.
