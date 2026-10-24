# Tiketa — Bug Fixes 1.0

Planning baseline: 2026-10-23. Status: ready for implementation planning; fixes have not been implemented or runtime-verified.

Planning amendment, 2026-10-24: the supplied management requirement replaces `FS-` input with numeric-only employee IDs. See the [corrected backend M1/M2 implementation plan](BUG-FIXES-1.0-BACKEND-M1-M2-IMPLEMENTATION-PLAN.md) for migration safeguards and recommended validation bounds. This is a planned change; current source/database behavior has not been modified by the review.

Delivery plan: [Bug Fixes 1.0 Sprint Plan](BUG-FIXES-1.0-SPRINT-PLAN.md) schedules the full backlog in one sprint for two people, with separate [backend](BUG-FIXES-1.0-BACKEND-PLAN.md) and [frontend](BUG-FIXES-1.0-FRONTEND-PLAN.md) tracks, API handoffs and a shared acceptance gate. Its milestones refine the batch sequence below; all requirements remain in this sprint.

Scope: the owner's Admin, Employee Intake, and IT Support findings. Evidence below comes from the current working tree, which already contains uncommitted backend ticket/schema/test changes. Reconcile those changes before implementation; do not overwrite them.

## 1. Confirmed findings and reproduction work

| Area | Source inspection finding |
| --- | --- |
| Staff landing page | `authSlice.ts` defaults technician login/session restoration to `workbench`. `App.tsx` renders the employee screen whenever `verifyTicketCode` is present, even with a staff session. Navigation is currently store-driven; changing the displayed view alone will not establish real `/dashboard` routing. |
| Repair library | `notesSlice.ts` starts with sample notes and performs create/edit/delete and checklist mutations in memory. Library edit/delete buttons have handlers, so the report that clicks do nothing also needs UI reproduction. No repair-library database model/API was found in the inspected backend. |
| Accounts and employees | `teamSlice.ts` uses sample staff and local mutations. Real admin user and employee endpoints already exist in `backend/app/api/directory.py`. User creation requires username and a 12–128 character password. Employee IDs currently have length validation only. |
| Monthly output | `ITOverviewDashboard.tsx` renders `MY_PERSONAL_MONTHLY_OUTPUT` and a fixed 2026 title. The support-mode chart also uses sample values. |
| Ticket history | Default backend ticket listing includes OPEN, PROG, RESL but excludes CLSD. Job logs reuse that list. Queue mapping omits completion date/time/duration and substitutes several company/location/time defaults. Missing RESL rows still need reproduction; their exclusion is not explained by the backend default filter. |
| Employee status | Tracking returns an existing local ticket before consulting the API. Employee cards show “Awaiting Technician Claim” whenever `workedBy` is absent, even if status says PROG or RESL. |
| Dispatch/messages | Header claim uses the local `claimTicket` action. `assignTicket` is local-only. Message popovers derive their contents from local ticket messages; queue fetch replaces messages with empty arrays. |
| Notifications | Bell content derives from local ticket state. RESL correctly appears as awaiting verification under the existing lifecycle; a CLSD ticket remaining there is stale state. |
| Employee chat | `TicketConversation.tsx` invokes the local message action. Authenticated comment APIs exist, but require a staff user; the current model requires `user_id`. This does not support persistent accountless employee participation. |
| Intake description | Submission stores the description in the API request and also fabricates an initial local chat message from it. Intake and technician diagnosis share task/description concepts that need separation. |
| White screen | Not reproduced. A concrete hypothesis: FastAPI validation `detail` can be an array of objects, which submission passes directly into a toast rendered as React content. Short descriptions can trigger the backend's 10-character minimum. Confirm the actual console error and failing response before declaring this the root cause. |
| Drawer/modal | Drawer defaults to CHAT. Full-screen blur clipping requires browser inspection of modal placement, containing blocks, and stacking. |

Source paths are relative to the repository: frontend findings are under `frontend/src`; backend findings under `backend/app`.

