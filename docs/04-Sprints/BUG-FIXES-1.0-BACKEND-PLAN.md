# Bug Fixes 1.0 — Backend Track

Updated: 2026-10-23. Owner: Person 1 (backend). Status: Planned.

This is the backend track of the [single Bug Fixes 1.0 sprint](BUG-FIXES-1.0-SPRINT-PLAN.md). Work alongside Person 2 using the [frontend track](BUG-FIXES-1.0-FRONTEND-PLAN.md). All acceptance criteria remain in the [requirement backlog](BUG-FIXES-1.0.md).

## Ownership and sequence

Own `backend/app`, database migrations, backend tests and generated API contracts. Coordinate shared contract documentation with frontend. Review existing uncommitted ticket/schema/test changes before editing them. Reuse functioning directory/auth APIs; add only the missing behavior.

Start B-01, then deliver B-02/B-03 and B-04 for core integration. Deliver B-05 and B-06 next, then B-07/B-08. Hand over each endpoint as soon as it is verified; tests and migration checks accompany each task.

## Backend task checklist

### B-01 — Reproduce failures and publish integration contracts

Requirements: BF-01, BF-02. Handoff: F-01/F-02; milestone M1.

- [ ] Reconcile existing local changes and identify the tested baseline.
- [ ] Reproduce intake requests with valid, short, missing and oversized descriptions; capture actual status/error shapes without treating the suspected toast crash as proven.
- [ ] Confirm login, refresh, logout, role and verification contracts for frontend routing.
- [ ] Publish the planned ticket, directory, conversation, repair-note, overview and location contracts, including nullable fields, errors, pagination and authorization.

Acceptance: frontend has accurate request/response examples and a working test environment. Authentication remains limited to `it`/`admin`; explicit login does not confirm ticket closure.

### B-02 — Persist reported issue, diagnosis and resolution

Requirements: BF-03, BF-10. Handoff: F-02/F-03; milestone M2.

- [ ] Persist a stable six-button reported issue/title and employee description independently from technician diagnosis/resolution fields.
- [ ] Add the required schema migration and authorized service-record update operation; retain encryption conventions for free text.
- [ ] Preserve the original report when task classification/diagnosis changes and when repair guides are applied.
- [ ] Define legacy-row behavior without inventing the employee's original choice; retain canonical job-log/export compatibility.

Acceptance: submit, diagnose, save and fetch reproduce the original report and technician findings separately. Test invalid updates, authorization and existing rows after migration.

### B-03 — Ticket lifecycle, job history and dispatch

Requirements: BF-04, BF-05. Handoff: F-04; milestone M2.

- [ ] Support explicit status/history queries including RESL/CLSD, pagination, canonical IDs, assignees, dates and duration.
- [ ] Verify fresh public tracking status while preserving the minimal public response; expose any richer employee data only through appropriate scoped access.
- [ ] Persist claim/assignment from every frontend entry point; add admin assignment to another active technician where existing claim cannot express it.
- [ ] Keep primary assignee and technician relationships consistent; handle concurrent claims/assignments and invalidate caches after successful mutations.
- [ ] Provide authoritative status/assignment data for the bell and dispatch pool; hand message-summary behavior to B-05.

Acceptance: OPEN → PROG → RESL → CLSD survives reload and appears correctly in job history; conflicting claims do not overwrite the winner. RESL remains awaiting verification and CLSD clears that condition. Test pagination and ownership by UUID.

### B-04 — Staff accounts and employee directory

Requirement: BF-08. Handoff: F-07; milestone M2.

- [ ] Verify and reuse admin user/employee list/create/update APIs and server dictionaries.
- [ ] Validate username/email uniqueness, active scopes, two permitted roles and passwords using existing hashing and password rules.
- [ ] Audit stored employee ID formats, then apply the agreed `FS-` plus digits validation consistently, preserving leading zeros and existing identifiers.
- [ ] Preserve ticket references when accounts/employees are deactivated; return actionable validation errors and omit passwords/hashes from response data.

Acceptance: a newly created account can log in; a newly created employee appears in intake lookup after refresh. Test duplicate records, invalid scope mappings and unauthorized directory writes.

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

- [ ] Add persistent repair notes, ordered guide steps and independent ticket checklist instances with authorship/timestamps and optional source ticket.
- [ ] Implement list/create/edit/delete/apply operations and ticket step/progress updates with documented staff/admin permissions.
- [ ] Applying a guide copies its content into the intended service-record/checklist fields and preserves the original employee report.
- [ ] Editing/deleting a source guide preserves already applied ticket records and progress.

Acceptance: all mutations remain correct when fetched in a second session; failed or unauthorized writes make no partial changes. Production reads do not rely on sample notes.

### B-07 — Overview metrics from the database

Requirement: BF-09. Dependency: B-03. Handoff: F-08; milestone M4.

- [ ] Implement/reuse appropriate scoped aggregates for monthly completed output and associated overview metrics.
- [ ] Document completion-month grouping, dynamic year, business timezone, reopened tickets and personal/fleet scope separately from SLA creation-month reports.
- [ ] Provide a narrowly scoped IT view; retain admin-only report access boundaries.

Acceptance: known-result tests cover RESL/CLSD, empty months, year boundaries, cross-month completion, reopening and technician scope. Returned counts agree with seeded records.

### B-08 — Browser location observations

Requirement: BF-12. Handoff: F-09; milestone M4.

- [ ] Add separate storage/API for consented latitude, longitude, accuracy and capture/receipt timestamps.
- [ ] Define an opaque visit association and authorized later linkage to an employee/ticket where applicable; prevent duplicate observation writes.
- [ ] Validate coordinate/time values, document retention/access, and keep coordinates out of public tracking responses.
- [ ] Preserve official terminal/location from the verified employee directory; missing browser coordinates do not block ticket creation.

Acceptance: accepted observations persist separately from official terminal; malformed/duplicate writes are handled consistently and unauthorized associations are rejected.

## Final backend handoff

- [ ] All changed endpoints are documented in the generated API schema and supplied with representative request/response examples.
- [ ] Required backend CI checks pass, including meaningful tests, migration/drift and contract checks against the appropriate PostgreSQL/Redis environment.
- [ ] New schema upgrades are verified on representative existing rows, with recovery steps checked.
- [ ] Complete milestone M5 with Person 2: record the tested revision and evidence for every BF requirement.

Use a backend feature branch based on `develop`, conventional commits and PRs targeting `develop`. Only Jefferson Lopez merges. A backend task reaches Ready for integration after API verification and reaches Verified after the corresponding frontend acceptance check passes.
