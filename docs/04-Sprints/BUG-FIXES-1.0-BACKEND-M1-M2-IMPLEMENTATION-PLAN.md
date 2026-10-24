# Bug Fixes 1.0 — Corrected Backend Implementation Plan, M1 & M2

Reviewed: 2026-10-24 against local `develop` at `0f140ce`. Status: reviewed planning document; no implementation, migrations or application tests executed for this review.

This refines B-01 through B-04 of the [backend track](BUG-FIXES-1.0-BACKEND-PLAN.md) within the [single shared sprint](BUG-FIXES-1.0-SPRINT-PLAN.md). M1/M2 are milestones within that sprint. Conversations, repair-library persistence, overview aggregates and browser location remain in the same sprint under B-05 through B-08.

The supplied plan's management change to **numeric-only employee IDs** supersedes the earlier `FS-` input proposal. Length limits and API policy choices below are review recommendations, not claims of separate management approval.

## 1. Review findings and corrections

| Priority | Finding in the supplied plan | Corrected approach |
| --- | --- | --- |
| P1 | Unconditional `reported_issue_code = task_code` backfill treats a ticket's current diagnosis as its original intake choice. | Leave legacy values null unless a trustworthy original intake source exists. Copying a code at new ticket creation is different from reconstructing historical data. |
| P1 | Blind prefix stripping can collide with an existing numeric ID: `FS-1042` and `1042` are both permitted by today's schema. Other nonnumeric IDs can remain behind. | Preflight every proposed ID, detect duplicates/invalid values, and fail atomically before conversion if any require resolution. Preserve employee UUIDs and leading zeros. |
| P1 | Restricting only the new service-record endpoint leaves `PATCH /tickets/{id}/status` able to change `task_code` for another technician. | Apply the proposed field-edit authorization consistently to every task/diagnosis write path and test the existing status endpoint. |
| P1 | Adding a technician filter without adding it to the cache key can return another filter's cached results. | Include the effective assignee filter and any authorization scope in the versioned cache key; test alternating filtered requests. |
| P1 | Inserting a new technician association on every assignment can violate the existing `(ticket_id, technician_id)` primary key when returning to a previous technician. | Lock the ticket, reuse/upsert the technician association, maintain one primary, and preserve repair start time on reassignment. |
| P1 | Backend-only numeric-ID enforcement breaks the current frontend's `FS-1042` default and prefixed form guidance. | Coordinate migration, seeds, API validation and frontend numeric input in one cutover; include a frontend handoff gate. |
| P2 | The seeder correction uses UTC calendar dates, while repository reporting uses the business timezone. | Derive start/finish dates and month from their corresponding instants in `BUSINESS_TIMEZONE`; test UTC and business-midnight boundaries. |
| P2 | “29/29 passing” is a fixed count despite added tests, and empty-schema migration cycling does not prove existing-data conversion. | Require all collected tests, required coverage and populated upgrade/conflict tests; record actual results after implementation. |

Source facts verified: `tickets.description_enc` already stores the employee description separately from `task_code`; diagnosis/resolution fields do not exist yet. The current queue already supports an explicit `status=CLSD`; its default excludes closed records. The issue is the default/history contract and frontend consumption, not total absence of closed-ticket support. The existing seeder computes `start_date` and `start_dt` from different instants. The inspected fallback formatting is not evidence of a failing formatter: run Ruff before describing it as a reproduced defect.

## 2. Recommended answers to the open questions

### Employee ID format

Use a string of **1–50 ASCII digits**, for example `1042` or `0012`, with an explicit `[0-9]` pattern and the existing `VARCHAR(50)` storage. Do not cast to an integer. A single digit is not proven invalid by the supplied business requirement; arbitrary 2–20 limits could reject real records. If management later specifies exact lengths, audit current data before tightening them.

Use the same reusable validation in employee create/update and public/quick ticket intake. Reject prefixed, alphabetic, signed, decimal and embedded-space identifiers. Existing input trimming may normalize outer whitespace; document this consistently. Add the corresponding database constraint after data preflight so scripts and direct model writes follow the same rule.

Employee lookup currently accepts either an Employee ID or email. Preserve email lookup as a separate supported query form; changing ID syntax does not silently remove that feature. Validate the numeric-ID query branch consistently, reject old prefixed ID input after cutover, and retain inactive/unknown-record handling and rate limits. The intake `employee_id` field itself accepts numeric IDs, not email addresses.

### Reported issue codes

For **public six-button intake**, validate the six actual choices instead of accepting every technical task as an employee issue:

