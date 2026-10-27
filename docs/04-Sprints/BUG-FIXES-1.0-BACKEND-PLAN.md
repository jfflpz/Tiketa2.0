# Bug Fixes 1.0 — Backend Track

Updated: 2026-10-24. Owner: Person 1 (backend). Status: In progress (M1 & M2 completed and verified; awaiting frontend integration).

This is the backend track of the [single Bug Fixes 1.0 sprint](BUG-FIXES-1.0-SPRINT-PLAN.md). Work alongside Person 2 using the [frontend track](BUG-FIXES-1.0-FRONTEND-PLAN.md). All acceptance criteria remain in the [requirement backlog](BUG-FIXES-1.0.md).

## Ownership and sequence

Own `backend/app`, database migrations, backend tests and generated API contracts. Coordinate shared contract documentation with frontend. Review existing uncommitted ticket/schema/test changes before editing them. Reuse functioning directory/auth APIs; add only the missing behavior.

Start B-01, then deliver B-02/B-03 and B-04 for core integration. Deliver B-05 and B-06 next, then B-07/B-08. Hand over each endpoint as soon as it is verified; tests and migration checks accompany each task.

## Backend task checklist

M1/M2 details: [Corrected backend implementation plan](BUG-FIXES-1.0-BACKEND-M1-M2-IMPLEMENTATION-PLAN.md). Numeric-only employee IDs supersede the previous `FS-` input proposal; the linked plan defines migration preflight, recommended bounds and frontend cutover dependencies.

### B-01 — Reproduce failures and publish integration contracts

Requirements: BF-01, BF-02. Handoff: F-01/F-02; milestone M1.

- [x] Reconcile existing local changes and identify the tested baseline.
- [x] Reproduce intake requests with valid, short, missing and oversized descriptions; capture actual status/error shapes without treating the suspected toast crash as proven.
- [x] Confirm login, refresh, logout, role and verification contracts for frontend routing.
- [x] Publish the planned ticket, directory, conversation, repair-note, overview and location contracts, including nullable fields, errors, pagination and authorization.
- [ ] Publish the updated Employee ID + registered email matching contract (`POST /api/v1/employees/match`), signed `match_token` issuance, generic mismatch response (preventing profile/email disclosure on ID alone), and Redis session cooldown limits.

Acceptance: frontend has accurate request/response examples and a working test environment. Authentication remains limited to `it`/`admin`; explicit login does not confirm ticket closure; public intake contracts prevent profile disclosure and unvalidated submissions.

### B-02 — Persist reported issue, diagnosis and resolution

Requirements: BF-03, BF-10. Handoff: F-02/F-03; milestone M2.

- [x] Persist a stable six-button reported issue/title and employee description independently from technician diagnosis/resolution fields.
- [x] Add the required schema migration and authorized service-record update operation; retain encryption conventions for free text.
- [x] Preserve the original report when task classification/diagnosis changes and when repair guides are applied.
- [x] Define legacy-row behavior without inventing the employee's original choice; retain canonical job-log/export compatibility.

Acceptance: submit, diagnose, save and fetch reproduce the original report and technician findings separately. Test invalid updates, authorization and existing rows after migration.

### B-03 — Ticket lifecycle, job history and dispatch

Requirements: BF-04, BF-05. Handoff: F-04; milestone M2.

- [x] Support explicit status/history queries including RESL/CLSD, pagination, canonical IDs, assignees, dates and duration.
- [x] Verify fresh public tracking status while preserving the minimal public response; expose any richer employee data only through appropriate scoped access.
- [x] Persist claim/assignment from every frontend entry point; add admin assignment to another active technician where existing claim cannot express it.
- [x] Keep primary assignee and technician relationships consistent; handle concurrent claims/assignments and invalidate caches after successful mutations.
- [x] Provide authoritative status/assignment data for the bell and dispatch pool; hand message-summary behavior to B-05.

Acceptance: OPEN → PROG → RESL → CLSD survives reload and appears correctly in job history; conflicting claims do not overwrite the winner. RESL remains awaiting verification and CLSD clears that condition. Test pagination and ownership by UUID.

### B-04 — Staff accounts and employee directory

Requirement: BF-08. Handoff: F-07; milestone M2.