## 2. Intended behavior

- `/report` remains the employee entry point, including refresh/reopen. A remembered staff session must not silently replace an explicitly opened employee page with the workbench.
- Successful explicit staff login, including login from a verification link, lands on `/dashboard` for both IT and admin. `/overview` becomes a compatible alias. Explicit staff deep links may restore their requested authorized page; obsolete saved view values must not control fresh login.
- One **Login** button opens the existing role-choice modal. The server-returned role controls access.
- Lifecycle labels are consistent: OPEN = Awaiting technician; PROG = In progress; RESL = Repaired, awaiting verification; CLSD = Verified and closed. Both RESL and CLSD are completed job-history records. Only OPEN and PROG count as active repair backlog.
- Proposed list label: **Ticket List**, with All, Open, In Progress, Awaiting Verification, and Closed filters. Completed records remain discoverable without being counted as active repairs.
- Ticket title preserves the selected six-button issue label, for example **No internet / Wi-Fi**. Employee description contains that label plus optional additional details. Technician diagnosis and resolution notes are separate editable fields and do not overwrite the original report.
- Proposed replacement for **15-column Job Log Controls**: **Service Record & Diagnosis**. Preserve the canonical 15-field ledger/export while using clearer interface wording.
- Ticket drawers open Service Record & Diagnosis first. Chat is a separate tab for the submitting employee and assigned technician. Remove the internal-note composer and duplicate top workbench shortcut beside Copy Link; retain the remaining workbench action.
- Replace the dashboard's Save Repair Notes shortcut with **View Active Tickets**.
- Confirmed owner choice: collect browser/device location alongside the official employee terminal. The official `location_id` remains directory-derived.

## 3. Ordered implementation backlog

Priorities: P0 blocks reliable intake; P1 affects persistence, lifecycle, or access; P2 covers presentation and new location functionality. Implement in the order below, with UI polish allowed alongside completed dependencies.