| Code | Employee-facing title |
| --- | --- |
| PRN-TS | Printer Issue |
| NET-CFG | No Internet / Wi-Fi |
| SW-ASST | POS / Software Help |
| PC-HW-REP | Computer / Monitor |
| SRV-ASSESS | Server / CCTV / UPS |
| PC-PMS | Routine Checkup (PMS) |

These mappings come from `frontend/src/features/kiosk/components/KioskIntakeForm.tsx`. Define an explicit shared contract for them; titles must not be derived from technical task names such as Network Configuration. `task_code` remains a registered technical classification that staff may update after diagnosis.

Keep the database issue field nullable for legacy/historical records. A nullable foreign key to registered category codes plus application-level six-choice validation is sufficient for this release; public choices can evolve with an explicit contract update. Staff quick intake may use any valid technical task while omitting the reported issue when no kiosk choice was made.

For compatibility with the current public client, an omitted `reported_issue_code` may be inferred from the submitted `task_code` **only for a newly created public ticket when that code is one of the six choices**. Explicit null/empty/invalid values should not bypass the public requirement. An explicit mismatch between public issue code and initial task classification must be rejected or normalized by the server under a documented rule; recommend rejecting it with 422. Do not apply this inference to historical rows or automatically to staff quick intake. Public submission continues returning only its established minimal receipt fields.

### Service-record permissions

Adopt the supplied proposal: assigned technician or admin can edit classification, diagnosis and resolution notes. Unassigned technicians cannot edit another technician's service record. This is a planned refinement of the existing shared-queue policy and must be documented in the contracts/reporting rules when implemented.

Use a common authorization check for these fields in the new service-record endpoint and existing status-update endpoint. After a valid claim, the claiming user becomes the assignee before a combined field update is checked. Preserve separately documented lifecycle permissions rather than silently changing all queue read/status behavior.

## 3. M1 — Baseline, reproduction and contract preparation (B-01)

- [ ] Work on a backend feature branch based on `develop`; preserve any newer local changes. The review baseline was clean, but check again at implementation start.
- [ ] Capture reproducible API examples for valid intake, invalid employee IDs, short/long descriptions and validation failures. The frontend white-screen cause remains unproven until observed in a browser.
- [ ] Run formatter/linter checks and apply only required formatting changes to the existing resolution fallback. Preserve its production/non-production behavior and existing tests.
- [ ] Reproduce the demo seeder date failure with an injected/fixed clock on disposable data.
- [ ] Publish proposed payloads, null semantics, errors, pagination, permissions and ID-cutover requirements for the frontend contributor before integration.

Seeder correction:

```python
start_dt = now - timedelta(days=tdata["days_ago"], hours=2)
start_date = local(start_dt).date()
# For a resolved/closed row:
res_dt = start_dt + repair_duration
date_fin = local(res_dt).date()
month = start_date.strftime("%B %Y")
```

Use the existing business-timezone conversion helper or equivalent shared logic. Keep stored instants timezone-aware UTC. Audit the seeder's related calendar-derived counter/month and maintenance-plan dates for the same timezone rule. Use coherent simulated intake timestamps for demo data where creation-month reporting depends on them. Tests must cover both before/after UTC midnight, business midnight, and a month boundary, including repair across midnight.

This is a future implementation sketch. Do not run the demo seeder against an existing developer/production database for review: it also updates demo account credentials and other records. Use the explicit disposable test environment.

## 4. M2 — Schema and employee data migration (B-02/B-04)

Use separate revisions for service-record additions and numeric-ID conversion so their data/recovery implications are clear. The current actual Alembic head is **`0003_report_index`**; `down_revision` must reference the revision identifier, not a filename or plain `0003`. Recheck the head before implementing; the two filenames below are proposed.

### 0004 — Reported issue and service-record fields

- Add nullable `reported_issue_code` (VARCHAR(50), registered-code relationship), `diagnosis_enc` (TEXT) and `resolution_notes_enc` (TEXT).
- Match columns/constraints between migration and ORM metadata.
- Preserve `description_enc`, technical classification and canonical historical export fields.
- Leave historical issue/diagnosis/resolution fields null unless original source data proves their values; do not bulk-copy current `task_code`.
- Check existing-row upgrades and encrypted round trips. Document that dropping the new columns loses newly recorded service data; use a checked backup/recovery process for a deployed rollback.

### 0005 — Numeric employee identifiers

