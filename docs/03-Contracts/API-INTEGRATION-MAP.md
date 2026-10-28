# Shared frontend/backend API integration map

**Revised 2026-10-28, local `feat/be-fe-connection`, including uncommitted changes.**
Use with the [integration sprint](../04-Sprints/INTEGRATION-SPRINT-PLAN.md). Existing endpoint inventory began on 2026-10-27; the role/session/tracking changes below were rechecked on 2026-10-28. **None is certified integrated by this document.** “Client present” means a method exists, not that every screen calls it or that persistence has passed. The new account-request endpoints are explicitly proposed, not implemented.

**Ownership:** Jefferson owns backend routes, schemas and persistence; Rafael owns TypeScript clients, screen/store callers and rendering. Both verify the same flow before marking it Verified.

## Target roles and permissions — S1/S4

The user requested four roles on 2026-10-28 and renamed IT Analyst to **IT Supervisor**. This supersedes the former two-tier plan; current database/auth/schema code still accepts only `it` and `admin`. Preserve those values, add `intern` and `supervisor`; do not rename existing accounts. This matrix is the shared target for backend authorization, UI visibility and tests.

| Screen/action | IT Intern (`intern`) | IT Support (`it`) | Admin (`admin`) | IT Supervisor (`supervisor`) |
| --- | --- | --- | --- | --- |
| KPI overview | Assigned-ticket KPIs | Existing permitted KPIs | Existing full overview | KPI data needed for reports; no operations overview |
| Ticket queue / quick intake / claim | Hidden / denied | Existing access | Existing access | Hidden / denied |
| Job logs / ticket detail | Assigned records, read-only logs | Existing access | Existing access | Hidden / denied; report rows only |
| Workbench / service notes / comments / checklist / resolve | Assigned tickets only* | Existing ownership rules | Existing access | Hidden / denied |
| Dispatch / reassignment | Hidden / denied | Keep existing restriction | Allowed, including assignment to Intern | Hidden / denied |
| Repair notes library | Read only* | Existing author permissions | Existing management | Hidden / denied |
| Terminal hubs | Hidden / denied | Existing access | Existing access | Hidden / denied |
| Reports / analytics / CSV | Hidden / denied | Keep existing restriction | Existing full access | Reports, supporting analytics and CSV |
| User/employee directory / role changes | Hidden / denied | Hidden / denied | Existing full access | Hidden / denied |
| Direct staff account creation | Denied | Denied | Existing access, all four roles | Denied |
| Submit account request / view status | Denied | Submit and view own | May submit/view all | View review queue; no general user management |
| Approve/reject account request | Denied | Denied | Allowed | Allowed |
| Employee closure sign-off | Staff role never grants employee sign-off | Same | Same; existing distinct override rules remain | Same |

*Working assumption pending Intern preference: assigned-ticket updates, read-only logs/library. Validate it before implementing Intern mutations. Unknown roles and unlisted actions are denied. A static typed frontend permission map is sufficient; no permission-management UI or generic policy engine.

**Enforcement:** gating must cover `App.tsx`, Sidebar, route/deep-link resolution, header shortcuts, mounted modals, login/refresh loaders, focus/polling effects and store/API actions. Stop `TicketListsView` calling `GET /admin/users` for non-admins; existing ticket responses already carry technician names. Do not broaden `/admin/users` to cure a toast. Gate report fetches by the Supervisor/Admin permission. Unexpected 401/403 errors remain visible with an appropriate recovery action; do not globally swallow them.

**Data isolation:** Intern queue/detail/comment/checklist reads and writes enforce `assigned_tech_id == current user` on the server; KPIs and logs use the same scope even if a caller supplies a different technician filter. Keep report and directory permissions separate. Audit every `CurrentUser` route before allowing new roles to authenticate; authentication alone is not authorization. Cache keys for scoped responses include user/scope, and role/account changes invalidate sessions and cached permissions. Supervisor report exports must not unlock operational ticket endpoints. Assignment eligibility must include Intern as well as Support.

## New account-request contract — proposed for S4