- [x] Verify and reuse admin user/employee list/create/update APIs and server dictionaries.
- [x] Validate username/email uniqueness, active scopes, two permitted roles and passwords using existing hashing and password rules.
- [x] Apply the updated numeric-only employee-ID requirement as text, preserving leading zeros. Audit all IDs and conversion collisions before migrating exact legacy `FS-` plus digits values; preserve employee UUIDs and reject unsupported/conflicting conversions atomically. Recommended bounds are 1–50 ASCII digits, coordinated with frontend cutover.
- [x] Preserve ticket references when accounts/employees are deactivated; return actionable validation errors and omit passwords/hashes from response data.

Acceptance: a newly created account can log in; a newly created employee appears in intake lookup after refresh. Test duplicate records, invalid scope mappings and unauthorized directory writes.

---

### M1 & M2 Implementation & Verification Evidence (Tasks B-01 to B-04)

- **Completed:** 2026-10-24
- **Branch:** `feat/backend-bugfixes-m1m2`
- **Migrations Added:**
  - `backend/alembic/versions/0004_reported_issue_diagnosis.py`: Adds `reported_issue_code` (FK `task_categories.code`), `diagnosis_enc` (`TEXT`), and `resolution_notes_enc` (`TEXT`) to `tickets`. Leaves historical rows null.
  - `backend/alembic/versions/0005_numeric_employee_ids.py`: Preflights all employee IDs; converts exact legacy `FS-` + digits to digits; validates 1–50 ASCII digits; detects any collisions or invalid characters before modifying rows; adds `ck_employees_numeric_id` check constraint.
- **API Endpoints Added / Updated:**
  - `PATCH /api/v1/tickets/{id}/service-record`: Service-record update (task code, diagnosis, resolution notes). Restricts writes to assigned technician or admin; preserves original intake description & reported issue.
  - `PATCH /api/v1/tickets/{id}/assign`: Admin dispatch endpoint. Assigns to active IT technician, updates primary assignee, reuses existing technician associations, preserves `started_at` labor tracking, rejects assignment on RESL/CLSD with 409.
  - `GET /api/v1/tickets`: Extended with `status=ALL`, `status=CLSD`, and `technician_id=<uuid>` filtering with partitioned, versioned cache invalidation.
  - `POST /api/v1/tickets`: Public intake validates 6-choice kiosk codes (`PRN-TS`, `NET-CFG`, `SW-ASST`, `PC-HW-REP`, `SRV-ASSESS`, `PC-PMS`) and numeric employee IDs (`^[0-9]{1,50}$`).
  - `GET /api/v1/employees/lookup`: Supports numeric employee ID and email queries.
- **Verification Results:**
  - `pytest -q --cov=app --cov=scripts --cov-report=term-missing --cov-fail-under=80`: **36 passed in 17.38s (Coverage: 80.11% >= 80% CI gate)**.
  - `alembic check`: **Clean (0 uncommitted migrations or schema drift)**.
  - `python -m scripts.export_openapi --check`: **Clean (0 diff between code and openapi.json)**.
  - `ruff check .`: **0 errors**.
  - `ruff format --check .`: **41 files formatted (0 unformatted)**.

#### Frontend Cutover & Integration Guide (for Person 2 / F-01 to F-04, F-07)
1. **Numeric Employee IDs:**
   - Drop the hardcoded `FS-` prefix in UI intake forms (`/report`, Kiosk, Quick Intake) and form state.
   - Use string storage with validation regex `^[0-9]{1,50}$` and HTML `inputMode="numeric"` to preserve leading zeros.
   - Lookup query (`/api/v1/employees/lookup?query=...`) accepts either digits or an email address.
2. **Ticket Representation:**
   - `TicketOut` includes `reported_issue_code` (initial employee reported problem), `diagnosis` (decrypted technician diagnosis), and `resolution_notes` (decrypted technician notes).
3. **Service Record Editing:**
   - Technicians and Admins submit diagnosis/notes via `PATCH /api/v1/tickets/{id}/service-record` with payload `{"task_code"?: str, "diagnosis"?: str | null, "resolution_notes"?: str | null}`.
   - Omitted fields are preserved; sending `null` or empty string clears the field.
4. **Admin Dispatch:**
   - Admins can assign any open or in-progress ticket to an active technician via `PATCH /api/v1/tickets/{id}/assign` with `{"technician_id": "<uuid>"}`.
