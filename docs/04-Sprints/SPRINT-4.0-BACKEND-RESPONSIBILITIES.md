# Tiketa Sprint 4.0 — Backend Responsibilities

Owner: Jefferson Lopez. Status: planned. Updated: 2026-11-04.

Read the [master plan](SPRINT-4.0-MASTER-PLAN.md) before implementation. It owns the agreed behavior, S4 acceptance criteria, export columns, date meanings, permissions and merge rules. Pair with [Rafael's frontend track](SPRINT-4.0-FRONTEND-RESPONSIBILITIES.md). Dates and demo deadline are undecided.

## 1. Execution approach

Start from current develop and preserve existing work. The master records the audited and publication baselines; source findings still need runtime reproduction. Read repository `AGENTS.md`, `docs/AI-CONTEXT.md`, and the targeted contract/code files. Current four-role code and agreed Sprint 4 decisions supersede stale two-role notes.

Backend ownership includes verifying working APIs, not automatically changing them. Reuse existing handlers, schemas, services and tests. Change schemas/OpenAPI/client examples together when a contract changes. Keep existing rows, authorization, validation, cache error handling and history intact. Add a migration only if the reproduced fix requires one; verify upgrade compatibility and the migration head in that case.

## 2. Tasks

### B-00 — Reproduce and publish the contract handoff

Pairs: F-00. Covers: all S4 outcomes.

1. Record backend/frontend candidate SHAs, environment and current dirty files. Use a non-production database and existing seed/setup tools.
2. Reproduce verification, first guide application, comments during polling, Intern resolution/approval, photo reads and role restrictions, history scope, report ranges and directory filters.
3. Capture exact HTTP method/path, safe request/response examples, validation details, role, persisted IDs and independent reads. Separate confirmed causes from hypotheses in the issue/PR.
4. Inspect callers and current tests for each changed function. Agree exact changed fields, error handling, pagination, nullability and cache effects with Rafael before dependent implementation.

Done: a reproducible case and contract decision exist for each cross-layer defect. Verification-only work is marked explicitly so it does not grow into unnecessary server changes.

### B-01 — Align verification access responses

Pairs: F-01. Covers: S4-09. Start: B-00.

Source: `backend/app/api/tickets.py` verification-access routes and related schemas/tests. Existing client POST `/tickets/{code_or_id}/verify-access` already has a server route; do not create another verification API.

- Confirm code-only, identity-required, authenticated/credentialed, expired, invalid and denied behavior. Share the exact response that F-01 should use to request identity; repair an actual inconsistent server response only if needed.
- Preserve privacy, scoped credentials and closure expiry. A ticket code alone must not authorize private details or requester approval.
- Keep valid existing callers compatible. Pair incompatible error-contract changes with F-01 in one PR.

Done: direct-link API cases and access-control regressions pass; Rafael can show every outcome without a loading loop or disclosure.

### B-02 — Correct initial checklist revision handling

Pairs: F-02. Covers: S4-14. Start: B-00.

Source: `backend/app/api/repair_notes.py`, `backend/app/schemas.py`, existing checklist services/tests.

- Reproduce the first-apply 422 with empty revision 0. Agree the initial revision request convention and document the exact schema/example with Rafael.
- Permit valid initial apply while preserving expected-revision checks for existing checklists, guide revision validation, transaction boundaries and access rules.
- Preserve current behavior for progress/replacement and error responses. Do not disable concurrency protection to suppress validation errors.

Done: first apply persists; read/reload matches; stale writes and invalid/forbidden requests still fail correctly; existing checklist progress is protected.

### B-03 — Verify conversation persistence and paging

Pairs: F-03. Covers: S4-11. Start: B-00.

Source: ticket comment GET/POST in `backend/app/api/tickets.py` and their tests.

- Verify stable message IDs, ordering/tie-breaks, paging and visibility before paging. Confirm repeated reads do not omit a saved message under the agreed retrieval strategy.
- Exercise two participants, writes during reads, internal-note filtering and forbidden users. Keep existing response array and canonical author fields.
- Fix the backend only if reproduction identifies a server defect. Queue-driven client replacement belongs in F-03.

Done: API persistence/order/permission evidence is available for the frontend race test, with focused regressions for any changed server logic.

### B-04 — History, supervisor scope, and intern lifecycle support

Pairs: F-04, F-07, F-08; supports F-05. Covers: S4-06/S4-07/S4-10/S4-13. Start: B-00.

Source: `/tickets/history`, status, confirmation and reopen handlers in `backend/app/api/tickets.py`; ticket services/schemas.

- Extend history with optional inclusive `date_from`/`date_to` on `date_started`, as specified in the master. Preserve omitted-filter behavior, the array shape, stable ordering, limits and existing filters. Validate ranges and update OpenAPI/client examples.
- Prove Intern/IT cannot read another technician's history. Prove Supervisor/Admin may read permitted overall history without becoming operational editors.
- Publish the existing bounded pagination contract and a dataset spanning multiple pages. Consumers must be able to retrieve all matching rows without unbounded requests or silent queue substitution.
- Verify assigned RESL remains readable by the Intern until requester decision; approval closes and rejection follows the existing reopen path with the reason retained. Repair server behavior only where reproduction requires it.
- Verify repair duration remains frozen at resolution, with approval timing separate. Retain existing reopen timing rules and other roles' workflows.

Done: permission, range-boundary, paging, resolution/approval/rejection and duration checks pass. Hand off this additive API before dependent range/export integration.

### B-05 — Support truthful personal metrics

Pairs: F-05. Covers: S4-01/S4-13. Depends: B-04 history contract.

Source: history TicketOut/assignment fields, report KPI query/service, existing tests.

- Verify returned records carry the actual assignment UUID and persisted status/duration fields needed by the existing overview. Confirm complete personal history can be retrieved by the authenticated account.
- Prefer existing history data for F-05 calculation. Identify fields that genuinely do not exist; those metrics remain unavailable. Do not invent ratings, targets, averages or historical values.
- Personal approved completion means requester-approved CLSD. Preserve unrelated organization-wide KPI/report definitions, including their existing RESL+CLSD completion numerator; never globally rename/redefine `completed` to satisfy a personal card.
- If an actual payload/performance gap requires an additive personal aggregate, agree and record the precise endpoint/fields/permissions before F-05 depends on it. Keep the ordinary case on the existing API.

Done: empty accounts and two same-name users demonstrate correct UUID ownership, complete counts and null/unavailable inputs; existing organization report values remain compatible.

### B-06 — Intern account and photo support

Pairs: F-06. Covers: S4-02/S4-03/S4-12. Start: B-00.

Source: account-request governance, users/auth serializers, `backend/app/api/photos.py`, existing file validation/storage tests.

- Verify Intern is allowed through the current account proposal/approval flow and saved as the existing role identifier. Preserve separation of duties and privileged-account safeguards.
- Extend self-photo upload permission to Intern. Verify self-photo deletion and authenticated photo reads for all four roles; preserve byte/content/dimension validation, encrypted storage, safe content type and existing errors.
- Confirm nullable avatar URL/version metadata survives login, refresh, self read and directory reads wherever those serializers provide staff identity. Add missing mapping only where required.
- Publish PUT multipart `file`, DELETE and protected GET examples/statuses. GitHub baseline already includes PUT client alignment and a compatibility POST route; do not treat that historical mismatch as an unresolved implementation requirement.
- Preserve roles in the API; friendly role wording belongs in F-06. Keep bearer credentials out of photo URLs.

Done: Intern creation/approval and all-role photo write/read/delete tests pass, forbidden writes remain denied, and frontend can refresh actual saved photos.

### B-07 — Reporting periods and maintenance constraints

Pairs: F-07. Covers: S4-07/S4-08. Depends: B-00; B-04 for history integration.

Source: `backend/app/api/reports.py`, `backend/app/services/reports.py`, report window/maintenance validation and export tests.

- Reuse date_from/date_to. Verify daily, Monday–Sunday weekly, complete-month and valid custom ranges with inclusive Philippine calendar dates and existing scope filters.
- Preserve existing date bases and formulas in master section 4. Verify multi-month complete-calendar-month maintenance requests; handle partial months as unavailable without prorating or silently widening dates.
- Preserve backend-generated summary CSV schemas and existing report export formats. New 15-column job-log XLSX is F-08, not a rewrite of every report export.
- Ensure empty periods and unsupported periods are distinguishable from unexpected server failures. Agree the existing maintenance validation response with F-07 so the UI can isolate it.

Done: focused date-boundary/partial-period tests pass; ordinary supported reports are independent of maintenance availability; report and export requests use the same range/scope.

### B-08 — Complete directory filtering and permitted details

Pairs: F-09. Covers: S4-04/S4-15. Start: B-00.

Source: current employee/staff directory APIs, dictionaries, serializers and tests.

- Inventory existing search, Company, Location, Department and active-state support. Verify combined filters over the full dataset and correct pagination.
- Reuse existing parameters and reads. Add only missing server filters needed for complete results; preserve leading-zero employee IDs and current permission boundaries.
- Provide actual safe detail fields to the read-only person view. Do not expose private fields or build new profile routes when existing reads suffice.

Done: combined filters, empty matches, paging and denied reads pass. Handoff documents supported query fields and sample persisted records.

### B-09 — Joint acceptance and merge evidence

Pairs: F-10 review, F-11. Covers: all S4 outcomes.

Run the master completion scenarios and applicable repository backend checks from `docs/STANDARDIZED-TESTING.md`, verified against actual CI. Include Ruff, tests/coverage, OpenAPI drift, and migration checks where relevant. Test paired changes on the same candidate with frontend checks and browser evidence. Do not claim a planned check passed.

Review wording/layout for preserved meaning and fields; these tasks normally need no backend changes. Publish task IDs, contract examples, saved IDs/readback, candidate SHA, check output and remaining blockers. Peer review precedes Jefferson's merge. Repeat affected smoke after merge.

Done: every mapped S4 row passes integrated acceptance or remains explicitly incomplete; no incompatible frontend/backend halves are merged separately.

## 3. Handoff order

1. B-00 with F-00, then ticket fixes B-01/B-02 and verification B-03/B-04.
2. Hand off B-04 history early; F-04/F-07/F-08 and personal metric work depend on it.
3. B-05/B-06 and B-07/B-08 can overlap after their contracts are settled.
4. B-09 with F-11 verifies the integrated result; feature-sized PRs follow the master's additive-first/paired-change rules.

Each API-ready handoff includes method/path, request/response example, roles, errors, nullable fields, paging, persisted test ID, test evidence and merged SHA when available. Use real API integration for completion; test fixtures remain isolated to automated tests.