Confirmed decision: **Admin retains direct `POST /admin/users` creation; Support submits requests; Supervisor or Admin decides.** Requested roles are limited to `intern` and `it`; only Admin directly provisions or changes privileged roles. No employee self-registration, invitation platform or general approval engine.

| Proposed endpoint (under `/api/v1`) | Input / access | Response / persistence |
| --- | --- | --- |
| `POST /account-requests` | Support/Admin; `{username,email,full_name,requested_role}`; no password in request | 201 `AccountRequestOut`; stores requester, pending status and timestamps; creates no login account |
| `GET /account-requests` | Support sees own; Supervisor/Admin sees review scope; `status`, `offset`, `limit` (default 50, max 100) | 200 `{items,total,offset,limit}`; never return password material |
| `POST /account-requests/{request_id}/decision` | Supervisor/Admin; `{decision: 'approve'|'reject', reason?, initial_password?}`; approval requires password meeting existing account rules, rejection requires reason | 200 `AccountRequestOut`; atomically approve + create one user with hashed password, or reject with no user |

`AccountRequestOut`: `id`, `username`, `email`, `full_name`, `requested_role`, `status` (`pending|approved|rejected`), `requested_by_id`, `reviewed_by_id` (nullable), `reason` (nullable), `created_at`, `reviewed_at` (nullable), `created_user_id` (nullable). Do not store or log plaintext initial passwords; use the existing admin credential handoff process. This reuses direct account provisioning validation and password hashing. No self-approval; duplicate username/email, a second decision or simultaneous competing approvals return 409 without duplicate accounts. Authorization failures return 403, missing request 404, invalid input 422. Existing `POST /admin/users` remains compatible. Add typed clients, schema export, one pending fixture and role/concurrency tests in the paired implementation PRs.

## Session and employee flows — S1/S2

- **Exit checkbox:** unchecked revokes through existing `POST /auth/logout` while the staff bearer is still available; await 204 before clearing credentials. Checked keeps the session and opens `/report` without calling logout. No “keep-session logout” backend endpoint is needed. Cancel staff polling/refresh work and clear role-specific screen data in both cases. A failure to revoke is reported honestly with retry.
- **Public context:** `/report`, matching, tracking and location requests must not inherit a staff bearer or trigger staff token refresh. Employee history/detail/comment requests use the employee match/access credential and kiosk session header explicitly. A retained staff cookie is used only when deliberately resuming the workspace; public reload must remain public. Keep tokens out of localStorage.
- **My Tickets (confirmed):** match via `POST /employees/match`, use its credential with `GET /tickets/my-tickets`, then populate `employeeTickets`. Default Pending includes `OPEN`, `PROG`, `RESL`; Completed includes `CLSD`. Server constrains ownership. Re-match on expiry; clear previous person's data when identity changes. Add a bounded pagination contract if required before claiming a full history count.
- **Track Code:** `GET /tickets/track/{code}` returns a public receipt, which the lookup tab renders directly. Do not insert a made-up `Ticket` into `tickets` and then search `employeeTickets` for it. Matching unlocks private details via `POST /tickets/{code_or_id}/verify-access`. A generic shared link follows the same flow; a closure credential is handled by the existing separate verification flow. Staff authentication is never employee confirmation.
- **Location preview:** retain browser latitude/longitude, accuracy and timestamp in local form state; render them plus a coordinate-based map link. Use the existing observation POST to persist and attach its ID to the ticket. Capture and save are separate states. Retry replaces the active observation reference; “Use without location” omits it. No new map SDK, geocoding backend or inferred street address; official directory location stays locked.

## Connection and contract authority

