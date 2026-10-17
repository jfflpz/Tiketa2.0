# Tiketa 2.0 — Frontend Engineering Sprint Plan (Strict TypeScript + Pure Employee ID Intake)

## Goal Description
Formulate a dedicated, production-grade **Frontend Sprint Plan** for **Tiketa 2.0**, strictly synchronized with the **Backend Sprint Plan ([`BACKEND-SPRINT-PLAN.md`](file:///C:/Users/Kanor/Documents/FS_Projects/Tiketa/docs/04-Sprints/BACKEND-SPRINT-PLAN.md))** and grounded on the refined **Pure Employee ID Validated Intake** model (zero workforce accounts, zero device tokens, zero client-side setup).

**Lead**: Rafael Emmanuel Codiñera (Frontend)  
**Peer Reviewer**: Jefferson Lopez (Backend & DevOps)  
**Target Repository**: `C:\Users\Kanor\Documents\FS_Projects\Tiketa\frontend`  
**Tech Stack**: React 18/19 SPA, Strict TypeScript 5+, Tailwind CSS, Zustand, Axios, Recharts, Lucide React, Vite, Nginx Alpine  

---

## 1. User Interaction Models: Employee Web Kiosk vs. IT Queue

```mermaid
flowchart LR
    subgraph Flow1 ["Terminal Staff Flow (Pure Employee ID - Zero Accounts, Zero Tokens)"]
        Browser["Open Browser $\to$ /report"] --> Screen["Web Kiosk Screen (/report)<br/>• Enters Employee ID (e.g. FS-1042)"]
        Screen --> Lock["Auto-Locks Profile Banner in <100ms:<br/>🏢 Five Star Pasay - Cash Management"]
        Lock --> Buttons["Tap 1 of 6 Big Visual Category Buttons<br/>(Printer, PC/Monitor, Network, Access, Hardware, Other)"]
        Buttons --> Input["Brief Issue Description"]
        Input --> Submit["Click: 'Submit Ticket' 🚀"]
    end

    subgraph Flow2 ["IT Technician Flow (High-Velocity Queue)"]
        Login["/login (Argon2id + JWT)"] --> Queue["/queue (IT Central Triage)"]
        Queue --> HotkeyC["Press 'c' $\to$ Instant Claim"]
        Queue --> HotkeyV["Press 'v' $\to$ Quick Fallback Intake<br/>(Log unavoidable Viber/walk-in in <4s)"]
    end
```

---

## 2. Phased Frontend Sprint Breakdown

### Sprint 1: Second Brain Alignment, Scaffolding & Strict Typing (Completed ✅)
* **F1.0 (In-Repo Second Brain Sync)**: Read `docs/AI-CONTEXT.md` and `docs/01-Architecture/SYSTEM-ARCHITECTURE.md`. Enforce non-goals: zero `.jsx`/`.js` files, zero drag-and-drop Excel uploaders.
* **F1.1 (Vite & Strict TS Tooling)**: Vite React SPA with `"strict": true`, `"noImplicitAny": true`. Verified by `npm.cmd run type-check`.
* **F1.2 (Tailwind Corporate Tokens)**: Five Star Red (`#DC2626`), Amber Warning (`#FBBF24`), Slate Dark (`#0F172A`, `#1E293B`).
* **F1.3 (TypeScript Domain Models)**: Author interfaces matching backend models (`types/index.ts`).
* **F1.4 (Axios HTTP Client Core)**: Base Axios instance configured for API communication.
* **F1.5 (Foundation View)**: Verified initial paint via `src/App.tsx`.

---

### Sprint 2: IT Authentication, Employee ID Kiosk Route & Auth Guards (Weeks 3–4)
* **F2.1 (Zustand In-Memory Store `useAuthStore.ts`)**: Access token in RAM for IT technicians (`role: 'it' | 'admin'`).
* **F2.2 (IT Login Page `src/pages/LoginPage.tsx`)**: Secure login form for IT Technicians and Administrators redirecting to `/queue` and `/reports`.
* **F2.3 (Employee Validated Kiosk Page `src/pages/ReportIssuePage.tsx`)**:
  - Accessible directly at `/report` from any terminal browser or phone.
  - As-you-type Employee ID debounced lookup (`GET /api/v1/employees/lookup?q={id}`).
  - Displays prominent verified employee card: *Maria Santos — Five Star Pasay (Cash Management)* with locked fields.
  - 6 Big Visual Category Buttons for instant selection without cognitive friction.
  - Brief description input and submit button.
  - Zero password prompts, zero account registration forms (ADR-002).
* **F2.4 (Axios 401 Interceptor)**: Transparent silent token refresh for IT technician sessions via HTTP-Only cookie.

---

### Sprint 3: High-Velocity IT Queue & Fallback Quick Intake (Weeks 5–6)
* **F3.1 (Central IT Triage Queue `src/pages/ITQueuePage.tsx`)**:
  - High-density data grid displaying all unassigned and active tickets across terminals.
  - Displays tickets originating from Solution 4 desktop shortcuts with a verified `[ 🖥️ PC Kiosk ]` badge.
  - **Single-Click Claiming**: `[ Claim Ticket ]` button.
  - **Keyboard Shortcut (`c`)**: Pressing `c` immediately claims the selected ticket.
  - Color-coded badges: `[ OPEN ]`, `[ PROG ]`, `[ RESL ]`, `[ CLSD ]`.
* **F3.2 (Optimistic UI Updates via `useTicketStore.ts`)**: Instant sub-100ms feedback on claiming and status progression.
* **F3.3 (Fallback Quick Intake Modal - Hotkey `v`)**:
  - Pressing `v` in the IT Queue opens a 4-second Quick Intake modal.
  - Technicians enter walk-in or Viber requests (Requester, Hub, Dept, Issue) before troubleshooting to satisfy the management fallback logging rule.
* **F3.4 (Resolution & Duration Modal)**: Form capturing hands-on repair minutes vs. travel lag.

---

### Sprint 4: Executive Analytics Dashboard & Recharts Suite (Weeks 7–8)
* **F4.1 (Real-Time KPI Banner)**: Active Tickets, Overdue Backlog (>48 hrs), Avg Labor Minutes, Same-Day Resolution %.
* **F4.2 (8 Standardized Executive Reports Multi-Tab Viewer `src/pages/ReportsPage.tsx`)**:
  - All 8 standardized reports (`FR-REPT-01` to `FR-REPT-08`) with multi-hub filters and CSV streaming triggers.
* **F4.3 (4 Reactive Recharts Visual Widgets)**:
  1. `TurnaroundLagChart.tsx`: Repair minutes vs transit lag across terminal hubs.
  2. `SupportModeChart.tsx`: Remote vs Site visit ratio.
  3. `TechVelocityChart.tsx`: Closed tickets and labor hours per technician.
  4. `PeakDemandChart.tsx`: Ticket submission volume across hours of the day.

---

### Sprint 5: Production Dockerization, Bundle Polish & UAT (Weeks 9–10)
* **F5.1 (Production Multi-Stage Dockerfile & Nginx)**: Multi-stage build (Node 24 $\to$ Nginx Alpine) with HTML5 History API fallback.
* **F5.2 (Vite Production Optimization)**: Bundle chunking target `< 250 KB` gzipped.
* **F5.3 (Type Safety Verification)**: `npm.cmd run type-check` passes with 0 errors.
* **F5.4 (End-to-End Pilot Verification)**:
  - Verify terminal staff double-click desktop shortcut $\to$ submit issue $\to$ ticket arrives in IT Queue $\to$ tech claims via `c` $\to$ resolves $\to$ reports reflect metrics.
  - Verify IT logs walk-in via hotkey `v`.

---

## 3. Verification Plan

```powershell
cd C:\Users\Kanor\Documents\FS_Projects\Tiketa\frontend
npm.cmd run type-check
npm.cmd run build
```

### Manual Verification
1. **Desktop Shortcut Experience**: Test `/report` route without user login; verify correct terminal location/department banner is displayed.
2. **IT Queue Hotkeys**: Test hotkey `c` (instant claim) and hotkey `v` (quick fallback intake modal).
