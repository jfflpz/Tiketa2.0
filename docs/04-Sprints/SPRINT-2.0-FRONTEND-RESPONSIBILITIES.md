# 🎨 Sprint 2.0: Frontend Track Responsibilities

**Sprint:** Sprint 2.0 — End-to-End State Sync & 4-Tier RBAC Architecture  
**Owner:** Frontend Engineering  
**Master Plan:** [`SPRINT-2.0-SYNC-AND-4TIER-RBAC-PLAN.md`](SPRINT-2.0-SYNC-AND-4TIER-RBAC-PLAN.md)  
**Specification:** [`docs/audit-and-rbac-spec.md`](../audit-and-rbac-spec.md)  
**Status:** Planned  

---

## 1. Ownership & Scope

The Frontend Track owns client state management, UI components, layout navigations, route guards, API clients, and accessibility across `frontend/src/`.

### Key Responsibilities
1. Synchronize TypeScript interfaces (`StaffRole = 'intern' | 'it' | 'analyst' | 'admin'`) and client DTO contracts.
2. Fix state rollback bug by wiring `resolveTicket` mutation directly to `ticketsApi.updateStatus`.
3. Eliminate duplicate/purged tickets in `ticketQueueSlice` by matching authoritative server UUIDs.
4. Redesign `Sidebar.tsx` to provide 4 distinct, role-tailored navigation sets with zero category duplicates.
5. Enforce strict route resolution and security guards in `App.tsx` (`ROLE_ALLOWED_VIEWS`).
6. Enforce that the **IT Intern** cannot access `/tickets` and strictly views only tickets assigned to them on the Active Workbench.
7. Build `EditITStaffModal.tsx` and `EditEmployeeModal.tsx` and wire soft-deactivation in `TeamAdministrationView.tsx`.
8. Update `StaffLoginModal.tsx` with a 4-role switcher for seamless testing and demonstration.

---

## 2. Detailed Task Breakdown

### Task F-01: Synchronize TypeScript Types & API Client Contracts
- **Files:** `frontend/src/types/index.ts`, `frontend/src/store/slices/uiSlice.ts`, `frontend/src/api/client.ts`
- **Actions:**
  - Update `StaffRole`:
    ```typescript
    export type StaffRole = 'intern' | 'it' | 'analyst' | 'admin';
    ```
  - Update `AdminUserItem` in `client.ts`:
    ```typescript
    export interface AdminUserItem {
      id: string;
      username: string;
      email: string;
      full_name: string;
      role: StaffRole;
      is_active: boolean;
    }
    ```
  - Add API client methods to `directoryApi`:
    ```typescript
    updateAdminUser: async (id: string, payload: Partial<AdminUserItem> & { password?: string }): Promise<AdminUserItem> => {
      const res = await apiClient.patch<AdminUserItem>(`/admin/users/${id}`, payload);
      return res.data;
    },
    deactivateAdminUser: async (id: string): Promise<AdminUserItem> => {
      const res = await apiClient.patch<AdminUserItem>(`/admin/users/${id}`, { is_active: false });
      return res.data;
    },
    updateAdminEmployee: async (id: string, payload: Partial<AdminEmployeeItem>): Promise<AdminEmployeeItem> => {
      const res = await apiClient.put<AdminEmployeeItem>(`/admin/employees/${id}`, payload);
      return res.data;
    },
    deactivateAdminEmployee: async (id: string): Promise<AdminEmployeeItem> => {
      const res = await apiClient.put<AdminEmployeeItem>(`/admin/employees/${id}`, { is_active: false });
      return res.data;
    },
    ```
- **Acceptance Criteria:** `npm run type-check` passes with zero type mismatch errors.

---

### Task F-02: Wire `resolveTicket` to Backend Persistence (RCA-3)
- **File:** `frontend/src/store/slices/ticketOperationsSlice.ts`
- **Actions:**
  - Refactor `resolveTicket` in `ticketOperationsSlice.ts` from a client-side mock to an async mutation calling `updateTicketStatusApi`:
    ```typescript
    resolveTicket: async (ticketId: string) => {
      const target = get().tickets.find((t) => t.id === ticketId);
      if (!target) return;
      
      // Execute authoritative backend mutation
      await get().updateTicketStatusApi(
        ticketId, 
        'RESL', 
        target.mode, 
        target.diagnosedTaskCode || target.taskCode
      );
    },
    ```
  - Ensure all call-sites (`JobLogDrawer.tsx`, `TicketListsView.tsx`, `TicketQueueKanbanBoard.tsx`, `TicketQueueTable.tsx`, `ITWorkbenchBoardView.tsx`) trigger this mutation.
  - When the mutation completes, verify the ticket is updated to `RESL` in backend PostgreSQL so 15s polling does NOT roll back the status!
