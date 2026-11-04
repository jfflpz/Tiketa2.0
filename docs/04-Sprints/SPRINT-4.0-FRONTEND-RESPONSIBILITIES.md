# Tiketa Sprint 4.0 — Frontend Responsibilities

Owner: Rafael Emmanuel Codiñera. Status: planned. Updated: 2026-11-04.

Read the [master plan](SPRINT-4.0-MASTER-PLAN.md) before implementation. It owns shared decisions, S4 acceptance criteria, exact export columns, date meanings and merge rules. Pair with [Jefferson's backend track](SPRINT-4.0-BACKEND-RESPONSIBILITIES.md). Dates and demo deadline are undecided.

## 1. Execution approach

Use current develop and preserve existing local changes. Read repository `AGENTS.md`, `docs/AI-CONTEXT.md` and the frontend architecture guidance for the affected feature. Reuse existing components, client, domain slices, atomic selectors, routing and session reset patterns. Update all callers/types/fixtures touched by a real contract change.

Source evidence identifies likely causes, not runtime certification. Reproduce against the real backend before implementing. Layout work and isolated test fixtures can proceed independently; an integrated feature is done only after saved data survives independent reads/reload.

## 2. Tasks

### F-00 — Reproduce and align integration contracts

Pairs: B-00. Covers: all S4 outcomes.

- Record candidate SHA, environment and dirty files. Reconcile the newer remote develop with local work before touching shared `client.ts`, report tables, auth/team mappings or workbench files.
- Capture actual browser/network cases for every affected flow, including account role and ticket ID. Use safe non-production data.
- Confirm existing components/APIs and all impacted callers before edits. Agree exact changed requests, responses, errors, scope and paging with Jefferson.

Done: each task has a reproducible baseline, correct backend pairing and a bounded implementation path. Verification-only backend work does not block unrelated UI work.

### F-01 — Make direct verification links finish loading

Pairs: B-01. Covers: S4-09. Depends: agreed verification response contract.

Source: `store/slices/ticketVerificationSlice.ts`, `features/kiosk/EmployeeTicketScreen.tsx`, client verification helpers and existing tests.

- Correct URL startup so lookup starts once from a valid state; cover `/?verifyTicket=T-2610-0111` with a real existing test ticket.
- Handle the agreed identity-required response explicitly. Show distinct invalid/expired/denied/server-error outcomes with retry where appropriate.
- Preserve credential scope, private access checks, race fencing, cleanup on navigation/session change, and valid confirmation behavior.

Done: fresh-session direct link, identity match/mismatch, expired credential and backend failure all exit loading correctly; private data stays protected.

### F-02 — Apply saved repair guides using the valid revision contract

Pairs: B-02. Covers: S4-14. Depends: initial-revision contract; incompatible changes merge together.

Source: `components/tickets/checklist/TicketChecklistSection.tsx`, checklist client/types and state.

- Send the agreed revision for an initially empty checklist instead of the current invalid payload.
- Preserve optimistic-concurrency handling, guide identity, current progress and intended replacement confirmation. Surface actionable validation/conflict errors.
- Refresh the saved checklist from the server after success; preserve input/progress on failure as appropriate.

Done: first valid apply survives reload; stale revision, retry, invalid guide, existing progress and permission failures behave correctly.

### F-03 — Keep conversations stable through polling

Pairs: B-03 verification. Covers: S4-11. Start: F-00.

Source: `store/slices/ticketQueueSlice.ts`, `ticketOperationsSlice.ts`, both staff/public ticket mappers and conversation callers.

- Reproduce queue/comment polling overlap. Fix state ownership once so refreshed ticket metadata does not clear loaded conversation messages.
- Reconcile by server message ID, retain pending sends and older loaded pages, and fence stale responses by ticket/session. Preserve author/internal visibility and existing API order/paging.
- Keep conversation state through transient fetch failure; retain loading/error feedback, retry, and cleanup on ticket switch/logout.

Done: two-browser messages remain stable during repeated queue/comment refreshes, send retries and paging, without duplicate messages or cross-ticket/session leakage. Add a focused race regression.

### F-04 — Intern pending approval and supervisor overall history

Pairs: B-04. Covers: S4-06/S4-13. Depends: verified history/status contract.

Source: `features/workbench/ITWorkbenchBoardView.tsx`, `features/joblogs/JobLogSheetView.tsx`, history/status clients and selectors.

- Keep the Intern's assigned RESL ticket selectable and visible as Waiting for requester approval. Pending sign-off is read-only for repair actions unless an existing permitted action applies.
- Requester approval closes the ticket; rejection follows existing reopen rules and shows its reason. Keep closed work in history, with refreshed status after reload.
- Treat Supervisor as permitted overall-history reader alongside Admin. Preserve existing edit/delete permissions and operational queue restrictions.
- Page history completely as needed; keep its state independent of active queue. Replace silent queue fallback with explicit empty/error/retry handling.

Done: intern resolve/wait/reject/approve and Supervisor other-technician history pass in separate sessions, including multiple pages and denied edits.

### F-05 — Replace invented personal KPI values with saved data

Pairs: B-05; uses B-04 history. Covers: S4-01/S4-13.

Source: `features/overview/ITOverviewDashboard.tsx`, ticket mapping/types, relevant report/history state and overview callers.

- Remove +16, 40/36 fallbacks, static output/mode/hour arrays, invented targets/ratings and empty-data 100% displays.
- Match records by actual assignment user UUID and calculate from complete authorized history, not display names or the active queue. Use the existing API/data model before requesting a new aggregate.
- Personal completed counts include requester-approved CLSD only. Keep repair time independent of sign-off wait. Preserve unrelated organization report formulas and distinguish their labels.
- Empty counts are 0; unavailable averages/percentages and unsupported metrics say No data. Errors must not masquerade as empty success. Charts and labels state their actual period and data source meaning.

Done: new account, same-name accounts, records beyond one page, pending approval, closure and failed reads produce truthful personal results. Add a small data/state regression covering ownership and empty denominators.

### F-06 — Intern creation, role labels, profiles and avatar updates

Pairs: B-06. Covers: S4-02/S4-03/S4-12. Depends: governance/photo permissions and metadata contract.

Source: `features/team/components/CreateITStaffModal.tsx`, auth/team slices, `features/profile/MyProfileModal.tsx`, `HeaderProfilePopover.tsx`, shared `StaffAvatar` and its callers.

- Add IT Intern to the existing account proposal/approval UI with the existing role identifier. Retain governance, validation and safe error feedback.
- Display the four agreed role names consistently without changing API role values or inventing job seniority.
- Enable Intern self-profile and upload/replace/remove controls. Map saved avatar metadata through auth hydration/login/self and staff directory updates; stop treating generated remote avatars as saved photos.
- Reuse the shared avatar path to fetch protected image bytes with the authenticated client, manage object-URL cleanup and cache/version refresh, and retain initials fallback for absent photos.
- Update current-user and other existing staff bubbles after save/remove and reload. Preserve upload boundary handling and show validation errors. No bearer tokens in image URLs.

Done: Intern creation/approval and all four roles' profile/photo flows pass, including absent image, replacement, removal, reload, invalid upload and denied write. Existing bubbles show the same saved photo.

### F-07 — Shared daily, weekly, monthly and custom periods

Pairs: B-07; B-04 for job logs. Covers: S4-07/S4-08. Depends: exact existing report and additive history date contracts.

Source: `features/reports/components/ReportPeriodSelector.tsx`, `features/reports/utils/periodUtils.ts`, reports slice, report/analytics callers and export filter builders.

- Extend existing period state/control with Daily, Weekly, Monthly and Custom From/To. Use inclusive Asia/Manila dates and Monday–Sunday weeks; validate before fetching.
- Send one filter snapshot to supported report data, totals, backend CSV and existing PPTX callers. Connect job logs/CSV/XLSX through F-08 using the same period state, while preserving each screen's authorized scope and filters.
- Label existing date bases from master section 4. Reset on session change, cancel/fence stale requests, and refetch affected data together without letting late results replace the selected period.
- Show Available for complete months only for partial-month maintenance, allowing other supported queries to finish normally. Keep server failure and empty period distinct.

Done: date/window unit tests and browser checks cover daily, Sunday/Monday weeks, complete/partial/multi-month ranges, reversed input, leap day, rapid selection, errors and export agreement. Preserve existing PPTX modal validation/caller behavior.

### F-08 — Complete 15-column job-log CSV and XLSX

Pairs: B-04 for filtered complete history. Covers: S4-07/S4-10. Depends: F-04 history scope, F-07 filter snapshot, merged history date API.

Source: `features/joblogs/JobLogSheetView.tsx`, existing CSV sanitization helpers and export tests. CSV currently belongs to this frontend view; summary-report CSV remains server-owned.

- Retrieve all permitted matching history pages and apply the same range/scope/search filters as the displayed job logs. Never export a partial first page or silently fall back to active queue data.
- Share one canonical row mapping between CSV and XLSX, using the exact 15 headers in master section 4 and each row's actual worker. Preserve correct blanks/zeros, dates, duration and text.
- Keep CSV quoting, Unicode, leading-zero identifiers and formula-injection protection. Implement downloadable XLSX with simple readable table layout, explicit text fields, appropriate typed dates/durations and safe user text.
- Inspect installed export tools first. If none can write XLSX, agree the smallest maintained writer at the appropriate existing layer with Jefferson; this is an implementation choice, not a new report platform.
- Keep summary reports' columns/formats intact; their period support belongs to F-07/B-07. Disable misleading success on a failed/incomplete export.

Done: CSV/XLSX open correctly and contain identical complete filtered records beyond 200 rows, exact column order, actual worker attribution, special/Unicode text, zero values and no executable user-supplied formulas.

### F-09 — Clickable cards, read-only people details and employee filters

Pairs: B-08. Covers: S4-04/S4-15. Depends: verified directory fields/filter/paging support.

Source: `features/team/TeamAdministrationView.tsx`, staff/employee tables, edit modals and directory state/client.

- Summary/count cards navigate to matching lists. Individual person cards/rows open a small read-only details view using existing field presentation; keep Edit a separate permission-controlled action.
- The existing self-profile reads currentUser only; do not repurpose it to edit another account or add a new profile subsystem. Reuse appropriate modal/layout primitives.
- Add combined name/employee-ID, Company, Location, Department and Active/Inactive filters plus Clear filters. Filter the full authorized dataset, reset paging appropriately, and handle dependent location/department options correctly.
- Preserve leading-zero IDs, keyboard activation, focus return, loading/error/empty states and distinct nested action behavior.

Done: both card destinations, safe read-only details, permitted Edit, combined filters beyond a first page, Clear filters and keyboard use pass.

### F-10 — Simple wording and ticket drawer/workbench layout

Pairs: B-09 meaning/persistence review. Covers: S4-05/S4-16. Can begin after F-00 without new API work.

Source: shared navigation/header text, `components/tickets/drawer/JobLogDrawerRecordForm.tsx`, `features/workbench/ITWorkbenchBoardView.tsx`, affected report/team copy.

- Replace confusing user-facing wording such as fleet with an accurate common term for its context; preserve useful domain distinctions. Keep internal fields/route IDs stable for label-only changes.
- Remove PH 15 Hubs from the navbar and Switch Bench from the workbench header. Preserve a usable existing route to other assigned tasks if that control currently supplies it.
- Fix task-category menu clipping/stretching using existing dropdown/overlay patterns. Preserve keyboard navigation, focus, scroll containment and responsive layout.
- Move Original Employee Report & Context immediately above the SOP Checklist. Rename Technician Diagnosis & Exact Problem Record to Technician Notes without merging/deleting existing saved fields or changing validation.

Done: inspect all affected roles, desktop/small viewport, opened dropdown and saved/reloaded notes. Trivial wording/order changes need visual inspection rather than tests that mirror markup.

### F-11 — Joint acceptance and merge evidence

Pairs: B-09. Covers: all S4 outcomes.

Run the applicable frontend tests, type-check/build and repository quality checks documented in `docs/STANDARDIZED-TESTING.md`, checking actual scripts/CI. Add focused tests for new non-trivial logic, especially races, dates, ownership, revision/error handling and export data.

Exercise the master completion scenarios against the real backend and independent sessions/readbacks. Record candidate SHA, backend merged SHA or paired PR, persisted IDs, expected/actual results, checks and browser evidence. Obtain peer review and let Jefferson merge; repeat the affected smoke on develop.

Done: every mapped S4 acceptance row passes and failures/blockers remain explicit. A frontend feature depending on unmerged backend behavior is not marked integrated or merged alone.

## 3. Parallel work and dependencies

1. F-00/B-00 first. F-10 and existing-client layout work can proceed while changed contracts are settled.
2. F-01/F-02 pair with their backend contracts; F-03 primarily repairs client state after B-03 verifies persistence.
3. F-04 and B-04 establish visibility/history; F-05 needs complete personal history, F-08 needs complete period-filtered history.
4. F-06 follows B-06 permissions/metadata. F-07 follows B-07 report rules; F-09 follows B-08 directory support.
5. F-08 joins F-04/F-07 and the merged history date contract. F-11/B-09 close the integrated sprint after focused feature merges.

Coordinate overlapping store/client/workbench files before parallel edits. Use additive backend-first handoffs where compatible and one combined feature PR for incompatible paired changes, as specified in the master.
