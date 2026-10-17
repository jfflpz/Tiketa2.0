# Sprint Board & Execution Log

**Project**: Tiketa 2.0  
**Current Milestone**: Sprint 1 (Foundation & Primitives)  
**Specification Baseline**: SRS v2.1.0 (`ARCH/01-Projects/Tiketa/SRS.md`)  
**Status**: In Progress (Frontend Foundation Verified; Backend Foundation Ready for Execution)

---

## 1. Sprint 1 Progress Log

### ✅ Completed: Frontend Foundation & Strict Tooling Setup
- **Date**: 2026-10-16
- **Lead**: Rafael Emmanuel Codiñera
- **Deliverables Completed**:
  - `package.json`: Configured React 18, Strict TypeScript 5+, Tailwind CSS, Zustand, Recharts, and Lucide icons.
  - `tsconfig.json`: Enforced strict compiler rules (`noImplicitAny`, `strictNullChecks`, modern bundler resolution), removed deprecated `baseUrl`, and configured `@/*` relative path mapping.
  - `src/vite-env.d.ts`: Created ambient module declarations for Vite client (`/// <reference types="vite/client" />`), resolving asset and CSS import typing.
  - `vite.config.ts`: Configured Vite dev server on port `5173` with path aliases.
  - `tailwind.config.ts` & `postcss.config.js`: Integrated Five Star corporate brand color tokens (`#DC2626`, `#FBBF24`, `#1E293B`, `#0F172A`).
  - `src/types/index.ts`: Defined TypeScript interface contracts for `Company`, `Location`, `Department`, `EmployeeProfile`, and 2-tier `UserRole` (`'it' | 'admin'`).
  - `src/App.tsx`: Initialized responsive entry view.
  - **Verification**: `npm run type-check` passed with **0 errors**; `npm run build` compiled cleanly in **832ms**.

---

### ⏳ Pending: Backend Foundation & Database Primitives
- **Lead**: Jefferson Lopez
- **Target Deliverables**:
  - `docker-compose.yml`: Multi-container orchestration (`tiketa-backend`, `tiketa-postgres` [16-Alpine], `tiketa-redis` [7-Alpine]).
  - `backend/app/core/config.py`: Pydantic settings loading `.env` configuration.
  - `backend/app/db/session.py`: Async SQLAlchemy 2.0 engine with connection pooling.
  - `backend/app/models/`: Declarative models for `Company`, `Location`, `Department`, `Employee` (for ID auto-lookup), and `User` (2-tier RBAC).
  - `backend/scripts/seed_dictionaries.py`: Data seeder populating the 11 corporate transit fleets, 15 terminal hubs, and 19 operational departments.
  - Verification: `GET /health` responding with HTTP 200.

---

## 2. Multi-Sprint Execution Plan Overview

| Sprint | Focus Area | Key Architectural Objectives |
| :---: | :--- | :--- |
| **Sprint 1** | **Foundation & Second Brain** | Docker Compose stack, PostgreSQL 16 schema, baseline transit seeders, strict TypeScript React frontend. |
| **Sprint 2** | **Auth & Employee Directory** | Argon2id hasher, dual-token JWT (15-min access, 7-day HTTP-Only refresh cookie), Redis revocation blacklist, employee directory lookup (`/api/v1/employees/lookup`). |
| **Sprint 3** | **Core Ticket Engine & Kiosk UI** | Ticket state machine (`OPEN` $\to$ `PROG` $\to$ `RESL` $\to$ `CLSD`), single-click claiming (`c`), IT fallback quick intake modal (`v`), `/report` 6-button kiosk with Employee ID auto-locking, historical CLI seeder (`DEV-ETL-01`). |
| **Sprint 4** | **Executive Analytics Engine** | 8 Standardized executive analytics reports, transit lag disaggregation calculations, streaming CSV exports, Recharts interactive visual widgets. |
| **Sprint 5** | **Production Hardening & Cutover** | Nginx reverse proxy, TLS 1.3, automated daily backup script (`backup_db.sh`), Pasay & Caloocan depot pilot deployment. |
