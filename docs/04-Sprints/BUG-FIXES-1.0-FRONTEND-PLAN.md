# Bug Fixes 1.0 — Frontend Track

Updated: 2026-10-24. Owner: Person 2 (frontend). Status: Planned.

This is the frontend track of the [single Bug Fixes 1.0 sprint](BUG-FIXES-1.0-SPRINT-PLAN.md). Work alongside Person 1 using the [backend track](BUG-FIXES-1.0-BACKEND-PLAN.md). All acceptance criteria remain in the [requirement backlog](BUG-FIXES-1.0.md).

## Ownership and sequence

Own `frontend/src`, typed API clients, domain slices, routes, forms and browser regression coverage. Follow the architecture guidance before code changes: strict TypeScript, atomic store selectors, domain-specific slices, asynchronous lookup guards and report-state invalidation on logout.

Begin F-01/F-02 and the modal portion of F-09 while backend contracts are prepared. Connect existing directory APIs through F-07, then integrate F-03/F-04 as ticket APIs arrive. Follow with F-05/F-06, then F-08 and location in F-09. Complete each workflow against the real API before marking it Verified.

## Frontend task checklist

### F-01 — Staff login, public navigation and dashboard landing

Requirement: BF-02. Backend contract: B-01. Milestones M1–M2.

- [ ] Replace the public IT Support/Admin buttons with one Login button opening the existing role-choice modal.
- [ ] Send successful explicit login for either staff role to `/dashboard`, including login from verification links; use the server-returned role for access.
- [ ] Preserve `/report` on refresh/reopen and separate session restoration from public-page selection; support authorized staff deep links and an `/overview` alias.
- [ ] Clear the verification-view navigation override appropriately after explicit staff login without consuming an employee closure confirmation.
- [ ] Verify browser back/forward, expired session, logout and stale saved-view behavior.

Acceptance: both roles land correctly and a public employee page is not replaced by the workbench on refresh. Login alone never closes a ticket.

### F-02 — Reliable employee submission and original report

Requirements: BF-01, BF-03. Backend contracts: B-01/B-02. Milestones M1–M2.

- [ ] Reproduce the white screen and fix its observed cause; convert API validation/error payloads into readable text and provide recoverable error rendering.
- [ ] Preserve form input after failure, restore submitting state reliably and show a receipt only after successful creation.
- [ ] Use the selected six-button problem label as the displayed ticket title. Keep additional details in the employee description and remove the fabricated initial chat message.
- [ ] Align description validation with the backend contract; preserve employee lookup race guards and block unverified submission.

Acceptance: all six issue choices survive submission/reload with the correct title and details. Valid, empty, short, long, timeout and server-error scenarios never cause a blank page or false success.

### F-03 — Service Record & Diagnosis and workbench

Requirements: BF-03, BF-10. Backend contract: B-02. Milestone M2.

- [ ] Rename 15-column Job Log Controls to **Service Record & Diagnosis** and make it the default drawer tab for each ticket-opening entry point.
- [ ] Show original employee issue/details separately from editable technician classification, diagnosis and resolution; save changes through the API.
- [ ] Update My Active Workbench for the claim → diagnose → record exact problem flow, preserving the original report.
- [ ] Replace the dashboard Save Repair Notes shortcut with **View Active Tickets**.
- [ ] Remove the duplicate workbench shortcut beside Copy Link and keep the remaining workbench action.

Acceptance: opening a ticket reaches its service record, diagnosis saves/reloads, and changing classification does not replace the employee's issue title or description. Canonical ledger/export fields remain available.

### F-04 — Fresh ticket lists, history, bell and dispatch

Requirements: BF-04, BF-05. Backend contract: B-03. Milestone M2.

- [ ] Replace local-only claim/assignment actions at every header, queue, drawer and workbench entry point with typed API operations.
- [ ] Map server IDs, names, dates and duration accurately; remove invented defaults and name-based ownership checks.
- [ ] Fetch all required pages/statuses for lists and history; make resolved/closed tickets discoverable through appropriate filters.
- [ ] Refresh authoritative state after successful operations, on focus and through bounded polling where needed; avoid returning stale local tracking data as current truth.
- [ ] Render employee status from lifecycle state, not simply whether an assignee name exists.
- [ ] Keep bell/dispatch counts consistent: RESL awaits verification, CLSD does not. Preserve failed-action state and display useful errors.

Acceptance: all roles observe OPEN → PROG → RESL → CLSD after refresh; job logs show completed work with correct data. Concurrent actions, pagination and logout during requests do not leave misleading state. Message summaries are completed in F-05.

