# Sprint 3.0: Backend Track Responsibilities

**Sprint:** Governance, Staff Profiles, Terminal Configuration, Accurate Reports & Reliable Chat

**Owner:** Jefferson Lopez — Backend Engineering

**Status:** DRAFT — awaiting user approval; no implementation authorized yet

**Baseline:** `develop` at `5d0c14218e519a9b509409878ec4a88888c8e1ad` (2026-11-02 review)

**Shared plan:** [Sprint 3.0 implementation plan](Sprint-3-Implementation-Plan.md)

**Companion:** [Frontend responsibilities](SPRINT-3.0-FRONTEND-RESPONSIBILITIES.md)

**Evidence:** [Ponytail audit — 17 findings](Ponytail-Audit-2026-11-02.md)

**Proposed repository destination after approval:** `docs/04-Sprints/SPRINT-3.0-BACKEND-RESPONSIBILITIES.md`

## 1. Ownership and scope

Own FastAPI authorization, persistent data, forward migrations, image validation, report calculations, comment paging, backend tests, and generated OpenAPI. Rafael owns frontend screens, client methods and state, with one explicit exception: Jefferson implements the PPTX export task F-06. Reuse the existing PostgreSQL encryption, role dependencies, request review endpoints, dictionaries, and ticket services.

**Jefferson's cross-track assignment:** [F-06 — PPTX export fix and editable commentary](SPRINT-3.0-FRONTEND-RESPONSIBILITIES.md#f-06--editable-pptx-commentary-and-overlap-free-typography). Work on `feat/frontend-pptx-export-fix` from current develop after approval. Own the export renderer, slide builder, capture/assembly, export modal and export tests; Rafael reviews integration. Keep global frontend styling and existing API/modal contracts stable. The code remains under `frontend/`; there is no backend PPTX service to add.

Preserve employee/staff/ticket UUIDs, historical records, encrypted fields, ticket numbering locks, employee closure-token scope/rotation, and existing operational IT/Admin access where permitted. General employees remain accountless. No public signup, Repair Notes image upload, web spreadsheet uploader, ERP integration, WebSockets, background worker, or generic storage framework.

The audit fixes are part of this proposal, not completed work. A checked-in green test count from October is not evidence for this revision.

## 2. Shared contract decisions proposed for approval