- Frontend base: `VITE_API_BASE_URL`, otherwise `/api/v1`, in [client.ts](../../frontend/src/api/client.ts). Local Vite proxies `/api` to `http://localhost:8000`; see [vite.config.ts](../../frontend/vite.config.ts). Absolute API URLs must include `/api/v1`. Check browser origin, backend CORS and refresh-cookie behavior together.
- `GET /health/ready` on the backend checks database migration head and Redis; `/health` and `/api/v1/ping` alone do not prove persistence. Vite currently proxies `/api`, not `/health`.
- Detailed field constraints live in [schemas.py](../../backend/app/schemas.py), route implementations in [backend/app/api](../../backend/app/api), and generated [openapi.json](../../backend/openapi.json). Run `python -m scripts.export_openapi --check` from `backend` before handoff. Runtime authorization/error branches also require tests; OpenAPI does not enumerate every error today.
- Paths below are relative to `/api/v1`. `{ticket_id}` and record IDs are backend UUIDs, not display ticket codes or `t-*`/`tracked-*` browser IDs. Employee ID numbers are strings of 1–50 ASCII digits with leading zeros preserved.
- Staff requests use the RAM access token and refresh cookie. Employee matching uses `X-Kiosk-Session-ID`; employee conversation access uses the verified employee credential, not a fabricated staff session. Explicitly distinguish staff refresh from employee access failures.

## Endpoint-to-screen map

Client methods are in `frontend/src/api/client.ts` unless marked `repairNotes.ts`. For payload names below, follow the linked backend schemas rather than adding guessed fields.

Access descriptions in this inventory reflect the existing two-role routes. The target matrix above defines the required redesign; “staff” below must not be read as blanket permission for Intern/Supervisor. Recheck current caller status during S0 because implementation is moving alongside this plan.