### F-05 — Employee–technician chat and message summaries

Requirements: BF-05, BF-06, BF-10. Backend contract: B-05. Milestone M3.

- [ ] Connect employee and assigned-technician chat to persistent read/write endpoints and the agreed employee ticket-access flow.
- [ ] Load conversation history independently from queue summaries; queue refresh must not erase messages.
- [ ] Populate Messages & Dispatches from server summaries and open the appropriate conversation.
- [ ] Remove the internal IT note button and new internal-message behavior from this chat. Preserve access filtering for restricted historical content.
- [ ] Handle message ordering, pagination, send failures/retries, reassignment and expired/revoked access without reporting an unsaved message as sent.

Acceptance: authorized participants exchange messages in separate browsers and reload successfully; other employees/unassigned technicians cannot read or send. Verify no duplicate sends after retry and no additional-details message at ticket creation.

### F-06 — Persistent repair notes and checklists

Requirement: BF-07. Backend contract: B-06. Milestone M3.

- [ ] Replace sample/local-only library state with API-backed loading and create/edit/delete actions.
- [ ] Wire the existing edit/delete controls and show loading, empty, validation and failure states.
- [ ] Apply saved guides and save checklist additions, edits, removals and completion progress through the API.
- [ ] Respect author/admin permissions and retain the original employee report when applying a guide.

Acceptance: create/edit/delete/apply and checklist progress remain correct in a second browser. Editing/deleting a template does not erase an applied ticket record. Success appears only after a persisted write.

### F-07 — IT accounts and employee profiles

Requirement: BF-08. Backend contract: B-04 and existing directory APIs. Milestone M2.

- [ ] Load real staff and employee lists from the API with pagination and server dictionaries.
- [ ] Add username and password fields to account creation; allow only `it`/`admin` authorization roles and align password validation with the server.
- [ ] Connect Add Employee Profile and related mutations using numeric-only employee IDs stored as text. Remove the fixed `FS-` prefix and update intake/quick-intake defaults, placeholders and validation while preserving leading zeros. Coordinate deployment with the ID migration and API contract in the [M1/M2 plan](BUG-FIXES-1.0-BACKEND-M1-M2-IMPLEMENTATION-PLAN.md); recommended bounds are 1–50 ASCII digits.
- [ ] Use valid company/location/department mappings, display duplicate/validation errors, and refresh lists after successful changes.

Acceptance: created accounts can log in; created employees can be found in intake; records survive reload. Passwords are not exposed in tables or retained unnecessarily after success.

### F-08 — Overview metrics and monthly output

Requirement: BF-09. Backend contract: B-07. Milestone M4.

- [ ] Replace fixed monthly output and related sample chart values with API aggregates.
- [ ] Use a dynamic year and labels matching personal versus fleet scope and the agreed completion-month definition.
- [ ] Show loading, empty and error states honestly; discard stale responses when scope or session changes.

Acceptance: chart totals match backend fixtures for empty periods, reopened tickets, cross-month completion and different technicians. API errors never substitute sample values.

### F-09 — Full-screen modals and browser location

Requirements: BF-11, BF-12. Backend contract: B-08 for location; none for overlays. Milestones M1–M4.

- [ ] Mount overlays at an appropriate root/portal; ensure viewport blur coverage, stacking, scrolling, close behavior and focus handling for all affected modals.
- [ ] Request browser location on site entry with clear context, respect remembered permission and avoid repeated requests caused by rerenders.
- [ ] Save consented coordinates, accuracy and capture time through the location endpoint and agreed visit association.
- [ ] Support denied/unavailable/timeout states and duplicate-write prevention; keep official terminal data directory-derived and allow ticket creation without coordinates.

Acceptance: modal coverage works on desktop/mobile and scrolled pages; granted coordinates persist separately from official terminal, and denied permission leaves reporting usable.

## Final frontend handoff

- [ ] Type-check/build pass and meaningful intake/routing/asynchronous-state regression checks pass.
- [ ] Each persistent action is verified after reload and in a second authorized browser session.
- [ ] No production sample data or local-only success paths remain in the affected features.
- [ ] Complete milestone M5 with Person 1, including lifecycle, privacy/access, pagination, error paths and mobile checks; record revision and evidence.

Use a frontend feature branch based on `develop`, conventional commits and PRs targeting `develop`. Only Jefferson Lopez merges. A task reaches Ready for integration when the UI is ready to connect and reaches Verified only after its real API acceptance checks pass.