- **Acceptance Criteria:** Clicking "Mark Resolved" on a ticket turns it to `RESL`, sets `date_finished` / `time_finished`, and survives page reload without reverting to `PROG`.

---

### Task F-03: Queue State Synchronization & Intake Reconciliation (RCA-1 & RCA-2)
- **Files:** `frontend/src/store/slices/publicIntakeSlice.ts`, `frontend/src/store/slices/ticketQueueSlice.ts`, `frontend/src/features/overview/ITOverviewDashboard.tsx`
- **Actions:**
  - In `publicIntakeSlice.ts`:
    - When `submitPublicTicket` returns with `res.id`, assign the authoritative UUID:
      ```typescript
      id: res.id, // Authoritative UUID from backend
      ticketCode: res.ticket_code,
      ```
  - In `ticketQueueSlice.ts`:
    - Update `fetchQueueApi` merging logic to match on `m.id || m.ticketCode`, preserving local client state while adopting server updates.
  - In `ITOverviewDashboard.tsx`:
    - Make the **Open Pool KPI pill** clickable, routing directly to `/tickets` with the `OPEN` filter pre-selected so technicians can immediately claim new tickets.
- **Acceptance Criteria:** Submitting a ticket on the Kiosk immediately reflects in the IT Dashboard queue upon the next poll without requiring manual page reload or clearing cache.

---

### Task F-04: Role-Tailored Navigation Menu in `Sidebar.tsx`
- **File:** `frontend/src/components/layout/Sidebar.tsx`
- **Actions:**
  - Implement 4 distinct navigation layouts based on `currentUser?.role`:
    1. **`intern` (Intern / Part-time):**
       - **MY DASHBOARD:** KPI Overview (`/overview`)
       - **ACTIVE WORKBENCH:** My Assigned Workbench (`/workbench`)
       - **KNOWLEDGE & LOGS:** Saved Repair Notes (`/notes`), My Job Logs (`/joblogs`)
       - *(Completely hide `/tickets`, `/terminals`, `/analytics`, `/reports`, `/team`).*
    2. **`it` (IT Support Specialist):**
       - **MY DASHBOARD:** KPI Overview (`/overview`)
       - **ACTIVE WORKBENCH:** Ticket Lists (`/tickets`), My Active Workbench (`/workbench`), Bus Terminal Hubs (`/terminals`)
       - **KNOWLEDGE & LOGS:** Saved Repair Notes (`/notes`), My Job Logs (`/joblogs`)
    3. **`analyst` (IT Systems Analyst):**
       - **OPERATIONAL ANALYTICS:** Executive Analytics (`/analytics`), Standardized Reports Suite (`/reports`)
       - **GOVERNANCE & AUDIT:** Account Directory & Approvals (`/team`), Fleet Master Job Logs (`/joblogs`)
    4. **`admin` (System Administrator):**
       - Full categorized navigation across all 9 screens.
- **Acceptance Criteria:** Each role sees strictly their designated menu items. Zero duplicate screen entries.

---

### Task F-05: Strict Route Resolution & Security Guards in `App.tsx`
- **Files:** `frontend/src/App.tsx`, `frontend/src/utils/routeUtils.ts`
- **Actions:**
  - Define `ROLE_ALLOWED_VIEWS`:
    ```typescript
    export const ROLE_ALLOWED_VIEWS: Record<StaffRole, ActiveView[]> = {
      intern: ['overview', 'workbench', 'notes', 'joblogs'],
      it: ['overview', 'tickets', 'workbench', 'notes', 'joblogs', 'terminals'],
      analyst: ['overview', 'analytics', 'reports', 'team', 'joblogs'],
      admin: [
        'overview',
        'tickets',
        'workbench',
        'notes',
        'joblogs',
        'terminals',
        'analytics',
        'reports',
        'team',
      ],
    };
    ```
  - In `App.tsx`:
    ```typescript
    const userRole: StaffRole = currentUser?.role ?? 'it';
    const allowedViews = ROLE_ALLOWED_VIEWS[userRole] ?? ['overview'];
    const resolvedView = allowedViews.includes(activeView)
      ? activeView
      : userRole === 'analyst' ? 'reports' : 'overview';
    ```
  - Handle browser back/forward and deep link validation using `allowedViews`.
