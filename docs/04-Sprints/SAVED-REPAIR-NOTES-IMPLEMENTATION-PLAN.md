# Saved Repair Notes: persistence implementation plan

Status: proposed, ready for AGY refinement and execution. Inspected 2026-10-27.
Scope: BF-07 / B-06 / F-06 only. This document does not implement or apply a migration.

## 1. Verified repository state

- `frontend/src/store/slices/notesSlice.ts` initializes five sample guides, generates local IDs, and changes Zustand memory only. The default ticket checklist even contains pre-completed steps.
- `frontend/src/types/ticket.ts` represents template steps as strings and ticket steps as `{id, text, completed}`. Authors are display names, not ownership IDs.
- `frontend/src/features/notes/RepairNotesLibraryView.tsx` calls synchronous actions, immediately closes the form, offers edit/delete without ownership checks, and supplies a fallback sample author. Search covers body and step text as well as title/category.
- `applySavedNoteToTicket` overwrites `ticket.description`. This violates BF-07's original-report preservation requirement. Searching current `frontend/src` found no UI callers for apply/get-checklist actions outside their slice: plan actual controls, not just replacement implementations.
- `frontend/src/features/overview/ITOverviewDashboard.tsx` consumes the library count and first three notes, so it must also load real data.
- No repair-note/checklist model, migration or API was found in `backend/app` or `backend/alembic`. The latest checked-in migration is `0006_location_observations`.
- `backend/app/models/ticket.py` already has `description_enc`, `diagnosis_enc`, and `resolution_notes_enc`. `PATCH /tickets/{id}/service-record` already permits the assigned technician/admin to edit diagnosis/resolution, preserves the employee description, locks the ticket, and invalidates the queue cache.
- Reuse `CurrentUser` from `backend/app/api/deps.py`, encryption helpers from `backend/app/core/security.py`, UUID identifiers, timezone-aware timestamps and existing API client authentication.
- This is source inspection, not an inspection of a running database. Do not infer the deployed schema or applied migration revision from these findings.
- Existing unrelated working-tree change: `frontend/package.json`. Preserve it; recheck status before implementation.

## 2. Recommended decisions to finalize before implementation

Use four normalized tables: reusable guide, ordered template steps, one current checklist instance per ticket, and independent ticket steps. The instance header preserves the applied guide text and provenance even for guides with no steps. Do not add template version history, attachments, tags, ratings, public browsing or another auth role.

Recommended v1 policy:

- Active `it` and `admin` users read all shared library guides and create guides. IT edits/deletes only its own guides; admin manages all. Server derives creator/updater IDs from authentication.
- For ticket checklist reads and writes, use assigned technician/admin access. Check current assignment on every request, including nested step requests. Employees have no access to these staff-only endpoints.
- Checklist mutations/apply are allowed only on `PROG` tickets; `RESL`/`CLSD` are read-only until explicitly reopened. This is a proposed new checklist rule, not a claim about existing service-record behavior.
- One active checklist per ticket. Apply copies a guide into an empty checklist. If one already exists, return 409 unless the user deliberately chooses Replace and submits the current revision. Warn that replacement resets progress. Repeated apply must never silently reset work.
- Applied guide text lives in the checklist header as a service-record reference, displayed separately from technician diagnosis and actual resolution. Applying never writes `description_enc`, `reported_issue_code`, `diagnosis_enc`, `resolution_notes_enc`, task classification, assignee or lifecycle fields. A suggested fix must not automatically become a claim of completed repair.
- Zero template steps is valid, matching the current form. Empty tickets return an empty checklist, with no fabricated SOP or pre-completed steps.

AGY should reconcile these choices with relevant contracts and the master SRS if architectural ambiguity remains. Record refinements here before coding; do not expand into unrelated backlog tasks.

## 3. Proposed database schema

All IDs are UUIDs. All free-text payloads below marked `_enc` use existing application encryption. Use existing `TimestampMixin` conventions and explicit FK deletion behavior.

| Table | Columns and constraints |
| --- | --- |
| `repair_notes` | `id` PK; `title` varchar(200), nonblank; `task_code` FK to `task_categories.code`; `symptom_and_fix_enc` text; `author_id`, `updated_by_id` FKs to users, nonnull; optional `source_ticket_id` FK to tickets; `revision` positive integer default 1; created/updated timestamps. |
| `repair_note_steps` | `id` PK; `repair_note_id` nonnull FK; `position` nonnegative integer; `text_enc` text; unique `(repair_note_id, position)`. |
| `ticket_checklists` | `id` PK; `ticket_id` nonnull unique FK; nullable `source_repair_note_id` FK; nullable `source_revision`; nullable `guide_title_snapshot`, `guide_task_code_snapshot`, `guide_body_enc`; nullable `applied_by_id`, `applied_at`; nonnull `created_by_id`, `updated_by_id`; positive `revision` default 1; created/updated timestamps. Manual checklists have no applied-guide metadata. |
| `ticket_checklist_steps` | `id` PK; `checklist_id` nonnull FK; `position` nonnegative integer; `text_enc` text; `completed` boolean default false; nullable `completed_at`, `completed_by_id`; created/updated timestamps; unique `(checklist_id, position)`. Completion metadata must be present iff completed. |

