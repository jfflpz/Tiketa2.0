# Tiketa 2.0 — AI Coding Agent Directives & Operational Invariants

This rule file configures all AI coding assistants (Antigravity, Cursor, Copilot, Claude) working within the **Tiketa** repository.

---

## 1. Primary In-Repository Routing Map
- Always consult `docs/AI-CONTEXT.md` first before designing or modifying code.
- Retrieve only targeted documentation matching the active task (`docs/01-Architecture/`, `docs/02-Database/`, `docs/03-Contracts/`). Do not scan or read the entire repository by default.

---

## 2. Source of Truth & Precedence
1. **Source Code**: Verified, passing repository code (`backend/` and `frontend/`) supersedes historical documentation.
2. **Master SRS**: If architectural ambiguity arises, defer to `docs/03-Contracts/` and the master SRS in ARCH: `01-Projects/Tiketa/SRS.md` (v2.1.0).

---

## 3. Strict Non-Goals & Prohibitions (Ponytail YAGNI Invariants)
- **Zero Web Uploader Scope (ADR-004)**: Strictly DO NOT build or add client-side drag-and-drop Excel/CSV file uploaders in the React UI. All historical log ingestion is strictly executed via the backend developer CLI script (`backend/scripts/seed_historical_logs.py`).
- **Zero Public Self-Registration (ADR-002)**: Public sign-up forms (`/register`, `/signup`) are strictly prohibited.
- **Strict TypeScript Standards**: All frontend code must use strict TypeScript (`.tsx` and `.ts`). Untyped JavaScript (`.jsx` or `.js`) is strictly prohibited.
- **2-Tier RBAC Only**: Authenticated accounts in `users` are strictly reserved for IT Technicians (`role: 'it'`) and Administrators (`role: 'admin'`). General terminal employees submit tickets via `/report` using verified **Employee ID No.** with zero login accounts.

---

## 4. Git & Commit Protocols
- Conventional Commits: `feat(scope): ...`, `fix(scope): ...`, `chore(scope): ...`, `docs(scope): ...`, `test(scope): ...`.
- Protected `main`: Never commit directly to `main`. Create feature branches (`feat/backend-*`, `feat/frontend-*`) and rebase linearly (`git rebase origin/main`).