- **Acceptance Criteria:** Directly navigating to `/tickets` as an `intern` automatically redirects to `/overview`. Direct navigation to `/workbench` as an `analyst` redirects to `/reports`.

---

### Task F-06: Intern Assigned-Only Workbench Filtering
- **File:** `frontend/src/features/workbench/ITWorkbenchBoardView.tsx`
- **Actions:**
  - If `currentUser?.role === 'intern'`:
    - Filter candidate workbench tickets strictly to those where:
      ```typescript
      t.assigned_tech_id === currentUser.id ||
      t.workedById === currentUser.id ||
      t.workedBy === currentUser.name
      ```
    - If no ticket is assigned to the intern, display an informative empty state: *"No active workbench ticket assigned. Your supervisor or an IT Support specialist will assign tickets to your bench."*
    - Hide the fleet "Claim Next Ticket" action button.
- **Acceptance Criteria:** An intern cannot see or claim unassigned pool tickets on their workbench. Only assigned tickets appear.

---

### Task F-07: Account Governance Modals (`EditITStaffModal` & `EditEmployeeModal`)
- **Files:** 
  - `frontend/src/features/team/components/EditITStaffModal.tsx` [NEW]
  - `frontend/src/features/team/components/EditEmployeeModal.tsx` [NEW]
- **Actions:**
  - `EditITStaffModal`:
    - Allows editing: Full Name, Primary Terminal Hub, Role (`intern`, `it`, `analyst`, `admin`), Active Status Toggle (`is_active`), and optional Password Reset field.
    - Submits to `directoryApi.updateAdminUser(id, payload)`.
  - `EditEmployeeModal`:
    - Allows editing: Employee ID, Full Name, Email, Company, Terminal Hub, Department, Active Status Toggle.
    - Submits to `directoryApi.updateAdminEmployee(id, payload)`.
- **Acceptance Criteria:** Modals open cleanly with existing account details pre-populated, enforce strict validation, and update the roster upon saving.

---

### Task F-08: Directory Soft-Deactivation & Table Wiring
- **Files:** `frontend/src/features/team/TeamAdministrationView.tsx`, `ITStaffTable.tsx`, `VerifiedEmployeeTable.tsx`
- **Actions:**
  - In `ITStaffTable.tsx`:
    - Add Edit icon button (`Pencil`) triggering `onEditMember(member)`.
    - Update Delete icon button to trigger confirmation: *"Are you sure you want to deactivate {name}'s account? Their historical tickets and job logs will be preserved for audits."*
    - Display an "Inactive / Deactivated" badge if `member.status === 'inactive'`.
  - In `VerifiedEmployeeTable.tsx`:
    - Add Edit icon button (`Pencil`) triggering `onEditEmployee(employee)`.
    - Update Delete icon button to trigger soft-deactivation with confirmation dialog.
    - Wire `teamSlice.ts` to call `deactivateITMemberApi` and `deactivateEmployeeApi`.
- **Acceptance Criteria:** Deactivating a member visually updates their status, persists in the database, and preserves historical job log records.

---

### Task F-09: 4-Tier Staff Login Modal Switcher
- **File:** `frontend/src/features/auth/StaffLoginModal.tsx`
- **Actions:**
  - Update the segmented role switcher pill from 2 options (`it` | `admin`) to 4 options:
    - `Intern`
    - `IT Support`
    - `IT Analyst`
    - `Admin`
  - Provide corresponding demo login presets for seamless testing.
- **Acceptance Criteria:** Testers can switch to any of the 4 roles with one click and log into that specific access tier.

---

## 3. Frontend Verification Checklist

- [ ] `npm run type-check` executes with 0 errors across the entire repository.
- [ ] `npm run build` generates production bundle without bundling or chunking warnings.
- [ ] Manual verification across all 4 roles:
  - Intern cannot see `/tickets` and only sees assigned workbench tickets.
  - IT Support has full operational access across terminals and queue.
  - IT Analyst has access to Reports & Analytics, and cannot claim tickets.
  - Admin can edit and deactivate accounts via dedicated modals.