Deletion/index policy:

- Deleting a library guide cascades only its template steps. Set applied instances' source FK to null; keep all snapshots, source revision, ticket steps and progress.
- Editing template steps never changes ticket steps. No foreign key from a ticket step to a template step is needed.
- Ticket deletion cascades its checklist and steps; source-ticket deletion sets `repair_notes.source_ticket_id` null. Existing ticket deletion policy remains authoritative.
- User references use RESTRICT/NO ACTION; retain authorship and use existing user deactivation rather than adding user deletion behavior.
- Category references are restricted; snapshot category is a plain copied code, not a dependency on the live guide.
- Index library category, author, source ticket and `(updated_at, id)` for stable listing; index nullable source guide FK. Parent/order unique indexes cover step reads and unique ticket FK covers checklist lookup.
- Use server-derived display names/category names in responses, not duplicated authority fields supplied by the browser. Titles remain plaintext metadata; encrypt body and step content. Never log decrypted content.
- Proposed request limits: title 1–200 trimmed characters, body 1–10,000, at most 100 steps, each 1–1,000 trimmed characters. Enforce before encryption; confirm bounds against contracts during refinement.

Create a new migration after the actual Alembic head at execution time (currently 0006). Register models in `app/models/__init__.py`. No sample-data backfill; existing local mock IDs are not real records to migrate. Do not change old migrations.

## 4. Proposed API contract

All paths use `/api/v1`; use snake_case DTOs and typed frontend mapping. Define request/response schemas and document them before UI integration.

| Method/path | Behavior |
| --- | --- |
| GET `/repair-notes` | Paginated shared library: `offset`, `limit` (1–100), optional `task_code`, `q`; stable updated-at/id order; `{items,total}`. |
| GET `/repair-notes/{id}` | Full guide, ordered steps, author/updater identity, source ticket code if present, timestamps, revision and derived edit permission. |
| POST `/repair-notes` | Create from title, task code, body, ordered step strings, optional authorized source ticket ID; 201 with authoritative guide. |
| PATCH `/repair-notes/{id}` | Update editable fields, expected revision, optionally replace ordered steps atomically; increment revision. |
| DELETE `/repair-notes/{id}` | Author/admin only, expected revision; 204. Existing ticket copies survive. |
| GET `/tickets/{ticket_id}/checklist` | Return header/snapshot, ordered steps and revision; absent checklist returns a documented empty representation with revision 0. |
| POST `/tickets/{ticket_id}/checklist/apply` | `repair_note_id`, `expected_note_revision`, `expected_checklist_revision`, `replace_existing` default false; atomic copy; authoritative checklist response. |
| POST `/tickets/{ticket_id}/checklist/steps` | Add manual step with expected checklist revision; create instance if absent; append in order. |
| PATCH `/tickets/{ticket_id}/checklist/steps/{step_id}` | Explicit `text` and/or `completed` plus expected checklist revision; never server-side toggle. |
| DELETE `/tickets/{ticket_id}/checklist/steps/{step_id}` | Remove only a step belonging to this ticket; expected checklist revision; return updated checklist. |

Use query parameters for delete revision preconditions or document a consistent header convention. Missing/stale preconditions must not silently become last-write-wins. 401 unauthenticated; 403 unauthorized; 404 missing/mismatched nested resources; 409 revision/lifecycle/replacement conflicts; 422 invalid payload/category.

Search requires an explicit encryption decision: current UI searches encrypted body/steps too. Recommended initial implementation: database category filtering, then decrypt/search authorized candidate guides in the service before pagination, returning the actual filtered total. Document that this is linear work and appropriate only for a small library; avoid SQL LIKE over ciphertext or quietly searching one page. If scale warrants title/category-only search, document the scope change and change the UI placeholder. Do not introduce plaintext content indexes in this task.

Transactions/concurrency:

- Lock the parent library row for edits/deletes and while copying its steps. Lock ticket then checklist consistently for all checklist mutations. Recheck ownership, status and revisions under lock.
- Copy header and ordered steps in one transaction, generating new UUIDs and setting every copied completion false. Concurrent first creation must respect unique ticket ID; return a useful conflict rather than a partial write.
- Increment checklist revision for each actual mutation, stamp actor/timestamps, and return complete authoritative state. Reorder/replacement must avoid temporary violations of unique positions (delete/flush/insert for template replacement is acceptable).
- Explicit completion values plus revision checks prevent retries from toggling twice. After ambiguous network failure, refetch before retrying writes; do not automatically replay destructive replacement.
- Reuse the repository queue invalidation convention if ticket-visible state changes. Handle post-commit cache failure as potentially persisted: refetch/reconcile rather than telling the user a failed response proves rollback. Do not cache decrypted library payloads initially.