| ID | Priority | Work package | Acceptance checks |
| --- | --- | --- | --- |
| BF-01 | P0 | Reproduce and repair description submission crash. Normalize API error shapes into text; show field validation; retain input on failure; use finally for submitting state. Add a recoverable application error boundary after fixing the actual cause. | Valid submission displays receipt; short/long/empty inputs follow the agreed description contract; 422, timeout, and server errors never produce a blank page or false success. |
| BF-02 | P1 | Establish URL-aware employee/staff routing, dashboard landing, verification-link exit after explicit login, and one Login button. Separate auth restoration from public-page selection. | Test both roles from normal and verification URLs; refresh `/report`, `/dashboard`, and staff deep links; test expired sessions and browser back/forward. Login does not confirm or close a ticket. |
| BF-03 | P1 | Introduce distinct reported issue, employee details, diagnosis, and resolution fields. Map the six intake choices centrally. Persist technician edits through an authorized endpoint. | Each of six choices retains its exact title after refresh; additional details appear in description and create no chat entry; diagnosis changes classification without losing the original employee report. |
| BF-04 | P1 | Correct list/history queries and full ticket mapping. Fetch explicit statuses including closed records, support pagination, filter ownership by user UUID, and remove invented time/location/assignee defaults. Refresh status after mutations and on focus, with bounded polling where needed. | OPEN → PROG → RESL → CLSD updates all three user views; completed jobs survive refresh and pagination; timestamps/duration match the database; IT sees their records and admin sees all permitted records. |
| BF-05 | P1 | Replace local claim/assignment paths with server operations. Add an admin assignment endpoint if existing claim behavior cannot express assignment to another technician. Refresh bell and dispatch content from authoritative results. | Header, drawer, queue, and workbench actions persist; reassignment survives refresh; conflicts do not overwrite another claim; CLSD removes verification alert while RESL retains it. API failures show failure and leave no false success state. |
| BF-06 | P1 | Implement persistent employee–assigned-technician conversations and message summaries. Add scoped employee access without employee login accounts. Fetch message history separately from queue summaries. | Both participants exchange messages across separate browsers and reloads. Other employees/unassigned technicians cannot read or send conversation messages. Assignment changes update access. Message pagination and retries preserve order without duplicates. |
| BF-07 | P1 | Persist repair library and per-ticket checklists; connect create/edit/delete/apply actions; remove production sample notes. Store library templates separately from ticket-specific progress. | Create/edit/delete survive a second browser and reload; apply copies the guide without overwriting employee details; editing/deleting a guide does not erase an existing service record. Failed writes do not report success. |
| BF-08 | P1 | Wire IT Teams and Accounts and Add Employee Profile to existing directory APIs and server dictionaries. Add username/password fields, role selection limited to it/admin, validation, loading/errors, and server refresh. | Newly created staff can log in after refresh; employee is available to intake lookup; duplicate and invalid data show useful errors. Password is never returned in listings. Display titles such as Senior Analyst never become auth roles. |
| BF-09 | P1 | Replace sample monthly output and adjacent sample overview metrics with scoped database aggregates. Define personal versus fleet scope and dynamic year. | Compare chart counts to fixtures including prior-year, reopened, closed, empty, and cross-month tickets. IT sees their output; admin label and values describe the selected scope; errors/empty results never fall back to samples. |
| BF-10 | P2 | Apply drawer defaults, Service Record & Diagnosis label, dashboard shortcut, removal of internal chat control, and duplicate workbench shortcut. | Every ticket entry point opens the intended record tab; chat remains reachable; one workbench shortcut remains; diagnosis saves and reloads. |
| BF-11 | P2 | Render modal overlays at an appropriate application root/portal with viewport coverage and consistent stacking/scroll behavior. | Staff login, account/employee forms, verification, and other affected modals cover the viewport on desktop/mobile and after page scrolling; close/focus behavior works. |
| BF-12 | P2 | Request browser location on entry and save consented observations alongside official terminal data. Handle denied/unavailable/timeout states and avoid repeated prompts on rerenders. | Granted coordinates persist with accuracy/time; denial does not block ticket creation; observations never overwrite official terminal; refresh/retry does not duplicate a single observation. |

## 4. Backend and contract work

1. **Ticket record:** add stable reported issue/category and separate diagnosis/resolution fields, using existing encryption conventions for free text. Keep `description` as the original report. Keep technician `task_code` as diagnosed classification; make intake mapping/backward compatibility explicit. Do not guess historical issue labels from final diagnosis: mark old rows as legacy/unknown where necessary.
2. **History:** use paginated authoritative ticket queries with explicit status/scope. Return canonical dates, duration, and IDs consistently. Match frontend types to actual API output rather than name-based ownership guesses. Ensure queue cache invalidation follows successful mutations.
3. **Assignments:** authorize admin dispatch, validate active technician, lock the ticket for competing mutations, update primary assignee and `ticket_technicians` consistently. Keep lifecycle changes explicit.
4. **Conversations:** extend `ticket_comments` or introduce a dedicated conversation model to represent employee and technician authors with database constraints. Issue a ticket-scoped, revocable secret/session through a verified employee channel; knowing a ticket code or Employee ID alone must not grant chat access. Preserve the minimal public tracking response. Do not reuse closure tokens as general chat credentials. Enforce participant access on the server, not just the UI.
5. **Existing internal comments:** remove new internal-chat creation from this workflow, but do not expose old internal comments to employees. Preserve them as restricted historical records pending any deliberate migration decision.
6. **Repair notes:** proposed `repair_notes`, ordered note checklist steps, and ticket checklist instances, with author/updater timestamps and optional source ticket. Proposed policy: IT manages own library notes; admin manages all; staff can read/apply shared guides. Document and test this policy before wiring controls.
7. **Directory:** reuse `/admin/users`, `/admin/employees`, and `/dictionaries`. Use deactivation where needed to preserve ticket ownership/history. Updated requirement: numeric-only employee IDs preserved as text, including leading zeros. Recommended bounds: 1–50 ASCII digits, validated in UI/API/database after preflight. Migrate only supported legacy `FS-` plus digits values after checking all target IDs for collisions; preserve employee UUIDs and coordinate frontend rollout. Unsupported or conflicting conversions must stop without partial changes.
8. **Overview:** proposed monthly output metric = primary-assigned completed tickets (RESL/CLSD), grouped by completion month using the repository business timezone Asia/Manila; exclude reopened jobs until completed again. Admin defaults to fleet output with matching label, with technician filter for personal output. This differs from creation-month SLA reports and must be documented separately. Add a narrowly scoped IT endpoint instead of granting IT access to admin reports.
9. **Location:** proposed `client_location_observations` holds latitude, longitude, accuracy, captured time, server receipt time, and optional authorized employee/ticket/user association. Record a successful observation on visit, then link it when identity/ticket context becomes available. Use opaque visit identifiers, validate values, and keep coordinates out of public tracking responses. No continuous tracking is needed. Retention/access policy must be recorded before production rollout.