| Sprint / screen action | Exact method + path | Access / input → output | Current frontend connection or required change |
| --- | --- | --- | --- |
| S1 Staff login/session | `POST /auth/login`; `POST /auth/refresh`; `GET /auth/me`; `POST /auth/logout` | Login `{username,password}` → `TokenOut`; refresh cookie → `TokenOut`; bearer → `UserOut`; logout → 204 | Methods present; `loginAsStaff` now opens real login. Fix logout order and public-context hydration; expand role types without non-admin → Support fallback |
| S1 Public employee match | `POST /employees/match` | Public, session header + `EmployeeMatchInput` → `{matched,match_token,employee}` | `directoryApi.matchEmployee` / kiosk hook present; wire the same valid match into My Tickets and verify precise response types |
| S1/S2 Staff employee lookup | `GET /employees/lookup?q=...` | Staff bearer; employee ID/email → employee profile | `directoryApi.lookupEmployee` / quick intake. **Not public** in current backend; older contract text is stale |
| S1 Reference dictionaries | `GET /dictionaries` | Staff bearer → companies, locations, departments, tasks, location-department pairs | `adminApi.getDictionaries` / `teamSlice`; no substitute business records on failure |
| S2 Public submit | `POST /tickets/submit` | Public + verified match/session; `TicketInput` → 201 `PublicTicket` | `ticketsApi.submitPublicTicket` / `publicIntakeSlice`; real POST exists but creates an enriched local ticket afterward. Use receipt model |
| S2 Optional location | `POST /locations/observations` | Public; `LocationObservationInput` → 201 `{observation_id,status}` | `locationApi.recordObservation`; reconcile required `session_id` and `accuracy`. Permission denial must not block ticket reporting |
| S2 Staff quick intake | `POST /tickets/quick-intake` | Staff; `QuickIntakeInput` → 201 `TicketOut` | `ticketsApi.quickIntake` / `useQuickIntake` and operations slice; verify directory binding and reload |
| S2 Queue/detail | `GET /tickets`; `GET /tickets/{ticket_id}` | Staff; queue filters/pagination → `TicketOut[]`; UUID → `TicketOut` | `ticketsApi.getQueue` and `getTicket` present; verify explicit queue errors, pagination and new Intern scoping |
| S2 Public receipt tracking | `GET /tickets/track/{code}` | Public → only `{ticket_code,status,created_at}` | `ticketsApi.trackTicket`; remove invented company/department/task/mode and synthetic full ticket from tracking mapper |
| S2/S3 Employee history/access | `GET /tickets/my-tickets`; `POST /tickets/verify-access`; alias `POST /tickets/{code_or_id}/verify-access` | Verified employee identity for history; `TicketVerifyAccessInput` → `{authorized,access_token,ticket,can_close,can_reopen}` | Clients now present in `ticketsApi`; connect the My Tickets tab's matching/load flow and render the correct employee store |
| S3 Claim/dispatch | `PATCH /tickets/{ticket_id}/claim`; `PATCH /tickets/{ticket_id}/assign` | Staff claim; admin assignment `{technician_id}` → `TicketOut` | Client methods present; drawer/header still call local `claimTicket`. Remove mock-ID assignment success path |
| S3 Diagnosis/service notes | `PATCH /tickets/{ticket_id}/service-record` | Staff with ticket authorization; `ServiceRecordUpdate` → `TicketOut` | `ticketsApi.updateServiceRecord` present; replace remaining local task/description save callers, preserve original description |
| S3 Progress/resolve | `PATCH /tickets/{ticket_id}/status` | Staff with transition/ownership rules; `StatusInput` → `TicketOut`, optional `closure_url` | `ticketsApi.updateStatus` present; reconcile returned record. Local mode-only edit needs an agreed persisted contract; do not invent an endpoint |
| S3 Verification reminder | `POST /tickets/{ticket_id}/reissue-verification` | Staff with authorization/status checks → route-defined verification result | Client now present; verify permitted callers and distinguish a copied link from actual delivery |
| S3 Employee close/reopen | `POST /tickets/{ticket_id}/confirm-closure`; `POST /tickets/{ticket_id}/reopen` | Close: closure credential + `ClosureInput`; reopen: authorized identity + `ReopenInput`; current clients expect full `TicketOut` | Dedicated clients now present; verify current response schemas and every caller, retain the employee sign-off boundary |
| S3 Conversation | `GET /tickets/{ticket_id}/comments`; `POST /tickets/{ticket_id}/comments` | Authorized staff/employee; POST `{body,is_internal}` → 201 `CommentOut`; GET → `CommentOut[]` | Clients now expose backend author fields; verify employee credential selection, Intern assignment scope and private-note visibility |
| S4 Staff administration | `GET /admin/users`; `POST /admin/users`; `PATCH /admin/users/{user_id}` | Admin; pagination / `UserCreate` / `UserUpdate` → `UserOut[]` / `UserOut` | `adminApi` methods present. Persist supported fields; local storage cannot represent saved department/hub data absent from schema |
| S4 Employee directory | `GET /admin/employees`; `POST /admin/employees`; `PUT /admin/employees/{employee_id}` | Admin; `EmployeeInput` for writes → employee profile; path ID is UUID | List/create clients present; add update client for retained edit/deactivate controls. `deleteEmployeeApi` currently removes only a local row; no employee DELETE route exists |
| S4 Repair library | `GET, POST /repair-notes`; `GET, PATCH, DELETE /repair-notes/{id}` | Staff with service permissions; create/update schemas; revision on update/delete; list → `{items,total,offset,limit}`; delete → 204 | `repairNotes.ts` methods and notes slice present; verify author/admin permissions and stale revision conflicts |
| S4 Ticket checklist | `GET /tickets/{ticket_id}/checklist`; `POST /tickets/{ticket_id}/checklist/apply`; `POST /tickets/{ticket_id}/checklist/steps`; `PATCH, DELETE /tickets/{ticket_id}/checklist/steps/{step_id}` | Staff with service permissions; checklist schemas → `TicketChecklistOut`; delete revision in query | `repairNotes.ts` methods present; make step-create revision required to match backend; verify edits survive reload |
| S4 Terminal hubs | `GET /locations/hub-summaries` | Staff → `HubSummaryOut[]` | `locationApi.getHubSummaries` / terminal views present; use server aggregates, not totals from one queue page |
| S4 KPIs/reports/export | `GET /reports/kpis`; `GET /reports/{report_name}` | KPIs: staff; reports: admin; filters below → KPI object / `{date_from,date_to,rows}` / CSV | `reportsApi` / reports slice present; type report rows and prove totals/filter/null behavior |
| Scope inventory: ticket evidence | `POST, GET /tickets/{ticket_id}/attachments`; `GET /tickets/{ticket_id}/attachments/{attachment_id}` | Staff with ticket authorization; POST multipart `file`; list/download per route | No dedicated client found. Wire if retained in accepted UI; otherwise keep explicitly unavailable. This is ticket evidence, not historical CSV/Excel ingestion |
| Scope inventory: administration support | `POST /admin/location-departments`; `POST /admin/maintenance-plans`; `PUT /admin/maintenance-plans/{plan_id}` | Admin; `ScopeInput` / `PlanInput` → route-defined saved data | No dedicated client found. Do not add new screens just because APIs exist; include only retained required controls |

