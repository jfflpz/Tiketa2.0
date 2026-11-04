# Sprint 3.0: Frontend Track Responsibilities

**Sprint:** Governance, Staff Profiles, Terminal Configuration, Accurate Reports & Reliable Chat

**Owner:** Rafael Emmanuel Codiñera — Frontend Engineering

**Cross-track exception:** F-06 (PPTX export) is assigned to Jefferson Lopez; Rafael reviews its frontend integration. All other frontend tasks remain with Rafael.

**Status:** DRAFT — awaiting user approval; no implementation authorized yet

**Baseline:** `develop` at `5d0c14218e519a9b509409878ec4a88888c8e1ad` (2026-11-02 review)

**Shared plan:** [Sprint 3.0 implementation plan](Sprint-3-Implementation-Plan.md)

**Companion:** [Backend responsibilities](SPRINT-3.0-BACKEND-RESPONSIBILITIES.md)

**Evidence:** [Ponytail audit — 17 findings](Ponytail-Audit-2026-11-02.md)

**Proposed repository destination after approval:** `docs/04-Sprints/SPRINT-3.0-FRONTEND-RESPONSIBILITIES.md`

## 1. Ownership and scope

Use the [shared API and PR integration contract](Sprint-3-Implementation-Plan.md#shared-api-and-pr-integration-contract-draft) as the single wire/handoff agreement. Additive APIs merge before dependent screens; breaking account policy B-03/F-03 merges as one full-stack feature PR. The PPTX task adds no backend API.

Own React screens, strict TypeScript types, HTTP callers, Zustand state, route guards, accessible interactions, chart/export rendering, frontend tests, and browser integration. Backend owns the server authorization, durable storage, schema migrations and generated API contract. A hidden button is not server authorization, and a local state update is not evidence of a saved feature.

Reuse the domain slices, existing profile popover, account-request client, terminal views, report viewer, export modal, native file input and existing modal patterns. No runtime mock data, image-cropping editor, avatar service, new component library, duplicate report framework, or WebSocket infrastructure.

The four wire roles are `intern | it | admin | supervisor`. Existing typed `analyst` support is stale and must not become a fifth backend role.

## 2. Detailed task breakdown

### F-00 — Reproduce the baseline and align contracts

Audit: all frontend cases. Dependency: B-00. Milestone: S0.

- [ ] After approval, recheck develop and local changes; use `feat/frontend-sprint3.0` from current develop.
- [ ] Record the current reproduction cases: expired bearer replay, failed logout/reload, broken initials image, wrong analytics data, label/legend overlap, message 101, closed job history, and CSV ownership/escaping.
- [ ] Align API DTOs and role models with generated OpenAPI. Remove `analyst` from active types/routes/screens/tests; preserve the supported Supervisor role.
- [ ] Review direct account create/deactivate callers, role switcher/demo presets, privileged background loaders and stale endpoint assumptions before modifying them.
- [ ] Work against existing APIs where possible. Do not show mock success while waiting for a new backend contract; publish each endpoint dependency explicitly.
- [ ] With B-00, add `npm test` and the first real-browser/API/database smoke to the combined CI job before feature merges. Verify develop requires the actual check, current-base testing and peer review; branch protection is currently off. F-09 extends this baseline rather than introducing integration only at the end.

**Acceptance:** Both tracks share one role/endpoint contract and reproducible cases with no claims of completion.

### F-01 — Reliable authentication and remembered-profile login

Audit: 3, 4; integration with 1, 2. Dependency: B-01 for server scope proofs. Milestone: S0/S1.

**Existing files:** `api/client.ts`, `store/slices/authSlice.ts`, `features/auth/StaffLoginModal.tsx`, `LogoutConfirmationModal.tsx`, `App.tsx`, `utils/routeUtils.ts`, Sidebar/header/hotkey callers and session tests.

- [ ] Distinguish staff and public/employee request contexts using the existing client. Public intake, tracking, matching, employee chat and closure never attach a staff bearer or trigger a staff refresh.
- [ ] On staff 401, refresh once, replace Authorization on the original and queued requests, and replay each once. Cancel/discard late results after logout or account switch.
- [ ] Replace the four demo role pills and preset usernames with username/password login plus one consented remembered card. Returning users enter their password; Switch account clears the card and restores the standard form.
- [ ] Use one role-to-home map for explicit login, session restoration and forbidden deep links: Admin→overview, IT→tickets, Supervisor→analytics, Intern→workbench. Keep canonical overview URL /dashboard as the code currently does.
- [ ] Rename the exit option to remembering a profile, not retaining staff access. Both exit choices revoke the staff session, clear sensitive domain state, stop polling and return to /report; the optional card contains only consented name/username/role.
- [ ] On revocation failure, lock/clear sensitive screen content, show an actionable retry, and block automatic restoration. Never announce successful sign-out while the refresh cookie can still resume the account.
- [ ] Guard loaders, focus handlers, hotkeys and polling by current role and staff-workspace visibility. Supervisor does not repeatedly call a denied operational queue; public screens do not continue staff polling.
- [ ] Preserve the existing accessible login dialog and add focus/keyboard/error checks as its fields change.

**Tests/acceptance:** Expired bearer requests recover with the new token, simultaneous failures use one refresh, an employee 401 never obtains staff credentials, both exit choices require a password after reload, failed revocation is visible, and role homes/deep links are consistent.

### F-02 — Staff profiles with initials or uploaded photos

Audit: 14. Dependency: B-04 for persistence. Milestone: S1.

**Existing files:** `components/layout/header/HeaderProfilePopover.tsx`, `components/layout/TopHeader.tsx`, `features/team/components/ITStaffTable.tsx`, auth/team mappings and types. Add one small profile modal and avatar renderer only if no equivalent exists.

- [ ] Add My profile to the existing header popover for IT/Admin/Supervisor. Show real name, username, role and photo; remove fabricated personal/terminal details.
- [ ] Render initials as text: Jefferson Lopez→JL, a single name→one initial, missing/blank name→username initial. Do not put initials into an image URL.
- [ ] Model optional `avatarUrl` separately from initials. Use the same fallback renderer in authenticated profile/header/directory; an image load failure restores initials without a broken-image loop.
- [ ] Add Upload photo, Replace photo and Remove photo using the native labelled file input and the backend self-photo endpoints. Display allowed formats and the 2 MiB limit; client checks are convenience, server validation is authoritative.
- [ ] Preserve the current photo/draft on failure; show loading/error feedback. Update authenticated views from the saved response and version URL so replacement does not show a cached old image.
- [ ] Fetch authenticated image content safely with the staff context; do not put bearer tokens in URLs. Revoke temporary browser object URLs when replaced/unmounted/logged out.
- [ ] Keep photos private. The logged-out remembered card uses initials and a password field; do not store image bytes, credentials or a private image access token in localStorage.
- [ ] Give all controls accessible names, keyboard operation and announced errors. Interns retain working initials; this sprint does not add an Intern photo-upload setting.

**Tests/acceptance:** Supported roles can upload/replace/remove their own photo, it persists across reload/relogin, failed images/uploads preserve a useful fallback, and the logged-out card never resumes staff access.

### F-03 — Account proposals and Supervisor approval queue

Audit: 5, 15. Dependency: B-03. Milestone: S1.

**Merge rule:** Keep the B-03/F-03 implementation halves in review until one combined feature PR contains both on current develop. Do not merge the new server policy while the old UI still directly creates/deactivates accounts. Align request/response DTOs to the shared contract, including nullable temporary_password for deactivation.

**Existing files:** `features/team/TeamAdministrationView.tsx`, create/edit staff modals, ITStaffTable, `store/slices/teamSlice.ts`, `api/client.ts`, team types. Add the planned PendingApprovalsQueue only if the existing view cannot host it directly.

- [ ] Admin creation becomes a proposal for Intern/IT/Supervisor; show Pending Supervisor approval instead of Created account.
- [ ] Admin deactivation submits a target-user request after confirmation; the account stays active until approval. Replace legacy direct deactivation/create callers.
- [ ] Supervisor sees bounded pending requests and their source/target, can approve or reject with a reason, and sees persisted decisions. Admin sees request status without a decision button.
- [ ] Disable duplicate submissions while in flight. On 409, retrieve the authoritative decision and explain that it was already reviewed.
- [ ] Handle generated credentials only in the successful approval response; provide controlled copy/display without persisting them in browser storage or notifications.
- [ ] Keep normal metadata edits and credential resets within the published server contract; remove role/status controls that bypass approval. Show server conflicts for self-demotion/last privileged account protection.
- [ ] Reuse existing form validation, loading, empty/error states and focus management.

**Tests/acceptance:** Admin proposes in one browser; Supervisor decides in another; a fresh request confirms the actual account state. Failed/denied/racing actions never show fake success.

### F-04 — Terminal configuration, station confirmation and modal clipping

Dependency: B-05 for configuration writes. Milestone: S2.

**Existing files:** TerminalHubsView, TerminalHubDetailModal, its department/active/history tabs, kiosk intake components/hook, dictionary mappings. Use a compact Admin configuration view within the existing terminal feature.

- [ ] Add Admin create/edit/deactivate/reactivate controls for terminal hubs, departments and terminal-department membership using the shared endpoints.
- [ ] Use server dictionaries, UUIDs and active-state metadata; no hardcoded fallback station IDs for writes.
- [ ] Show confirmation before deactivation, clearly name the affected record, and preserve the current form on errors. Explain an in-use 409 without deleting or silently moving employees/tickets.
- [ ] Add the final intake station confirmation using the matched employee's official terminal/code. Do not let browser coordinates or another dropdown override that assignment.
- [ ] Fix TerminalHubDetailModal's viewport layout with a bounded scroll body and visible header/close button, including small/short laptop screens. Preserve the existing focus trap, Escape behavior, nested ticket drawer handling and focus restoration.
- [ ] Refresh/invalidate terminal summaries and dictionaries only after successful saves; identify stale data if a read-back fails.

**Tests/acceptance:** Configuration survives reload; inactive choices cannot be selected for new intake; historical tickets survive. At 1366×768, a shorter viewport and browser zoom, the modal's heading, close control and active tab remain reachable.

### F-05 — Real analytics with the correct report behind each view

Audit: 8, 9. Dependency: B-06 for hourly/PMS definitions. Milestone: S3.

**Existing files:** ExecutiveAnalyticsView, ExecutiveSummaryKpiCards, HourlyPeakDemandChart, TurnaroundLagChart, reportsSlice, StandardizedReportsView and reportMappers.

**Scope addition (2026-11-03):** Month/Year selection for both reporting screens. Use B-06's existing date-filter contract and B-09's sanitized historical fixtures. All eight reports currently in code remain covered.

**Agreed default:** Select the complete current calendar month, including future dates, and clearly indicate that the month is in progress.

- [ ] Put labelled, keyboard-accessible Month and Year dropdowns at the top of Standard Reports and Executive Analytics. Reuse existing UI patterns and `reportFilters`; default to the current Asia/Manila month. Allow previous years containing legacy data without a fixed recent-month cutoff; no custom ranges, all-time option or saved presets.
- [ ] Store one selected period across both screens and reset it with session state. Send explicit inclusive first/last calendar dates through existing `date_from`/`date_to` parameters, including current month, while preserving company/location/department filters and complete-month PMS rules.
- [ ] Refetch affected KPI cards, selected report tables/charts, transit-lag and real hourly data when the period changes. Fence delayed results by report/filter; do not display previous-period figures under new labels. Show loading, errors and "No records for this period" distinctly.
- [ ] Keep CSV and PPTX period labels, requests and commentary aligned with the chosen filter snapshot. Rafael owns screen/state/CSV wiring; coordinate PPTX internals with Jefferson's F-06 and preserve modal caller props. Navigation between screens retains the period.
- [ ] Verify a historical month/year using B-09 fixtures, an empty month, leap February, December/January and rapid period changes with delayed responses. Compare API/UI/CSV/PPTX values and verify the controls remain usable on a small viewport.

- [ ] Remove hardcoded KPI fallback numbers and the production hourly sample series. Show loading, unavailable, zero, and no denominator distinctly.
- [ ] Separate SLA compliance from completion rate and same-day resolution. Bind the PMS card to actual service-plan coverage, including unplanned/company-filtered states.
- [ ] Fetch the selected report when its ID or filters change. Reuse the existing reports viewer/fetch flow instead of passing the same untyped rows through all eight report mappers.
- [ ] Keep data keyed to the report/filter that produced it; do not display old rows under a new tab. Reject late responses using the existing request-sequence pattern.
- [ ] Give the transit-lag widget its own transit-lag result. Bind hourly data to the backend's Asia/Manila series and label its actual started-at meaning/window.
- [ ] Preserve negative transit lag with a visible data-review indicator; do not silently zero negative/null values.
- [ ] Make interactive KPI navigation keyboard accessible using the project's button/link patterns.

**Tests/acceptance:** Fresh analytics visits load actual data; every tab requests the correct endpoint; filter changes cannot mix stale rows; API/UI/CSV/PPTX match known fixtures, including empty and review-flag cases.

### F-06 — Editable PPTX commentary and overlap-free typography

**Implementation owner:** Jefferson Lopez. **Frontend reviewer:** Rafael Emmanuel Codiñera. **Proposed branch:** `feat/frontend-pptx-export-fix`, based on current `develop` after approval. This remains a frontend task ID; it is not duplicated as a separate backend implementation.

Audit: 13. Dependency: none for layout; B-06 for matching data fixtures. Milestone: S3; can start during backend S0.

**Existing files:** `features/reports/components/ExportPptxModal.tsx`, `export/ExportChartRenderer.tsx`, `export/chartCapture.ts`, `export/pptxSlideBuilder.ts`, `export/exportPptx.ts`, export types/generator/tests.

- [ ] Keep the change within the export folder, ExportPptxModal, and export-specific tests. Preserve the modal's existing public props and report API contracts; scope typography to the export renderer rather than global CSS/Tailwind settings.
- [ ] Before implementation, compare the exact candidate with Rafael's latest published branch and check for local/unpublished work. One owner edits these export files until handoff; Rafael continues other frontend tasks and reviews the export PR to develop.
- **Published overlap check (2026-11-02):** Rafael's [PR #22](https://github.com/jfflpz/Tiketa2.0/pull/22) is merged into develop and changed no PPTX export files. Its branch head `dccdfa0` is an ancestor of audited develop `5d0c142`; no open repository PRs were visible. This does not establish the deployed production version or rule out unpublished local edits.

- [ ] Keep Arial throughout native slide text and captured charts. Target title 36 pt bold, reporting period 22 pt regular in its own frame, commentary 18 pt with existing bold key metrics, and 14–16 pt chart text at final slide size.
- [ ] Chart labels currently use 16–19 canvas pixels, roughly 7–8 pt on the final slide. Start around 32–36 px at 1896 px canvas width, then validate dense reports; do not treat canvas pixels as PowerPoint points.
- [ ] Reserve distinct regions for plot, wrapped category labels and legend. Set X-axis height/line spacing to the rendered text and put the legend in its own row inside the captured canvas.
- [ ] Use the recorded 75 px bottom-clearance baseline only as a starting point. Reserve actual wrapped-label height, wrapped legend height and at least 12 px separation; prevent neighboring labels from touching.
- [ ] Replace silent two-line label clipping with wrapping/layout that keeps the labels visible. Apply this to full-width and dual-panel charts across all eight reports.
- [ ] Keep commentary below the chart with at least 0.2 inches of separation. Do not solve overlap by silently truncating user text or shrinking it below the target.
- [ ] Add editable generated commentary in ExportPptxModal, not in the chart renderer. Keep edits per selected report for the current export/filter snapshot and pass them into slide assembly instead of regenerating over them.
- [ ] Preflight whether edited text fits. For text beyond the fixed one-slide capacity, retain the draft and show an actionable length/fit error before download; never silently discard commentary. No extra cover/closing slides.
- [ ] Preserve complete-month PMS validation, selection modes, null semantics, cancellation/restart/session guards and PNG chart proportions. Set the PPTX theme and explicit text runs consistently to Arial.
- [ ] Coordinate F-05's Month/Year controls with Rafael: initialize the modal from the screen's selected month through existing props. Export the same date/scope snapshot with matching slide periods and commentary; preserve any explicit export-only date choice and existing validation without silently changing the screen period. Test historical and empty-month exports.
- [ ] Add focused export assertions and a real-browser rendered overlap case with long labels, ten categories, wrapped legends, empty data and dual panels. Mocked Recharts or bounding slide rectangles alone cannot prove text clearance.

**Acceptance:** Export all eight reports and inspect both captured PNGs and PowerPoint slideshow output. No labels, legend, title/date or commentary overlap or clip; commentary edits survive into the correct slide. Native slide text remains editable; charts remain PNGs.

### F-07 — Three-second two-way chat that includes new messages

Audit: 10; integration with 2, 6. Dependency: B-07 and B-01. Milestone: S4.

**Existing files:** JobLogDrawer, JobLogDrawerChat, TicketConversation, ticketOperationsSlice, api/client.ts and ticket message types.

- [ ] Request the latest bounded comment page with deterministic descending order; display chronologically and offer Load older using the same API's paging.
- [ ] Map canonical `author_name / author_role / is_internal / created_at`; employee messages must not be presented as IT replies.
- [ ] Merge by server UUID; keep successful local sends until acknowledged by a server ID. Do not deduplicate distinct messages solely because their text matches.
- [ ] Poll at three seconds only while the conversation is active and the document is visible. Avoid overlapping fetches; stop/cancel on close, ticket switch, role/session change and unmount.
- [ ] Auto-scroll when the user is near the latest message; preserve their position when reading older history and provide a new-message cue.
- [ ] Add Send to employee versus Internal note with clear label/styling on the staff composer. Employee UI keeps a defensive filter; server exclusion remains the privacy boundary.
- [ ] Preserve draft text and show delivery failures. Fence late responses by ticket and auth/employee session so a slow result cannot replace another conversation.

**Tests/acceptance:** Two browsers exchange message 101 and later within the next successful poll, older history loads, authors remain correct, internal notes never appear to employees, and background/closed chats stop polling.

### F-08 — Complete job history and safe CSV export

Audit: 7, 11. Dependency: B-01 for authoritative history permissions. Milestone: S4.

**Existing files:** JobLogSheetView, ticketQueueSlice or a narrowly scoped history state in the same domain, api/client.ts, relevant fixtures/tests.

- [ ] Verify B-09 imported records appear with original dates, workers and recorded statuses under existing history permissions. Reuse this viewer; no Excel upload screen, client parser or import dependency. Confirm a sampled imported month also appears in F-05 reports with missing metrics shown as unavailable.
- [ ] Show every recorded technician for shared historical jobs, and include the job in each recorded technician's permitted personal history. Historical `Done` maps to resolved without an invented employee closure confirmation.
- [ ] Display shared-job productivity using the backend's agreed counts: once for each participating technician and once in company-wide job totals. Show the recorded job duration separately from individual labor time, which is unavailable when the source does not specify it.

- [ ] Use the new `GET /api/v1/tickets/history` contract with explicit status and bounded paging after B-01 merges; do not use the first 50 active queue rows as a complete ledger. Keep personal history separate from operational queue state.
- [ ] Scope personal history by staff UUID. Remove first-name/sub-string ownership matches and invented fallback staff names.
- [ ] Render and export each row's actual worker; Admin exports cannot stamp the viewer as the technician. Supervisor read-only history uses the agreed server contract.
- [ ] Match the export to the labelled selection: either export the complete filtered history through bounded retrieval or clearly label current-page export. Do not claim a partial page is all job logs.
- [ ] Escape every CSV cell and neutralize formula-leading text, including whitespace-prefixed cases. Reuse the backend's established behavior in a small frontend cell function; no new CSV library.
- [ ] Test closed tickets, more than 50 rows, same-first-name staff, mixed assignees, quotes/commas/newlines, formula text, missing values and access denials.

**Acceptance:** Reloaded history includes closed work, personal rows belong to the logged-in UUID, export worker names are correct, and spreadsheet cells treat untrusted text as text.

### F-09 — Frontend gates and joint acceptance

Audit: 16, 17. Dependency: B-08 and completed feature handoffs. Milestone: S5.

- [ ] Run existing `npm test`, `npm run type-check`, and `npm run build`; run focused tests while developing and the full suite at handoff.
- [ ] Add `npm test` to the frontend and combined GitHub CI jobs. Keep the backend gates; update docs so check names describe what actually runs.
- [ ] Add one real-browser write/read/reload smoke flow against disposable PostgreSQL/Redis/API and the built UI. Use Playwright as a development-only runner if no existing browser runner is available at execution; no runtime test dependency.
- [ ] Include browser coverage for failed logout/reload, the three profile roles, approval concurrency outcome, station confirmation, clipped modal, data-source switching, dense chart/legend layout, and two-way chat after 100 messages.
- [ ] Build the frontend for the proposed production topology. Add SPA route fallback while leaving API/health/private-photo responses correctly routed; verify /report, /tickets and other deep links on the built stack.
- [ ] Perform the PowerPoint visual check on a target office PC with Arial, edited commentary and all eight report types. Record unavailable checks rather than claiming success from a build.
- [ ] Record candidate SHA, migrations, test commands/results and persisted IDs with backend. Open reviewable PRs to develop; do not merge, publish to main or deploy automatically.
- [ ] For every feature PR, use the shared contract's same-candidate checks and post-merge develop smoke; stop dependent merges after a failure. Coordinate single ownership of `api/client.ts`, shared DTOs, migrations/OpenAPI, and workflow edits to avoid conflicting copies.

**Acceptance:** Unit/type/build and shared real-browser checks pass on one candidate, followed by explicit rendered PPTX evidence. The feature is verified only after API persistence and a second browser/reload agree.

## 3. Parallel work and dependency order

| Start | Frontend work | Backend dependency before integration |
| --- | --- | --- |
| S0 | Rafael: F-00/F-01; Jefferson: F-06 export layout | B-00/B-01 contracts and role denials |
| S1 | F-02 against merged photo API; F-03 in one paired governance PR | B-04 additive API first; B-03/F-03 policy cutover together |
| S2 | F-04 terminal controls and clipping | B-05 validated configuration writes |
| S3 | Rafael: F-05 shared Month/Year controls and analytics; Jefferson: F-06 selected-period export | B-06 date/hourly/PMS contract; B-09 migration rehearsal and historical fixtures |
| S4 | F-07 chat; F-08 history/CSV | B-07 latest/older pages; B-01 history permissions |
| S5 | F-09 CI, production-build smoke and PowerPoint check | B-08 matching candidate and release checks |

## 4. Approval and execution boundary

These are review drafts in ARCH. After approval, publish the reviewed documents on a documentation feature branch and implement the agreed tasks on frontend/backend feature branches. PRs target develop; only Jefferson merges. Approval of the plan does not itself merge or deploy anything.

Not checked: No frontend suite/build, browser/API integration, production serving or PowerPoint render was run during this audit. The proposed sizes and contract changes need real visual/persistence tests after implementation.

