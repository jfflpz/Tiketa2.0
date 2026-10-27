# Shared frontend/backend API integration map

**Source snapshot: 2026-10-27, local `feat/be-fe-connection`, including uncommitted changes.**
Use with the [integration sprint](../04-Sprints/INTEGRATION-SPRINT-PLAN.md). All listed backend routes exist in the inspected source; **none is certified integrated by this document**. “Client present” means a method exists, not that every screen calls it or that persistence has passed.

**Ownership:** Jefferson owns backend routes, schemas and persistence; Rafael owns TypeScript clients, screen/store callers and rendering. Both verify the same flow before marking it Verified.

## Connection and contract authority

- Frontend base: `VITE_API_BASE_URL`, otherwise `/api/v1`, in [client.ts](../../frontend/src/api/client.ts). Local Vite proxies `/api` to `http://localhost:8000`; see [vite.config.ts](../../frontend/vite.config.ts). Absolute API URLs must include `/api/v1`. Check browser origin, backend CORS and refresh-cookie behavior together.
- `GET /health/ready` on the backend checks database migration head and Redis; `/health` and `/api/v1/ping` alone do not prove persistence. Vite currently proxies `/api`, not `/health`.
- Detailed field constraints live in [schemas.py](../../backend/app/schemas.py), route implementations in [backend/app/api](../../backend/app/api), and generated [openapi.json](../../backend/openapi.json). Run `python -m scripts.export_openapi --check` from `backend` before handoff. Runtime authorization/error branches also require tests; OpenAPI does not enumerate every error today.
- Paths below are relative to `/api/v1`. `{ticket_id}` and record IDs are backend UUIDs, not display ticket codes or `t-*`/`tracked-*` browser IDs. Employee ID numbers are strings of 1–50 ASCII digits with leading zeros preserved.
- Staff requests use the RAM access token and refresh cookie. Employee matching uses `X-Kiosk-Session-ID`; employee conversation access uses the verified employee credential, not a fabricated staff session. Explicitly distinguish staff refresh from employee access failures.

## Endpoint-to-screen map

Client methods are in `frontend/src/api/client.ts` unless marked `repairNotes.ts`. For payload names below, follow the linked backend schemas rather than adding guessed fields.

| Sprint / screen action | Exact method + path | Access / input → output | Current frontend connection or required change |
| --- | --- | --- | --- |
| S1 Staff login/session | `POST /auth/login`; `POST /auth/refresh`; `GET /auth/me`; `POST /auth/logout` | Login `{username,password}` → `TokenOut`; refresh cookie → `TokenOut`; bearer → `UserOut`; logout → 204 | `authApi` / `authSlice`; methods present. Remove local `loginAsStaff`; verify reload and invalidation |
| S1 Public employee match | `POST /employees/match` | Public, session header + `EmployeeMatchInput` → `{matched,match_token,employee}` | `directoryApi.matchEmployee` / kiosk hook; frontend currently declares `status` and extra employee IDs not returned by backend |
| S1/S2 Staff employee lookup | `GET /employees/lookup?q=...` | Staff bearer; employee ID/email → employee profile | `directoryApi.lookupEmployee` / quick intake. **Not public** in current backend; older contract text is stale |
| S1 Reference dictionaries | `GET /dictionaries` | Staff bearer → companies, locations, departments, tasks, location-department pairs | `adminApi.getDictionaries` / `teamSlice`; no substitute business records on failure |
| S2 Public submit | `POST /tickets/submit` | Public + verified match/session; `TicketInput` → 201 `PublicTicket` | `ticketsApi.submitPublicTicket` / `publicIntakeSlice`; real POST exists but creates an enriched local ticket afterward. Use receipt model |
| S2 Optional location | `POST /locations/observations` | Public; `LocationObservationInput` → 201 `{observation_id,status}` | `locationApi.recordObservation`; reconcile required `session_id` and `accuracy`. Permission denial must not block ticket reporting |
| S2 Staff quick intake | `POST /tickets/quick-intake` | Staff; `QuickIntakeInput` → 201 `TicketOut` | `ticketsApi.quickIntake` / `useQuickIntake` and operations slice; verify directory binding and reload |
| S2 Queue/detail | `GET /tickets`; `GET /tickets/{ticket_id}` | Staff; queue filters/pagination → `TicketOut[]`; UUID → `TicketOut` | `ticketsApi.getQueue` present; add detail client as needed. Queue errors currently swallowed; support all pages |
| S2 Public receipt tracking | `GET /tickets/track/{code}` | Public → only `{ticket_code,status,created_at}` | `ticketsApi.trackTicket`; remove invented company/department/task/mode and synthetic full ticket from tracking mapper |
| S2/S3 Employee history/access | `GET /tickets/my-tickets`; `POST /tickets/verify-access`; alias `POST /tickets/{code_or_id}/verify-access` | Verified employee identity for history; `TicketVerifyAccessInput` → `{authorized,access_token,ticket,can_close,can_reopen}` | Missing API clients; verification slice currently unlocks locally. Reconcile backend authorization before connecting; see blocker below |
| S3 Claim/dispatch | `PATCH /tickets/{ticket_id}/claim`; `PATCH /tickets/{ticket_id}/assign` | Staff claim; admin assignment `{technician_id}` → `TicketOut` | Client methods present; drawer/header still call local `claimTicket`. Remove mock-ID assignment success path |
| S3 Diagnosis/service notes | `PATCH /tickets/{ticket_id}/service-record` | Staff with ticket authorization; `ServiceRecordUpdate` → `TicketOut` | `ticketsApi.updateServiceRecord` present; replace remaining local task/description save callers, preserve original description |
| S3 Progress/resolve | `PATCH /tickets/{ticket_id}/status` | Staff with transition/ownership rules; `StatusInput` → `TicketOut`, optional `closure_url` | `ticketsApi.updateStatus` present; reconcile returned record. Local mode-only edit needs an agreed persisted contract; do not invent an endpoint |
| S3 Verification reminder | `POST /tickets/{ticket_id}/reissue-verification` | Staff with authorization/status checks → route-defined verification result | Missing client; `requestValidation` currently creates a local reminder. Define typed response and actual delivery result |
| S3 Employee close/reopen | `POST /tickets/{ticket_id}/confirm-closure`; `POST /tickets/{ticket_id}/reopen` | Close: valid closure credential + `ClosureInput`; reopen: authorized identity + `ReopenInput`; → `{ticket_code,status}` | Missing dedicated clients; current actions use staff status PATCH or local state. Route employee actions to these endpoints |
| S3 Conversation | `GET /tickets/{ticket_id}/comments`; `POST /tickets/{ticket_id}/comments` | Authorized staff/employee; POST `{body,is_internal}` → 201 `CommentOut`; GET → `CommentOut[]` | `ticketsApi` staff methods present; kiosk still uses local messages. Backend uses `author_name`, `author_role`, nullable `user_id`; frontend expects `sender_*` |
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
3. **Authorization blocker:** current `verify_access` accepts an employee number alone and can issue closure permission to staff. This conflicts with the existing BF rule that ticket code/Employee ID alone must not expose conversations and staff login must not become employee sign-off. S2/S3 must reconcile the backend policy and add negative tests before declaring employee access integrated. Do not copy that permissive behavior into the frontend contract.
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
