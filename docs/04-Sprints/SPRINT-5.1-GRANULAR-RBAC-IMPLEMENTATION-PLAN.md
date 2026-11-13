# 🛡️ Sprint 5.1: Granular Feature Permissions & Role Overrides Implementation Plan

> **Specification Tags:** `@spec FR-RBAC-04` (Engine & Security) & `@spec UI-TEAM-04` (IT Roster Permissions Checklist)  
> **Status:** 🟡 Approved for Execution (Scheduled for Tomorrow)  
> **Parent Architecture:** [`docs/01-Architecture/TIKETA-2.0-RBAC-FEATURE-PERMISSIONS-PLAN.md`](../01-Architecture/TIKETA-2.0-RBAC-FEATURE-PERMISSIONS-PLAN.md)  
> **Target Branches:** `develop` / `feat/granular-rbac-feature-permissions`  

---

## 🎯 1. Overview & Objective

Connect the existing frontend interactive permissions checklist in `EditITStaffModal.tsx` to a robust, version-controlled backend persistence and runtime permission evaluation engine.

### Core User Story
> *"An IT Intern is assigned to author and update Saved Repair Notes and reference provincial terminal hubs. The administrator opens their profile in the IT Team Roster, ticks 'Create & Edit Saved Repair Guides' and '15 Terminal Hubs Monitor', and saves. Instantly, the intern's session unlocks the 'New Repair Guide' action in the library and the 'Terminal Hubs' view in the sidebar without promoting their base role to full IT Support."*

---

## 📋 2. Standardized Feature Permission Registry

Aligns existing UI checklist keys (`AVAILABLE_PERMISSIONS` in `EditITStaffModal.tsx`) with the backend security engine:

| Canonical Key | UI Display Label | Description | Default Roles |
| :--- | :--- | :--- | :--- |
| `workbench:access` | Assigned Repair Workbench | Access assigned tickets & diagnostic checklists | `intern`, `it`, `admin` |
| `notes:view` | Saved Repair Notes (Read-Only) | Reference published SOP repair guides | `intern`, `it`, `supervisor`, `admin` |
| `notes:edit` | Create & Edit Saved Repair Guides | Author, edit, and publish repair guides & SOPs | `it`, `admin` |
| `tickets:view` | Full Ticket Queues & Dispatch | Access global queue, dispatch boards, unassigned pool | `it`, `admin` |
| `tickets:claim` | Claim Tickets from Pool | Self-assign and claim unassigned terminal tickets | `it`, `admin` |
| `terminals:view` | 15 Terminal Hubs Monitor | Real-time telemetry across 15 provincial hubs | `it`, `supervisor`, `admin` |
| `analytics:view` | Analytics & Operational KPIs | View executive analytics & resolution velocity | `supervisor`, `admin` |
| `reports:export` | Reports & Audit Logs Export | Generate and export official incident reports | `supervisor`, `admin` |
| `team:manage` | IT Team Roster & Directory | Manage staff profiles, assignments, proposals | `supervisor` (read-only), `admin` (full) |

---

## 🏗️ 3. Execution Checklist for Tomorrow

### Phase 1: Backend Persistence & Engine
- [ ] **Alembic Migration (`backend/alembic/versions/0014_users_custom_permissions.py`)**:
  - Down revision: `0013_users_last_username_changed_at`
  - Add `custom_permissions` as `JSONB` on PostgreSQL (`JSON` variant on SQLite), `nullable=False`, `server_default='[]'`.
- [ ] **SQLAlchemy User Model (`backend/app/models/user.py`)**:
  - Map `custom_permissions: Mapped[list[str]]` with JSON/JSONB.
- [ ] **Permission Engine (`backend/app/core/permissions.py`)**:
  - Define `DEFAULT_ROLE_PERMISSIONS: dict[str, set[str]]`.
  - Implement `user_has_permission(user: User, perm: str) -> bool`.
  - Implement `get_effective_permissions(user: User) -> list[str]`.
- [ ] **Pydantic Schemas (`backend/app/schemas.py`)**:
  - Update `UserOut` with `custom_permissions` and `effective_permissions`.
  - Update `UserUpdate` with `custom_permissions: list[str] | None = None`.
- [ ] **FastAPI Dependency Guards (`backend/app/api/deps.py`)**:
  - Implement `require_permission(perm: str)`.
- [ ] **Admin Directory API (`backend/app/api/directory.py`)**:
  - In `update_user`: persist `custom_permissions` and increment `token_version += 1`.
  - In `get_me`: compute and return `effective_permissions`.
- [ ] **Service Gating (`backend/app/services/repair_notes.py`)**:
  - Replace static role check with `user_has_permission(user, "notes:edit")`.

### Phase 2: Frontend Hydration & UI Gating
- [ ] **Permissions Types & Helper (`frontend/src/types/permissions.ts`)**:
  - Export `FeatureKey`, `hasPermission(user, perm)`.
- [ ] **Current User Type (`frontend/src/types/index.ts`)**:
  - Add `custom_permissions?: string[]` and `effective_permissions?: string[]`.
- [ ] **Auth Store (`frontend/src/store/slices/authSlice.ts`)**:
  - Preserve `custom_permissions` and `effective_permissions` into `currentUser`.
- [ ] **Dynamic Allowed Views (`frontend/src/App.tsx`)**:
  - Implement `getEffectiveAllowedViews(currentUser)` to dynamically unlock views (`tickets`, `terminals`, `analytics`, `reports`, `team`) instead of static role fallback.
- [ ] **Dynamic Sidebar Navigation (`frontend/src/components/layout/Sidebar.tsx`)**:
  - Render elevated navigation buttons when `hasPermission(currentUser, key)` is true.
- [ ] **Action Gating (`frontend/src/features/notes/RepairNotesLibraryView.tsx`)**:
  - Replace `currentUser?.role === 'intern'` with `hasPermission(currentUser, 'notes:edit')`.

### Phase 3: Automated Verification
- [ ] Backend test: `pytest backend/tests/test_custom_permissions.py`
- [ ] Frontend type check: `npx tsc --noEmit -p tsconfig.test.json`
- [ ] Frontend test: `npx vitest run --environment jsdom tests/s507AdminGovernance.test.tsx`
- [ ] Full suite test: `npx vitest run --environment jsdom`