## 5. Implementation sequence and file boundaries

1. Refine this proposal, document permission/lifecycle/apply/search decisions and update the relevant API/data dictionary entries. Check branch and dirty files. Use feature branches based on `develop`, with repository naming `feat/backend-*` / `feat/frontend-*`; never overwrite existing work or commit/push to protected branches.
2. Add `backend/app/models/repair_note.py` and checklist models (same module or a small companion module), migration, model exports and schemas following the actual repository schema layout. Validate migration upgrade/downgrade and metadata parity on disposable PostgreSQL.
3. Add focused services and routers for notes/checklists; register in `backend/app/main.py`. Reuse authentication/encryption and transaction conventions without adding business logic to the frontend. Keep public ticket responses free of guide data.
4. Add backend integration tests, then document final response examples. Regenerate `backend/openapi.json` using the existing repo workflow if it is maintained as a checked-in contract.
5. Add typed API helpers, preferably `frontend/src/api/repairNotes.ts` using existing `apiClient`; update `SavedRepairNote` and add checklist DTO/domain types. Include author UUID, revision, source ticket UUID, ISO timestamps and ordered step identifiers where needed.
6. Replace mock constants and synchronous actions in `notesSlice.ts` with async fetch/mutation methods, loading/error state and per-ticket checklist state keyed by ticket UUID. Keep checklists separate from queue objects so queue refresh cannot erase progress. Return promises to UI callers. Reset library/checklist data and invalidate in-flight requests on logout/session changes; protect against late fetches overwriting newer writes and switching tickets mid-request. Preserve `resetReportsState()`.
7. Update library form and cards: await success before closing/toasting, retain drafts after errors, disable pending writes, show retry/empty states, use real author names and author/admin controls. Fetch/paginate all intended results and implement the agreed search behavior. Update overview counts/previews using authoritative total and recent items; a page length is not the library total.
8. Add an Apply Guide picker and persisted checklist component to the actual service-record drawer/workbench entry points. Inspect `components/tickets/JobLogDrawer.tsx`, `components/tickets/drawer/JobLogDrawerRecordForm.tsx` and their current hooks. Show applied guide text separately, support add/edit/delete/check completion, and provide explicit replacement confirmation. Load on ticket selection and refetch on focus/reopen so another session's work becomes visible. Offer save-as-library-guide from a ticket with an editable preview, authorized source ticket UUID and unchecked template steps; never auto-save employee details into shared notes.
9. Update BF-07/B-06/F-06 checkboxes only after their acceptance checks pass. Keep store composition small, strict TypeScript and atomic selectors. Do not bundle fixes for unrelated intake/chat/reporting work.

## 6. Verification and delivery gates

Backend tests must use the existing disposable setup: `TIKETA_TEST_DATABASE_URL` database ending `_test` and `TIKETA_TEST_REDIS_URL` ending `/15`. The fixture migrates down to base and truncates data: never point it at development or production data.

- Migration: upgrade from current head with existing tickets; downgrade new revision and upgrade again in disposable DB; Alembic metadata check. Existing ticket reports and diagnosis/resolution remain byte-for-byte unchanged by the new migration/apply operations.
- Persistence: CRUD via fresh requests/sessions; ordered steps; manual checklist; no sample data; source ticket validation; input limits and invalid category tests; ciphertext differs from submitted text.
- Access: owner/other IT/admin/unauthenticated matrix; reassignment revokes prior tech's access; wrong-ticket step IDs denied; author spoofing rejected/ignored by schema policy; inactive account rejected.
- Independence: edit/delete source after application; snapshot and progress survive; two tickets applying the same guide have independent steps and completion.
- Safety: original description, diagnosis, resolution, classification and lifecycle preserved by apply; all copied steps incomplete; duplicate apply conflict; explicit replacement works; transaction failure rolls back all rows.
- Concurrency: stale edit/delete/apply/step requests return conflict; competing initial creates produce one instance; no double toggle; completion metadata stays consistent.
- Frontend focused tests: failed save retains draft and gives no success toast; permissions; stale responses after logout or ticket switch; queue refresh preserves checklist; pagination/search/count correctness; failed apply preserves existing progress.
- Run frontend `npm run type-check`, `npm test`, `npm run build`, and relevant lint checks; run focused backend tests and existing ticket/auth regression tests using the repository toolchain. Record pre-existing failures separately rather than claiming a clean run.
- Manual separate-session scenario: tech creates guide, admin/second tech sees it after fetch, owner edits, assigned tech applies to a PROG ticket, changes steps/progress, refreshes, then source guide is deleted. Applied guide remains. Test unauthorized writes and network failure. Verify empty library on a fresh DB.

Deliver exact changed files, migration revision, test results, any unexecuted checks and deployment order (migration/backend before dependent frontend). No merge or production deployment is authorized by this planning document. Only Jefferson Lopez merges PRs targeting `develop`.
