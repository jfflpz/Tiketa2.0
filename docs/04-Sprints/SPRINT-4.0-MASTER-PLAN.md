# Tiketa Sprint 4.0 — Master Plan

Status: requirements agreed; implementation not started under this plan. Updated: 2026-11-04.

## 1. Goal, owners, and schedule

Make ticket verification, conversations, repair guides, intern approval visibility, account profiles, and reporting work reliably against saved records. Simplify the affected navigation and wording.

| Responsibility | Owner |
| --- | --- |
| Backend, persistence, authorization, API contracts | Jefferson Lopez |
| Frontend, state, accessibility, browser integration | Rafael Emmanuel Codiñera |
| Contract review and integrated acceptance | Both developers |
| Merge into develop | Jefferson only, after peer review |
| Start date / end date / demo deadline | All undecided |

All reported issues remain in Sprint 4. Delivery order is correctness, accounts/profiles and reporting, then wording/layout. This is an agreed backlog, not a dated capacity commitment. Reproduce first, then estimate using actual availability.

Execution documents: [Backend responsibilities](SPRINT-4.0-BACKEND-RESPONSIBILITIES.md) and [Frontend responsibilities](SPRINT-4.0-FRONTEND-RESPONSIBILITIES.md). This master owns shared behavior and acceptance criteria; the tracks own implementation and handoff steps.

ARCH copies live in `01-Projects/Tiketa/`; repository copies live in `docs/04-Sprints/`, with the same filenames and content. Update all three documents in both locations together when an agreed decision changes.

## 2. Evidence and implementation boundary