1. Produce a preflight mapping keyed by immutable employee UUID: old ID → candidate ID. Convert only exact legacy `FS-` followed by digits; keep already numeric IDs as strings.
2. Check every candidate against the chosen length/digit rule. Flag unsupported prefixes, malformed IDs and any duplicate target IDs across all companies. Include already numeric rows in collision detection.
3. If any issue exists, stop before changing rows and report the affected employee UUIDs/identifiers for correction. Do not merge employees, discard rows or strip arbitrary characters.
4. Run the conversion and database constraint under a transaction with concurrent employee writes prevented during cutover. Preserve employee UUIDs, foreign-key relationships, names, email and leading zeros.
5. Update seeders and all fixtures before running them under the new constraint. Include non-prefix invalid fixtures such as the existing `employee_id="e1"` in reporting tests; a global `FS-` text replacement is insufficient.
6. Retain the UUID/old/new mapping in the migration recovery evidence. Numeric-only values do not reveal which rows originally had a prefix, so a blind downgrade adding `FS-` to every row is incorrect. A schema downgrade can relax the numeric constraint and retain IDs; exact old-ID restoration requires the captured mapping and collision checks or backup recovery.

Required populated migration cases: `FS-0012` → `0012`; already numeric `1042` stays unchanged; `FS-1042` plus `1042` fails with no partial changes; malformed/other-prefix IDs are surfaced; a long valid numeric ID is retained; ticket references remain attached to the same employee UUID. Database constraints and Alembic metadata must agree.

## 5. M2 — API and service changes (B-02/B-03)

### Schemas and serialization

- Use explicit public and quick-intake validation where their issue-code rules differ; share the numeric employee-ID type.
- Extend authenticated `TicketOut` with `reported_issue_code`, decrypted `diagnosis` and `resolution_notes`; keep `PublicTicket` minimal.
- Define service-record partial-update semantics: an omitted field is unchanged; explicit null clears an optional note; whitespace-only note text normalizes to null; a provided task code must be nonblank, registered and non-null. Reject an empty update with 422. Use field-presence tracking, not truthiness, so clearing behaves correctly.
- Keep `reported_issue_code` and the original description out of the editable service-record payload. Validate text limits and encrypt all persisted nonempty diagnosis/resolution values.
- Preserve existing complete ticket timestamps, duration and UUIDs. The present response lacks several display names expected by the frontend: document a real dictionary/roster mapping or add deliberate authenticated response fields, rather than relying on invented frontend defaults. Distinguish employee UUID from its numeric business identifier.

### PATCH /api/v1/tickets/{id}/service-record

- Require authentication, lock the ticket row, then evaluate assigned-technician/admin permission against the current assignment.
- Validate and apply allowed fields atomically; preserve description and original issue code.
- Update the modification timestamp, commit and invalidate queue caches. Define any lifecycle restrictions in the contract; this endpoint does not implicitly resolve/reopen a ticket or rotate closure credentials.
- Return the canonical authenticated ticket shape. A forbidden/invalid write must leave all fields unchanged.
- Apply the same field-edit guard to `StatusInput.task_code` to prevent an alternate write path from bypassing the policy.

### PATCH /api/v1/tickets/{id}/assign

- Admin-only; target must be an active `role="it"` user. The existing ability to claim as admin is a separate policy and should not be changed incidentally.
- Lock the ticket and coordinate validation against concurrent account deactivation. Permit OPEN assignment and PROG reassignment; recommend returning 409 for RESL/CLSD so reassignment does not rewrite completed-work attribution. Reopening remains an explicit lifecycle action.
- OPEN → PROG sets the first `started_at`. Reassigning an in-progress ticket preserves it so labor time is not reset.
- Repeated assignment to the current assignee is an idempotent no-op. Reassignment to a previous assignee reuses/upserts its existing association instead of inserting a duplicate composite key.
- Maintain exactly one primary association for assigned tickets, matching `assigned_tech_id`; demote the previous primary atomically. Preserve other technician associations and define timestamp semantics.
- Commit, invalidate caches and return the canonical ticket response. Test claim/assign concurrency and assignment rollback on validation failure.

`ticket_technicians` currently records one association per ticket/technician, not a chronological reassignment event log. Describe it accurately as participant/primary-assignment history. A full audit timeline would require a distinct event model and is not silently included in this milestone.

### GET /api/v1/tickets

- Preserve the default OPEN/PROG/RESL queue for existing clients. Keep explicit CLSD and add explicit ALL for paginated history.
- Add optional `technician_id` filtering on the current primary `assigned_tech_id`, not on every historical collaborator.
- Apply filters before pagination and preserve stable ordering by `created_at` plus ticket UUID.
- Include normalized status, technician filter, offset, limit and queue version in cache keys. Include authorization scope if read access differs by role/user. Authorization is evaluated before returning cached data.
- The filter is a selection feature, not an access-control boundary. Retain the documented shared-queue read policy unless deliberately amended; the frontend can request the current technician's UUID for personal views and no filter for fleet views.
- Document absent filters, empty results, invalid UUID/status, pagination termination and mutations that invalidate cached results. Test ALL/default/CLSD independently and alternating technicians with a warm cache.