Both tracks use the [shared API and PR integration contract](Sprint-3-Implementation-Plan.md#shared-api-and-pr-integration-contract-draft) for exact fields, status codes, compatibility and merge order. It includes the newly explicit history route and the atomic account-policy cutover; these are proposed contracts, not implemented endpoints.

| Area | Contract |
| --- | --- |
| Staff roles | `intern`, `it`, `admin`, `supervisor`; no new `analyst` role. Remove stale role examples from active docs/types. |
| Account proposals | Admin proposes create/deactivate; only Supervisor approves/rejects. Existing direct creation/deactivation cannot remain an approval bypass. Confirm a working active Supervisor before activating this policy. |
| New account roles | Request creation for Intern, IT, or Supervisor. Existing Admin accounts remain; ordinary UI cannot create a new Admin through this workflow. |
| Pending state | Reuse `pending / approved / rejected` on AccountRequest. A pending creation has no active User; create the User only on approval, as the current service does. |
| Endpoints | Keep `POST/GET /api/v1/account-requests` and existing `/{id}/approve`, `/{id}/reject`. Do not add the older plan's duplicate `/admin/users/propose` or `/pending` routes. |
| Profiles | IT/Admin/Supervisor can upload/replace/remove their own photo; everyone retains a working initials fallback. Profile display does not grant role/name/password editing. |
| Remembered login | Remembering a card does not retain a signed-in staff session. Password required on return. Logged-out cards show initials; photos stay behind staff authentication. |
| Reporting | Preserve Asia/Manila calendar rules, null denominators, RESL+CLSD completion, and negative transit lag with `data_review_required`. No silent clamping. |
| Chat | Three-second polling only while a conversation is active; latest messages first in retrieval, chronological display, older history explicitly paged. Server filters internal notes before paging. |
| Data removal | Deactivate terminal/department records or their membership links; retain records referenced by historical tickets. Reject unsafe changes with a clear conflict. |

Changing role or active status must not be available through a profile-photo endpoint. Existing credential resets remain authenticated administrative actions. Generated approval passwords must not be advertised as single-use: the current login flow does not enforce a forced password change.

## 3. Detailed task breakdown

### B-00 — Pin the baseline and publish the shared contracts

Audit: 12. Handoff: F-00. Milestone: S0.

- [ ] Recheck the remote `develop` HEAD and local working tree after approval. Review any changes since the audited SHA before coding; preserve other people's work.
- [ ] Work on `feat/backend-sprint3.0` from current `develop`. Do not use the older Sprint 3.0 documentation branch as the code baseline.
- [ ] Publish these two responsibility files and the shared plan to `docs/04-Sprints/` on a documentation feature branch; adapt local links for repository paths and include the baseline/audit reference.
- [ ] Update `docs/AI-CONTEXT.md`, active contract docs, and the sprint board with the current role matrix, endpoint/error examples, and feature status. Label Sprint 2.0 files historical instead of copying their stale `analyst`/0004 migration examples.
- [ ] Complete the S0 integration foundation with F-00: run frontend tests and one real-browser flow in the combined job, then verify develop requires that check, an up-to-date candidate and peer review. GitHub currently reports develop unprotected with required checks off; do not treat written branch rules as active enforcement.
- [ ] Allocate new Alembic revisions after the actual head, currently `0010_four_tier_rbac`. Coordinate migration numbers before merging feature branches.
- [ ] Record that downgrading 0010 deletes new-role users. Production recovery uses a tested backup/compatible forward fix; no destructive downgrade or database reset.

**Acceptance:** Both developers can identify the same base revision, role contract, disposable test services, migration head, and safe recovery method. No live account is deleted.

### B-01 — Close public-intake and ticket-permission gaps

Audit: 1, 2. Handoff: F-01, F-07, F-08. Milestone: S0.

**Existing files:** `backend/app/services/tickets.py`, `backend/app/api/tickets.py`, `api/deps.py`, `api/checklists.py`, `services/repair_notes.py`, schemas and affected tests/fixtures.

- [ ] Require the public match token and matching kiosk-session header; remove the employee-ID/no-header fallback. Reject missing, invalid, expired, and wrong-session credentials.
- [ ] Trace every caller of `submit`; preserve authenticated IT/Admin Quick Intake using its separate authorization path.
- [ ] Enforce assigned-only Intern ticket access consistently for detail, verify-access, comments, attachments, service record, status, reopen, and checklist routes. Keep employee token ownership and closure scope independent.
- [ ] Apply claim role restrictions to every OPEN→PROG entry point, including the status route; Supervisor cannot mutate operations by calling a hidden endpoint.
- [ ] Use one small shared permission check where routes have the same rule. Keep permitted IT/Admin cross-ticket behavior; document read versus write rules rather than changing them incidentally.
- [ ] Keep internal-note exclusion on the server for every employee credential type. Never rely on frontend `!isInternal` filtering for privacy.
- [ ] Add `GET /api/v1/tickets/history` using the shared contract: bounded TicketOut[] history, IT/Intern personal assignment scope, Admin/Supervisor fleet read scope, and deterministic ordering. Declare it before the dynamic ticket-ID route; keep Supervisor operational queue access denied.
- [ ] Extend existing tests with direct endpoint allow/deny cases for all four roles, reassignment, wrong ticket UUID, missing session, and each employee credential scope. Update fixtures that currently depend on the intake bypass.

**Acceptance:** An Intern cannot claim via either route or read/mutate another assignment; Supervisor cannot operate tickets; verified public intake works and ID-only intake fails. Existing valid employee sign-off/reopen behavior survives.

### B-02 — Return saved results when queue-cache invalidation fails

Audit: 6. Handoff: F-07/F-08. Milestone: S0.

**Existing files:** `services/tickets.py`, `api/tickets.py`, `core/cache.py`, relevant tests.

- [ ] Find every database-commit → queue-version-increment path. Handle failure after a successful commit separately from failure before it.
- [ ] Keep authentication/rate-limit/session failures fail-closed. Only queue-cache invalidation gets a logged best-effort failure after persistence.
- [ ] Return the actual saved ticket/comment/result, and preserve the five-second cache expiry bound. Do not tell callers to retry a write that already succeeded.
- [ ] Add a fault-injection test: Redis invalidation fails after commit; API still returns the saved row and the database contains exactly one write.

**Acceptance:** A post-commit cache outage cannot turn one saved ticket/message into a false HTTP 503 and duplicate retry. No new worker or queue infrastructure.

### B-03 — Admin proposals, Supervisor decisions, and safe account updates

Audit: 5, 15. Handoff: F-03. Milestone: S1.

**Merge rule:** B-03 and F-03 enter develop in one combined feature PR. This removes existing caller permissions/behavior, so it cannot use the additive-backend-first sequence. Preserve pending rows through forward migration and verify a working Supervisor before cutover.

**Existing files:** `api/account_requests.py`, `models/account_request.py`, `models/user.py`, `api/directory.py`, `schemas.py`, new forward migration, `tests/test_four_tier_rbac.py`.

- [ ] Restrict proposal creation to Admin and decisions to Supervisor. Route direct Admin create/deactivate callers through this policy; reject attempts to bypass it with legacy endpoints or status/role edits.
- [ ] Add `request_type: create | deactivate` and a nullable target-user UUID for deactivation. Extend creation-role validation to Intern/IT/Supervisor consistently in schema/model/database.
- [ ] Keep identity/scope snapshots on requests; for deactivation take target details from the server, not arbitrary client fields. Validate active terminal/scope assignments.
- [ ] Lock the request row before testing pending status. Apply creation/deactivation and reviewer metadata atomically; a second or conflicting decision returns 409.
- [ ] Normalize username/email before uniqueness checks. Preflight existing pending duplicates, then add narrowly scoped database uniqueness for pending creation identity and pending deactivation target.
- [ ] On deactivation retain historical links, increment token_version, and ensure access/refresh tokens stop working immediately. Pending deactivation does not disable the account until approved.
- [ ] Prevent all Admin self-demotions, preserve the last active Admin, and preserve the last active Supervisor needed to review requests. Serialize the relevant account-governance decisions so two reviewers cannot remove the final privileged accounts concurrently.
- [ ] Hash generated passwords off the async event loop, using the existing threadpool pattern. Return the generated secret only in the successful approval response; never log/cache it.
- [ ] Keep list results bounded; fetch related requester/reviewer/location data without a query for every row.
- [ ] Follow the shared contract's existing array list shape, `role` field, request-type/target fields, and approval response for create versus deactivate. Keep schemas, generated OpenAPI, TypeScript DTOs, callers and fixtures in the same cutover candidate.
- [ ] Test approve/approve and approve/reject concurrency, case-variant duplicates, invalid scopes, unsupported roles, direct bypass attempts, revocation, and last-privileged-account protection.

**Acceptance:** Admin proposes, Supervisor approves/rejects, exactly one decision wins, and list state agrees with whether the account can log in. Existing staff identities and job history remain intact.

### B-04 — Persistent staff profile photos

Audit: 14. Handoff: F-02. Milestone: S1.

**Touch points:** User response schemas and all their constructors, auth/me/login/refresh, directory user listing, one photo model/router, encryption helpers, forward migration, image validation tests.

- [ ] Add nullable photo metadata to the user response: photo availability/URL and update version. Do not return image bytes in login, refresh, or directory JSON.
- [ ] Proposed storage: one `user_profile_photos` row per user (user UUID primary key, encrypted bytes, validated MIME type, updated timestamp). Reuse AES-GCM helpers; keep blobs out of ordinary user/auth queries.
- [ ] Proposed routes: `PUT /api/v1/users/me/photo` (multipart `file`), `DELETE /api/v1/users/me/photo`, and authenticated `GET /api/v1/users/{id}/photo`. Writes are self-only and limited to IT/Admin/Supervisor.
- [ ] Validate decoded JPEG/PNG/WebP content, maximum 2 MiB input and 4096 pixels per side, before replacing the stored photo. Reject corrupt/animated or unsupported content and normalize to a bounded thumbnail with metadata removed.
- [ ] The requirements currently contain no image decoder. Add Pillow only if the execution-time dependency check confirms none is available; it is justified for real server-side image validation, not for drawing initials.
- [ ] Replace photo data in one transaction; a failed upload preserves the previous image. Removal restores the no-photo state.
- [ ] Serve only to authenticated staff with private caching, a versioned URL, correct content type, and nosniff. No public-photo route and no new filesystem/S3 storage.
- [ ] Test default/no photo, all supported roles, reload/relogin persistence, replacement/removal, wrong-user writes, unauthenticated reads, oversized/corrupt/unsupported images, and failed replacement.

**Acceptance:** A staff member can upload, replace, or remove their own photo; old accounts still work with no image. Production's read-only container does not need a writable uploads directory.

### B-05 — Terminal and department configuration without losing history

Handoff: F-04. Milestone: S2.

**Existing files:** `api/locations.py`, `api/directory.py`, `services/directory.py`, Location/Department/LocationDepartment models, schemas and relevant hub/intake tests.

- [ ] Reuse existing Location/Department `is_active` fields; add soft-active membership to LocationDepartment only where needed to preserve a disabled terminal-department link.
- [ ] Proposed Admin routes: `POST/PATCH /locations[/{id}]` and `POST/PATCH /departments[/{id}]`. Reuse `POST /admin/location-departments` for linking/reactivation and add `PATCH /admin/location-departments/{location_id}/{department_id}` for its active state.
- [ ] Extend dictionaries with active-state metadata and an Admin-only `include_inactive` query for configuration; normal intake/assignment sees only active choices.
- [ ] Validate unique codes/names, valid mappings and references. Reject unsafe deactivation that would strand active employees or work with 409 and a clear explanation; never silently reassign them.
- [ ] Update every scope validator, dictionary reader, matching/intake path and hub summary affected by inactive records. Preserve historical tickets and foreign keys.
- [ ] Keep official intake station/company/department from the verified directory. The frontend confirmation step cannot override the employee's authoritative station.
- [ ] Test create/edit/deactivate/reactivate, duplicate codes, unauthorized calls, in-use conflicts, and historical-record survival.

**Acceptance:** Admin configuration persists; disabled choices cannot receive new intake, while prior tickets remain readable and correctly linked.

### B-06 — Publish accurate, scoped analytics data

Audit: 8. Handoff: F-05/F-06. Milestone: S3.

**Existing files:** `api/reports.py`, `services/reports.py`, `services/tickets.py`, report tests and `docs/03-Contracts/REPORTING-RULES.md`.

**Scope addition (2026-11-03):** Support the shared Month/Year selector in F-05 through existing date parameters, not a new endpoint. B-09 supplies historical fixtures for acceptance.

- [ ] Verify reports, KPIs, CSV and the proposed hourly endpoint accept the same explicit inclusive first/last dates of a selected calendar month, including current month. Preserve existing scope filters, permissions and complete-month PMS validation; document Asia/Manila boundaries in the shared contract.
- [ ] Supply known-result previous-month and previous-year fixtures, including leap February, December/January, an empty month and imported records with missing timestamps. Keep unavailable metrics distinct from zero; never synthesize source timestamps or PMS plans.

- [ ] Verify current KPI/report formulas against existing reporting rules using known-result records. Include no data, zero labor, missing timestamps, reopen, cross-midnight/month/year, and Asia/Manila boundary cases.
- [ ] Preserve negative transit lag and its review flag; do not clamp it to zero or change the elapsed-duration definition without an explicit business-rule amendment.
- [ ] Publish the hourly-series contract on `GET /api/v1/reports/hourly-demand`, declared before the dynamic report route. Use actual non-null `started_at` values grouped in Asia/Manila and label the result as repair starts by hour, not fabricated intake volume.
- [ ] Return 24 zero-filled hour bins with the existing date/scope filters, explicit timezone/source-field metadata, and Supervisor/Admin access. Do not materialize the ticket table in the browser.
- [ ] Define the PMS card from service-plan coverage, separately from same-day resolution; preserve unplanned/company-filtered/null-denominator states. Document any aggregate PMS denominator rather than averaging percentages.
- [ ] Match supervisor permissions to actual routes and OpenAPI; update stale admin-only/analyst text in active documents.
- [ ] Supply small synthetic fixtures and JSON examples whose expected results frontend can reproduce.

**Acceptance:** UI, API, CSV and PPTX agree for the same report/filter snapshot; hourly/PMS data is real, scoped, and unambiguous.

### B-07 — Complete bounded conversation retrieval

Audit: 10. Handoff: F-07. Milestone: S4.

**Existing files:** `api/tickets.py` comment routes, CommentOut, relevant employee-verification and ticket tests.

- [ ] Reuse the existing comments endpoint. Add `order=asc|desc` with stable `created_at, id` ordering; retain bounded `offset/limit` for older history.
- [ ] Frontend's active poll requests the latest page in descending order and displays it chronologically. A Load older action requests older pages; merge by immutable server comment ID.
- [ ] Apply ticket authorization and employee internal-note exclusion before sorting/paging. Internal notes never consume the employee's visible page.
- [ ] Keep `author_name`, `author_role`, `is_internal`, and server timestamps as the canonical fields; no separate sender-field contract.
- [ ] Test at least 101 messages, same-timestamp messages, internal/public mixtures, older paging, reassignment and unauthorized access.

**Acceptance:** Message 101 appears in a second browser on the next successful active poll; older messages remain accessible and internal notes stay private.

### B-08 — Backend and release verification

Audit: 12, 16, 17. Handoff: F-09. Milestone: S5.

- [ ] Run the existing disposable PostgreSQL/Redis test environment, full pytest with the existing ≥80% gate, Ruff lint/format, OpenAPI drift check, and production backend build.
- [ ] Check new migrations on representative existing rows. Exercise safe downgrade only on disposable data with explicit preflight protection; production recovery uses preserved data and verified backups.
- [ ] Replace 0010's destructive downgrade DELETE with a preflight refusal when new-role users exist, before dropping request history. Keep its applied upgrade operations and revision identifiers unchanged; verify refusal preserves all rows and an empty disposable database can still complete the test cycle.
- [ ] Keep the existing backup/restore proof; do not replace it with a destructive database reset.
- [ ] Align production routing with frontend's build artifact: Nginx serves the SPA with route fallback, while API/health routes reach FastAPI. Verify cookie and proxy boundaries using the actual proposed same-origin topology.
- [ ] Test the built stack without deploying: /report and deep links return the app, API stays API, readiness reflects schema/cache status, and private photos require staff authentication.
- [ ] Hand frontend the tested SHA, migration sequence, request/response examples, role denials, persisted IDs, and all actual check results. Record candidate and post-merge develop evidence; leave unavailable checks pending.
- [ ] Apply the shared contract's per-PR gates from S0 onward; B-08 expands final release coverage and does not defer all integration checks to the end of the sprint. After every merge, smoke-test develop and stop dependent merges on a failure.

**Acceptance:** Backend gates and shared browser acceptance pass on the same candidate. No automatic merge, production deployment, or push to main.

### B-09 — One-time historical job-log migration (added 2026-11-03)

**Owner:** Jefferson. **Handoff:** F-05/F-08; B-06 report fixtures. **Milestone:** S3 rehearsal; operational import at cutover after backup/recovery review.

**Existing files:** `backend/scripts/seed_historical_logs.py`, `backend/tests/test_import_reports.py`, ticket models and the existing operations runbook. Reuse the CSV/XLSX importer; extend only verified gaps. No upload endpoint or frontend import task.

**Agreed mapping:** Historical `Done` means resolved, without fabricated employee closure confirmation. Retain all recorded technicians and expose the job in each technician's permitted personal history. Keep completed records with missing times; dependent time metrics remain unavailable. Count a shared job once per participating technician in individual productivity and once overall in company totals. Preserve a recorded job duration, but leave each technician's labor time unavailable when the source does not specify it; do not divide or duplicate that duration.

- [ ] Inventory the agreed legacy files and map columns, statuses, technicians and location/department references. Preserve source dates and recorded worker/status values; do not guess identity matches or manufacture missing data. Flag required-field failures for review and retain unknown optional fields where supported.
- [ ] Preview the import and report row-level validation failures before writing. Retain source/batch provenance and verify reruns skip duplicates without modifying existing Tiketa records, identifiers or numbering locks.
- [ ] Ensure imported closed jobs do not trigger new-ticket notifications, approval workflows or employee closure-token creation. Preserve source status rather than marking every imported job closed.
- [ ] Rehearse on disposable services with representative data. Record source/imported/rejected/duplicate counts and independently check sampled dates, technicians, statuses and reference links.
- [ ] Back up before the operational import; document and rehearse recovery scoped to the imported batch or a reviewed restore procedure that preserves unrelated writes. No destructive reset or live import during planning.
- [ ] Check imported records under existing history/report permissions. Missing timestamps must remain unavailable in dependent metrics; do not invent timestamps or maintenance plans. Give Rafael sanitized historical fixtures and the imported period for F-05/F-08 verification.
- [ ] Extend existing tests only for uncovered validation, duplicate/rerun, transaction failure, side-effect and report-eligibility cases; document the cutover steps in the existing runbook.

**Acceptance:** Rehearsal reconciles counts and samples; rerunning adds no duplicates; invalid records are reviewable; recovery is demonstrated; historical data is visible in permitted history and selected-month reports without fabricated metrics or operational side effects.

## 4. Handoff order

| Milestone | Backend delivery | Frontend can do while waiting | Completion proof |
| --- | --- | --- | --- |
| S0 | B-00 contract/CI/protection foundation, then B-01/B-02 safety fixes; Jefferson's F-06 | Rafael's F-00/F-01 client/session fixes | Required candidate checks, negative access tests, safe refresh/logout, saved writes |
| S1 | B-04 additive photo API; B-03 governance paired with F-03 | F-02 profile integration; F-03 account-policy cutover | Photo API precedes its caller; governance enters in one combined tested PR |
| S2 | B-05 terminal configuration | F-04 accessible config forms and modal clipping fix | Persisted CRUD, in-use conflict, confirmed intake station |
| S3 | B-06 monthly analytics contract; B-09 migration rehearsal/fixtures; Jefferson's F-06 export | Rafael's F-05 Month/Year controls and F-08 historical verification | Reconciled migration; same selected month yields matching API/UI/CSV/PPTX figures |
| S4 | B-07 latest/older chat pages | F-07 polling lifecycle; F-08 history/CSV fixes | 101-message two-browser check, correct log ownership/export |
| S5 | B-08 backend/recovery/routing gates | F-09 frontend and browser acceptance | Tested candidate + recorded results; user reviews implementation |

## 5. Approval and execution boundary

Approval authorizes implementation of the reviewed scope on feature branches and creation of reviewable PRs targeting develop. Only Jefferson merges under repository rules. It does not authorize merging, destructive migration, or production deployment. These drafts are local ARCH documents; no GitHub branch/file/PR was changed while preparing them.

Not checked: Application tests, migrations, load, actual image decoding, SMTP, deployed routing and PowerPoint rendering have not run. New contracts and the two proposed development/runtime dependencies require execution-time verification after approval.