5. **History & Personal Queues:**
   - Fetch historical/closed tickets via `GET /api/v1/tickets?status=CLSD` or all tickets via `GET /api/v1/tickets?status=ALL`.
   - Filter tickets by primary technician using `GET /api/v1/tickets?technician_id=<uuid>`.

---

### B-05 — Persistent employee–technician conversations

Requirements: BF-05, BF-06, BF-10. Dependencies: B-02/B-03/B-04. Handoff: F-05; milestone M3.

- [ ] Implement message authorship for accountless employees and assigned technicians using a documented ticket-scoped access/recovery flow.
- [ ] Persist messages using an appropriate model/migration; keep message content encrypted according to repository conventions.
- [ ] Enforce participant access on message reads/writes and summaries. Reassignment changes which technician may participate.
- [ ] Provide ordered paginated history and conversation summaries for Messages & Dispatches, with defined retry/duplicate behavior.
- [ ] Remove new internal-note creation from this conversation workflow while preserving restricted historical internal comments without exposing them to employees.

Acceptance: authorized participants exchange messages across browsers and reloads; other employees/unassigned technicians are denied. Test revoked/expired access, reassignment, paging and retry behavior. A ticket code or Employee ID alone must not grant conversation access; closure credentials are not general chat credentials.

### B-06 — Repair-note library and ticket checklists

Requirement: BF-07. Dependency: B-02. Handoff: F-06; milestone M3.

- [x] Add persistent repair notes, ordered guide steps and independent ticket checklist instances with authorship/timestamps and optional source ticket.
- [x] Implement list/create/edit/delete/apply operations and ticket step/progress updates with documented staff/admin permissions.
- [x] Applying a guide copies its content into the intended service-record/checklist fields and preserves the original employee report.
- [x] Editing/deleting a source guide preserves already applied ticket records and progress.

Acceptance: all mutations remain correct when fetched in a second session; failed or unauthorized writes make no partial changes. Production reads do not rely on sample notes. Verified with 62 integration tests and 93.59% backend test coverage.

### B-07 — Overview metrics from the database

Requirement: BF-09. Dependency: B-03. Handoff: F-08; milestone M4.

- [ ] Implement/reuse appropriate scoped aggregates for monthly completed output and associated overview metrics.
- [ ] Document completion-month grouping, dynamic year, business timezone, reopened tickets and personal/fleet scope separately from SLA creation-month reports.
- [ ] Provide a narrowly scoped IT view; retain admin-only report access boundaries.

Acceptance: known-result tests cover RESL/CLSD, empty months, year boundaries, cross-month completion, reopening and technician scope. Returned counts agree with seeded records.

### B-08 — Browser location observations (Optional Supporting Telemetry)

Requirement: BF-12. Handoff: F-09; milestone M4.

- [ ] Add separate storage/API (`POST /api/v1/locations/observations` backed by `location_observations` table) for consented latitude, longitude, accuracy and capture/receipt timestamps.
- [ ] Define an opaque session association (`session_id`) and link observation to `Ticket.id` upon submission; prevent duplicate observation writes.
- [ ] Validate coordinate (-90 to +90 lat, -180 to +180 lng) and timestamp values; keep coordinates out of public tracking responses.
- [ ] Preserve official terminal/location from the verified employee directory; missing, denied, or timed-out browser coordinates do not block ticket creation, navigation, or staff login.

Acceptance: accepted observations persist separately from official terminal; malformed/duplicate writes are handled consistently; unauthorized associations are rejected; reporting remains 100% usable when location is denied.

## Final backend handoff

- [ ] All changed endpoints are documented in the generated API schema and supplied with representative request/response examples.
- [ ] Required backend CI checks pass, including meaningful tests, migration/drift and contract checks against the appropriate PostgreSQL/Redis environment.
- [ ] New schema upgrades are verified on representative existing rows, with recovery steps checked.
- [ ] Complete milestone M5 with Person 2: record the tested revision and evidence for every BF requirement.

Use a backend feature branch based on `develop`, conventional commits and PRs targeting `develop`. Only Jefferson Lopez merges. A backend task reaches Ready for integration after API verification and reaches Verified after the corresponding frontend acceptance check passes.