## 6. M2 — Directory and frontend handoff (B-04)

- Reuse existing user/employee endpoints and `UserOut`; password hashes must remain absent. Retain password rules, duplicate/conflict handling, valid scope mappings, active-record handling and protected self-administration behavior.
- Confirm newly created users can actually authenticate and employees become available for lookup. Test deactivation while preserving historical references.
- Update numeric IDs in both seeders, every affected fixture, request examples and active documentation. Do not replace company code `FS`; company codes and employee identifiers are different fields.
- Coordinate frontend defaults/placeholders, fixed prefix removal, validation, clipboard/paste and `inputMode` behavior. Inputs remain strings; a numeric HTML input must not discard leading zeros.
- Preserve lookup-by-email independently from the numeric employee identifier rule. Update the tested API error expectations for legacy IDs after cutover.
- Coordinate rollout so old frontend clients sending `FS-...` are not left serving an incompatible API. Complete API tests first; call manual UI acceptance complete only after the matching frontend changes exist.

Update `docs/AI-CONTEXT.md`, database/API contracts and any conflicting active sprint/reporting rules with the implemented policy at handoff. During this review, source/code contracts still describe the current implementation; only planning documents are revised.

## 7. Verification requirements

All are implementation acceptance requirements, not results claimed by this review.

| Area | Required checks |
| --- | --- |
| Numeric identifiers | Leading zeros, min/max boundaries, letters/prefixes/signs/decimals, non-ASCII digits under the ASCII rule, create/update/intake/quick-intake consistency, email lookup retained |
| Populated migrations | Collision rejection with no partial update, malformed IDs, valid legacy conversion, already numeric rows, preserved UUID references, legacy reported issue left null |
| Service record | Encryption at rest and decrypted response, unchanged original fields, omitted/null/blank behavior, invalid task codes, assigned/admin allowed, other technician denied through BOTH endpoints |
| Dispatch | Admin-only, active IT target, invalid target, OPEN initial claim, PROG reassignment, same-assignee no-op, return to previous assignee, start-time preservation, completed-ticket policy, concurrent claim/assign |
| Queue/cache | Default versus ALL/CLSD, primary-assignee filter, empty/multiple pages, deterministic ordering, cache separation between technicians and statuses, mutation invalidation |
| Directory/auth | Create/login, duplicate identities, allowed roles, valid scopes, deactivation, preserved history and no credential disclosure |
| Seeder | UTC/business-midnight and month boundaries, nonnegative chronology/duration, consistency of calendar fields and repeatable disposable seeding |
| Regression | Existing lifecycle/reports/import/auth coverage, public response privacy, closure delivery behavior and correct API validation payloads |

Run from the repository root against the dedicated test Compose project. Build the test image first, regenerate OpenAPI after implementing the changes, then run the checks. These commands are the intended implementation workflow and were not executed during review:

```powershell
docker compose -f docker-compose.test.yml -p tiketa-bugfix-m1m2-test build backend
docker compose -f docker-compose.test.yml -p tiketa-bugfix-m1m2-test run --rm backend python -m scripts.export_openapi
docker compose -f docker-compose.test.yml -p tiketa-bugfix-m1m2-test run --rm backend pytest -q --cov=app --cov=scripts --cov-report=term-missing --cov-fail-under=80
docker compose -f docker-compose.test.yml -p tiketa-bugfix-m1m2-test run --rm backend alembic check
docker compose -f docker-compose.test.yml -p tiketa-bugfix-m1m2-test run --rm backend python -m scripts.export_openapi --check
docker compose -f docker-compose.test.yml -p tiketa-bugfix-m1m2-test run --rm backend ruff check .
docker compose -f docker-compose.test.yml -p tiketa-bugfix-m1m2-test run --rm backend ruff format --check .
```

The existing session fixture cycles migrations on an empty database and checks drift; add isolated populated-upgrade tests because this does not test real employee-ID conversion. Keep fixture truncation from erasing the test's pre-migration rows. Record actual collected test count, passed/failed outcomes, coverage and environment rather than promising a fixed 29 tests. Also satisfy the existing CI production-image and recovery gates as applicable.

Milestone exit: B-01–B-04 backend contracts, migrations and tests are verified and handed over. Integrated M2 completion additionally requires the frontend's real create → claim/assign → diagnose → resolve → verify → history demonstration. It does not mark B-05–B-08 or the full Bug Fixes 1.0 sprint complete.