## Critical contract details and known gaps

1. **Public submit is a receipt.** `PublicTicket` has no UUID or employee profile. Keep the returned code/status/time; obtain full details through authorized access before offering mutations. The description is not automatically a saved conversation message.
2. **Matching response:** backend `employee` contains only `full_name`, `company_name`, `location_name`, `department_name`. Correct frontend types; do not populate nonexistent IDs with sample values. Public matching requires ID + registered email; ordinary staff lookup remains authenticated.
3. **Authorization regression gate:** the 2026-10-28 source now rejects employee number alone and returns `can_close=False` for staff/match-only access. Preserve these boundaries while adding My Tickets and new roles; valid closure credentials remain separate from matching. Verify wrong employee, expired token and staff sign-off rejection in browser/API tests.
4. **Service record:** payload must include at least one of `task_code`, `diagnosis`, `resolution_notes`. `TicketOut` contains diagnosis/resolution fields missing from the frontend `StaffTicketResponse` declaration/mapping today. Preserve them across reload. A standalone support-mode save contract is not established merely because status PATCH accepts `mode`.
5. **Comments:** map `author_name`/`author_role`; employee `user_id` may be null. Respect private/internal visibility. Send employee credentials explicitly and distinguish failed sending from a saved message.
6. **Pagination:** queue uses `status`, `technician_id`, `location_id`, `order`, `offset`, `limit` (default 50, maximum 200). Omitted status excludes closed tickets; history must request `CLSD` or `ALL` explicitly. Admin lists and comments use `offset`, `limit` (default 100, maximum 200); repair notes use `offset`, `limit` (default 50, maximum 100), `task_code`, `q`. A page is not the total dataset; extend client signatures where these parameters are missing.
7. **Revision conflicts:** repair-note PATCH requires `expected_revision`; DELETE uses that query parameter. Checklist step writes require `expected_checklist_revision` (DELETE in query). Apply uses note ID + expected note revision, with existing-checklist revision/replacement flags when applicable. On conflict re-fetch and ask the user to review; do not silently overwrite.
8. **Reports:** names are `monthly-sla`, `staff-productivity`, `department-demand`, `backlog-exception`, `transit-lag`, `hardware-vulnerability`, `pms-compliance`, `chronic-requestors`. Filters: `date_from`, `date_to`, `company_id`, `location_id`, `department_id`; reports accept `format=json|csv`. Follow [reporting rules](REPORTING-RULES.md), including whole-calendar-month PMS ranges. Unknown/null KPIs remain unknown.

## Handoff and failure behavior

For each changed endpoint, backend supplies a reproducible request/response using a record in the disposable integration database, migration prerequisites, access rules and expected failure statuses. Frontend adds the typed client and actual screen caller in the same sprint row. Update this map and generated OpenAPI with the change; do not duplicate a second endpoint list in each person's plan.

| Result | Required frontend behavior |
| --- | --- |
| Successful empty response | Show a genuine empty state; no sample rows |
| Successful mutation | Use returned values/ID; refresh affected data; then show success |
| Network failure / 5xx | Show unavailable/save-failed with retry; retain form input; never show empty-success or fabricated records |
| 401 / 403 | Handle the correct identity/session; show sign-in or permission failure; no mock session |
| 400 / 404 / 410 / 422 | Show readable API error appropriate to the operation; do not pass validation objects directly to React |
| 409 | Show conflict, refresh server state, preserve unsaved input for review |
| 429 | Show cooldown/rate-limit feedback and honor retry information |

The next proof is a real browser write followed by an independent read and reload, recorded against the tested revisions. This source inventory is not that proof.