Repository: [jfflpz/Tiketa2.0](https://github.com/jfflpz/Tiketa2.0). Initial source audit: `4643097715a39211b808da74bd6cf13e38f6cbb1`. GitHub develop checked when publishing this plan: `f51a5cbfc0daeed59bf91ad3c151501794ddba93`, five commits ahead. Those commits include photo PUT alignment/POST compatibility, branding, and dashboard layout changes; they do not establish that these bugs are fixed.

Findings below are source evidence or hypotheses, not successful runtime reproduction. B-00/F-00 must capture actual requests, responses, and browser behavior on the implementation candidate.

| Source area | Finding that guides reproduction |
| --- | --- |
| `frontend/src/features/overview/ITOverviewDashboard.tsx` | Static chart arrays, personal resolved count +16, 40/36 fallback totals, empty denominator displayed as 100%, and first-name ownership matching remain. |
| `frontend/src/store/slices/ticketVerificationSlice.ts`; `frontend/src/features/kiosk/EmployeeTicketScreen.tsx` | URL initialization enters loading while the screen starts lookup only from idle. Client/backend verification APIs exist; identity-required error handling also differs. |
| `frontend/src/store/slices/ticketQueueSlice.ts`; `ticketOperationsSlice.ts`; ticket mappers | Queue replacement can reset messages while comment polling repopulates them. Confirm the race before changing polling. |
| `backend/app/api/repair_notes.py`; `backend/app/schemas.py`; `TicketChecklistSection.tsx` | Empty checklist revision 0 can be submitted to a request schema requiring a positive expected revision. Confirm the failing payload and retain conflict handling. |
| `frontend/src/features/workbench/ITWorkbenchBoardView.tsx` | Intern focus/picker selects PROG, although the backend active read includes RESL. |
| Photo API, auth/team mapping, shared avatar, profile popover | Protected photo reads, missing metadata mapping, generated placeholder avatars, and an Intern photo permission/UI gap can independently prevent display. |
| `frontend/src/features/joblogs/JobLogSheetView.tsx` | Overall scope is Admin-only in the UI, although backend history permits Supervisor reads. A single history page and queue fallback can hide missing records/errors. |
| `backend/app/api/reports.py`; `backend/app/api/tickets.py` | Reports accept dates; maintenance requires complete months. History currently has no date filters. Most reports use date_started; maintenance uses date_finished. |

Live code takes precedence over older notes. Older two-role and governance descriptions conflict with the implemented four-role system. Use the current account proposal/approval rules; adding Intern must not introduce a bypass.

Preserve existing local changes, including the two observed frontend files `frontend/src/api/client.ts` and `frontend/src/features/reports/components/tables/TransitLagTable.tsx`. Recheck working trees before implementation. This documentation does not authorize discarding or staging unrelated work.

## 3. Traceability and acceptance

R01–R21 separate every requested outcome, including the two outcomes in the original account-creation/role-label bullet. The two reporting-period requests intentionally share one implementation.

| Outcome | Original request | Backend task | Frontend task | Acceptance |
| --- | --- | --- | --- | --- |
| S4-01 | R01: New account already has KPI values | B-05 | F-05 | Personal records match assignment user UUID. Empty counts are 0; averages/percentages without eligible data say No data. Remove invented chart values and offsets. Organization figures are separately labelled. |
| S4-02 | R02: Intern absent from account creation | B-06 | F-06 | Intern can be proposed and approved through existing governance; saved role survives reload and permissions remain correct. |
| S4-03 | R03: Navbar shows job titles instead of roles | B-06 verification | F-06 | Display exactly IT Support, IT Intern, Administrator, Supervisor across affected staff screens; preserve API role identifiers. |
| S4-04 | R04: IT Team and Employees cards should be clickable | B-08 verification | F-09 | Count cards open matching lists; person cards/rows open read-only details. Edit remains a separate permitted action. Mouse and keyboard work. |
| S4-05 | R05/R08/R19: Simple wording; remove PH 15 Hubs and Switch Bench | B-09 review | F-10 | Affected user-facing wording uses common, accurate terms. Both unwanted header items are removed without removing needed task access. |
| S4-06 | R06: Supervisor can view overall job logs | B-04 | F-04 | Supervisor can read organization-wide history and details, including other technicians, without new edit/delete permissions. |
| S4-07 | R07/R16: From/To plus daily, weekly, monthly reporting | B-07; B-04 | F-07; F-08 | Shared selection controls supported tables, totals, report exports/PPTX, and job-log CSV/XLSX. Inclusive dates; Monday–Sunday weeks; Asia/Manila. Late responses cannot overwrite a new selection. |
| S4-08 | Reporting constraint clarified during planning | B-07 | F-07 | Partial-month maintenance selection shows Available for complete months only. Other supported reports still work. Preserve complete-month calculations; no prorated percentage. |
| S4-09 | R09: Copied verification link loads forever | B-01 | F-01 | Direct link from a fresh session reaches the correct identity/verification result. Invalid, expired, denied, and unavailable responses exit loading without exposing private ticket details. |
| S4-10 | R10: CSV layout; agreed XLSX addition | B-04 support | F-08 | Job-log CSV and XLSX contain all matching records and the canonical 15 columns below. XLSX uses the sample's simple table layout. Summary reports keep their meaningful columns and existing formats. |
| S4-11 | R11: Chat messages appear/disappear | B-03 verification | F-03 | Messages remain visible through queue/comment polls, reload, retry and another participant's send. No duplicate server messages, lost older pages, or cross-ticket/session leakage. |
| S4-12 | R12/R14: Photos absent from bubbles; Intern lacks profile/photo | B-06 | F-06 | All four staff roles can manage their own photo. Existing staff avatar bubbles update after save/remove and reload. Intern has self-profile access; writes remain self-only. |
| S4-13 | R13: Intern-resolved task disappears before requester approval | B-04; B-05 | F-04; F-05 | Assigned RESL stays visible as Waiting for requester approval. Approval closes it; rejection returns active work with reason using existing reopen rules. Only approved/closed tickets count as personal completed work. |
| S4-14 | R15: Applying saved repair guide returns 422 | B-02 | F-02 | First valid apply succeeds and persists. Stale revision, invalid guide, denied access, and existing checklist progress retain correct validation/conflict behavior. |
| S4-15 | R17: Employee profile filters | B-08 | F-09 | Name/employee-ID search, Company, Location, Department, Active/Inactive combine correctly across pages. Clear filters resets them. Empty results and errors are distinct. |
| S4-16 | R18/R20/R21: Dropdown stretching/clipping; report order; notes title | B-09 verification | F-10 | Task-category menu is fully visible without stretching its card. Original Employee Report & Context sits immediately above SOP Checklist. Diagnosis heading becomes Technician Notes; saved content and validation remain intact. |

## 4. Shared contracts and decisions

### Ticket status, timing, and personal metrics

Reuse OPEN/PROG/RESL/CLSD. Intern marking resolved moves work to RESL, visibly awaiting requester approval; approval produces CLSD. Rejection uses existing reopen authorization/history and returns active work with the reason. Preserve other roles' workflows.

Repair duration stops at technician resolution. Requester approval is separate and must not extend repair duration. Preserve current reopen timing rules. Personal completion counts require requester-approved closure. Keep unrelated organization-wide definitions, including existing RESL+CLSD report completion where currently used. Make personal and organization labels distinguish those meanings.

Use complete authorized history, not the active queue or the first page, for personal historical calculations. Match by authenticated user UUID, never names. Derive only metrics supported by persisted fields; unsupported averages/ratings/targets say No data rather than fabricated values. Start with existing history APIs and frontend calculation; introduce an additional aggregate only if verified payload or performance limits require it and record that contract before dependent work.

### Reporting selection and date basis

Use existing date_from/date_to conventions with explicit inclusive calendar dates in Asia/Manila. Daily selects one date; weekly selects Monday through Sunday; monthly selects the complete calendar month; custom accepts valid From <= To. Keep selection in the existing report state and reset/cancel with session state. Apply the same filter snapshot to requests, labels and exports; preserve company/location/department filters.

Keep existing report meanings: most reports/KPIs use Date Started (`date_started`); maintenance uses Date Finished (`date_finished`). Job logs and their CSV/XLSX use Date Started. Label the date basis. `date_started` is currently set at ticket creation and is distinct from actual repair-start timestamp `started_at`; do not silently substitute fields. Hourly bins retain their current actual-start meaning.

Planned additive history contract: extend existing GET `/tickets/history` with optional `date_from` and `date_to` using inclusive `date_started` filtering. Validate reversed ranges. Preserve existing response array, default behavior when dates are omitted, stable sorting, paging limits and role scope. Intern/IT remain self-scoped; Admin/Supervisor may read permitted overall history. Keep this static route ahead of dynamic ticket-ID routes. Implement in B-04 before dependent F-07/F-08 integration.

For a range containing only complete calendar months, preserve supported maintenance calculation behavior. For any partial month, render the agreed unavailable message for maintenance only; do not widen the selected range, display a percentage, or let its failure prevent other report reads. Verify multi-month behavior under B-07.

### Verification, guide revisions, chat, photos, and directories

Reuse the current verification endpoints. B-01/F-01 must agree on the existing HTTP/error response that means identity is required; support it explicitly instead of guessing from text. Public ticket codes do not grant private access. Preserve expiry and credential validation.

B-02 defines the valid initial checklist revision convention with F-02: revision 0 describes an empty checklist and must not cause a valid first apply to fail. Preserve stale-write detection; do not solve 422 by dropping revision validation altogether. Record the exact final schema and request example.

Comment APIs keep their existing array, author fields, role visibility, pagination and ordering contracts. Merge by server message ID, retaining pending messages and older loaded pages. B-03 changes the server only if reproduction identifies a server defect; frontend state preservation is F-03.

Use existing PUT/DELETE `/users/me/photo` and authenticated GET `/users/{id}/photo`. Extend required self-photo permissions to Intern while preserving existing validation and read authorization. Map saved avatar metadata consistently. Load protected image bytes through the authenticated client; keep bearer credentials out of URLs. Follow multipart boundary handling and version/cache invalidation in B-06/F-06. Do not rely on generated avatars as saved photo data.

Reuse directory APIs and dictionaries for employee filters/details. B-08 records supported filters and pages; add only missing filter support required for complete results. Person details use a small read-only view consistent with existing field presentation; the current self-profile must remain bound to the authenticated user.

### Job-log export contract

The supplied `sample_15_columns.xlsx` is an Orders example. It provides simple table layout only, not sales fields to import into Tiketa. CSV has no workbook styling. The new XLSX is for job logs only; existing summary-report formats retain their own columns. Do not add an uploader.

Preserve canonical order and identity:

```text
01_Company,02_Mode,03_Department,04_Requestor,05_Task,
06_Description,07_Month,08_Date_Started,09_Time_Started,
10_Time_Finished,11_Duration_Hrs,12_Date_Finished,
13_Status,14_Location,15_Worked_By
```

Job-log CSV is currently frontend-generated; summary-report CSV is backend-generated. Reuse those layers. CSV/XLSX must share the same filtered row mapping, actual worker attribution, date basis and complete paged results. Preserve CSV quoting, Unicode, leading-zero identifiers, formula-injection protection, blanks and zero values. XLSX uses explicit text for text fields and typed dates/times/durations where supported, readable widths, a simple header/filter row, and no executable formulas from user text. Use an existing suitable dependency first; choose the smallest maintained writer at the appropriate layer only if needed.

## 5. Delivery and integration sequence

| Stage | Work | Exit condition |
| --- | --- | --- |
| 0 — Reproduce and agree contracts | B-00 + F-00 | Candidate SHA recorded; requests/statuses captured; source hypotheses classified; exact changed contracts and impacted callers agreed. |
| 1 — Ticket correctness | B-01/F-01, B-02/F-02, B-03/F-03, B-04/F-04 | Direct verification, guide apply, two-browser chat, and intern pending/rejected/approved paths pass against real persistence. |
| 2 — Accounts and accurate data | B-05/F-05, B-06/F-06 | Empty account, same-name users, approval-based personal counts, Intern creation, four-role profiles/photos pass. |
| 3 — Reporting and directories | B-07/F-07, B-04/F-08, B-08/F-09 | Date boundaries, partial maintenance, complete exports, supervisor scope, filters and person details pass. |
| 4 — Clarity and release verification | F-10, B-09/F-11 | Requested wording/layout and joint regression acceptance pass; evidence linked per S4 outcome. |

Frontend layout/wording and established-client work can proceed while backend contracts are prepared. Work touching `client.ts`, auth/team mappings, history, reports state, or the workbench must be coordinated between feature branches.

Use small feature PRs from current develop. Additive server changes can merge first when existing callers still work. Dependent frontend PRs identify the merged backend SHA. If a status/error/permission change is incompatible with the old caller, combine both halves into one feature PR and test that candidate together. Separate ownership does not justify merging incompatible halves independently.

Before each merge, update the candidate against current develop using the repository workflow; run applicable checks from `docs/STANDARDIZED-TESTING.md` and the actual CI configuration. Include both tiers for changed shared contracts, OpenAPI/client fixtures, and migrations if needed. Verify the resulting candidate, then repeat the affected smoke on develop after merge. Branch protection was reported off when checked; follow peer-review/check requirements regardless and do not claim enforcement exists without verifying settings. This sprint does not add a separate CI platform project.

## 6. Completion evidence

Each S4 outcome is done only when its acceptance row passes with real backend data and relevant role permissions. Record task IDs, frontend/backend owner, candidate and develop SHAs, environment, expected/actual results, changed contracts, checks, reviewer, and evidence links in its PR. Track Planned -> Reproduced -> API ready (if needed) -> Connected -> Verified -> Merged. Verification-only backend work can close with evidence and no backend diff.

- Empty/new and same-name accounts: correct personal ownership, zero/No data states, genuine chart data and distinct organization labels.
- Intern assignment -> resolve -> waiting visibility -> reject/reopen or approve/close: status, reason, duration, personal count and persisted history agree after reload.
- Direct verification link: fresh session, identity match/mismatch, invalid/expired credential, denied access and backend failure all leave loading correctly.
- Guide first apply and reload, retry, stale revision, existing progress, invalid guide and denied actor.
- Chat across two browsers with queue polling, comment polling, pending send, paging, failure/retry, ticket switch and logout.
- All four staff photo roles: upload, replacement, removal, protected read, bad file and unauthorized write; existing bubbles update and survive reload.
- Supervisor overall history versus IT/Intern personal history; more than one page; denied edits; no queue fallback masking a history error.
- Daily/weekly/monthly/custom boundaries, midnight in Philippine time, Sunday/Monday, leap day, empty period, reversed dates, rapid changes, partial maintenance, and export/screen filter agreement.
- CSV/XLSX exact 15 columns, full matching row count beyond 200 rows, correct attribution, Unicode/comma/newline/formula-like text, blanks and zero durations; XLSX opens correctly.
- Combined directory filters across pages, Clear filters, card destinations, read-only versus Edit, keyboard behavior, small viewport, dropdown visibility, card order and preserved notes.

Use focused regression tests for changed logic and meaningful cross-layer checks. Trivial wording/order changes need inspection rather than mirror tests. Preserve validation, security, accessibility and error handling. Keep existing APIs/components/dependencies wherever sufficient; no unrelated refactoring or new profile/report infrastructure.

Planning checks are not implementation acceptance. Runtime reproduction, application tests, migration rehearsal and production verification remain pending until execution. Dates remain undecided.