Browser geolocation requires a secure context, permission, and a compatible Permissions-Policy. The browser may remember permission and therefore not show a prompt on every visit. See [MDN getCurrentPosition](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition). Permission denial remains a supported path.

## 5. Where data is stored today

| Data | Current storage | Limitation |
| --- | --- | --- |
| Saved repair notes and reusable checklists | `frontend/src/store/slices/notesSlice.ts` in Zustand memory, initialized from sample constants | No database persistence in the inspected implementation; reload resets local changes. |
| Per-ticket checklist progress | Local ticket objects in the same frontend store | No persisted checklist model found. |
| Employee report description | PostgreSQL `tickets.description_enc` | Saved through submission; frontend also duplicates it into a synthetic local chat entry. |
| Authenticated staff comments sent through the comment API | PostgreSQL `ticket_comments`: `ticket_id`, `user_id`, encrypted `body_enc`, `is_internal`, timestamps | Both comment endpoints require authenticated staff; merely displaying a chat message does not prove it used this path. |
| Employee live-chat messages | Local ticket `messages` through `sendTicketMessage` | Current employee UI does not persist these via the authenticated comment API. |

These are source-code findings, not an inspection of rows in the deployed database.

## 6. Delivery sequence and release gate

- Batch A: BF-01 and BF-02 stabilize intake and navigation.
- Batch B: BF-03 and BF-04 establish ticket contracts, lifecycle reads, and job history; BF-08 supplies real directory records for assignment.
- Batch C: BF-05 and BF-06 connect dispatch and conversations using those contracts.
- Batch D: BF-07 and BF-09 complete persistent knowledge records and reporting.
- Batch E: BF-10 through BF-12 finish workflow presentation and location capture; UI-only pieces may land earlier once their dependencies exist.

Use small backend/frontend feature branches based on `develop`, conventional commits, and PRs targeting `develop`. Only Jefferson Lopez merges. Review existing local backend changes before branching or integrating. Follow strict TypeScript, domain slices, atomic selectors, async lookup guards, and session invalidation. Employees remain accountless; there is no public registration or web upload scope.

Release requires meaningful backend tests for changed persistence, authorization, lifecycle, aggregates, and migrations; frontend type-check/build; and browser regression checks for the listed failures. Add focused frontend regression coverage for submission, routing, and stale asynchronous responses rather than snapshotting static labels.

Run a full scenario with an employee, technician, and admin in separate browser sessions: create employee/account → report one of six issue types with details → claim/assign → diagnose → exchange messages → save repair guide/checklist → resolve → verify → confirm job history, chart totals, and notification state. Reload at each persistence boundary. Repeat denial/error paths and check a second employee cannot access the first employee's conversation. Include more tickets/messages than one API page, concurrent claims, logout during requests, and historical rows after migration.

Planning verification completed: targeted repository and contract inspection. Runtime reproduction, database-row verification, implementation, migrations, and release tests remain future work.
