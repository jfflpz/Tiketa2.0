# Frontend/backend integration sprint

**Revised: 2026-10-28. Owners: Jefferson Lopez (backend), Rafael Emmanuel Codiñera (frontend).**
**Goal:** every available business action uses the API, persists correctly, and reports failure honestly. No mock business data in the running application.

This is the current integration execution plan. It supersedes conflicting mock-data, optimistic-success, and separate-track handoff guidance in older plans. Existing [BF-01–BF-12 requirements](BUG-FIXES-1.0.md) remain except where explicitly amended below. The user's four-role redesign replaces the earlier two-role requirement for planned implementation; current code still supports two roles. Use the [API integration map](../03-Contracts/API-INTEGRATION-MAP.md) for the single role/endpoint matrix and schema handoff.

## What the source review found

Snapshot: local `feat/be-fe-connection`, reviewed again on 2026-10-28 including existing uncommitted work. These are source findings, not runtime test results. Earlier findings must not be treated as unchanged defects: verification clients and real-login handling have since been updated.

| Finding | Evidence | Sprint action |
| --- | --- | --- |
| IT ticket list fetches admin-only users on mount | `features/tickets/TicketListsView.tsx` → `fetchITMembers` → `/admin/users` | S1: gate the request and its dispatch controls; do not silence all 403 errors |
| Logout clears the bearer before calling a bearer-protected logout endpoint | `store/slices/authSlice.ts`, backend `api/auth.py` | S1: await revocation before clearing credentials; stop polling and late refresh responses |
| Track Code writes the shared staff ticket store, then selects from a different employee store | `publicIntakeSlice.ts`, `EmployeeTicketScreen.tsx` | S2: render the returned public receipt directly; load My Tickets separately after matching |
| Geolocation state drops latitude/longitude and displays only a capture badge | `features/kiosk/hooks/useEmployeeIntake.ts`, `KioskIntakeForm.tsx` | S2: show actual coordinates, accuracy, timestamp and map link; distinguish capture from save |
| Database role constraint, auth checks and UI routing assume only `it`/`admin` | Backend `models/user.py`, `api/deps.py`, `schemas.py`; frontend `App.tsx`, `authSlice.ts` | S1/S4: expand roles without granting new roles every `CurrentUser` endpoint |
| Kiosk header already says Tiketa in this checkout; browser title remains longer | `KioskTopBar.tsx`, `frontend/index.html` | S2: verify the built page and make both visible brand heading and document title exactly `Tiketa` |
| Frontend CI runs type-check/build, but neither its tests nor a connected browser flow | `.github/workflows/frontend-ci.yml` | S0/S5: add functional gates for both backend and frontend PRs |

Paths above are relative to `frontend/src/` unless explicitly qualified. The reports of unauthorized toasts and blank My Tickets still require browser reproduction.

## Agreed behavior

| Requirement | Planned behavior / acceptance |
| --- | --- |
| **R1 Role visibility** | IT Intern: KPI, job logs, Workbench, repair notes. IT Support and Admin retain their existing permitted features. **IT Supervisor**: reports and account-request approval. Hide forbidden navigation, buttons, hotkeys and their fetches; backend still denies forbidden direct requests. Full permissions are in the API map. |
| **R2 Return/logout choice** | In the existing exit dialog, add **“Keep my staff session on this device”**, unchecked by default. Unchecked: revoke the current session, then return to `/report`. Checked: return to `/report` with the session retained; label this “Return to ticket creation”, not signed out. See session rules below. |
| **R3 Location preview** | After permission succeeds, display latitude/longitude, accuracy in metres, capture time, **View on map**, **Retry**, and **Use without location**. Map opens only on user action. Show “captured, not saved” if persistence fails. Keep the employee's official terminal unchanged; location remains optional. |
| **R4 My Tickets — confirmed by user** | Match Employee ID + registered email, then fetch only that employee's tickets. Reuse a still-valid match from Create Ticket in the same kiosk session. Show Pending (`OPEN`,`PROG`,`RESL`) and Completed (`CLSD`) filters, with loading/empty/error/retry states. Re-match after expiry or a fresh session. |
| **R5 Track Code** | Valid code renders its returned code/status/time immediately in Track Code. It must not merely switch to an empty My Tickets tab. Require matching before private details/conversation; verified closure links retain their separate credential rules. Invalid code and unavailable backend have different messages. |
| **R6 Branding** | Visible kiosk brand heading and browser title read **Tiketa**. Verify served build as the current source header already has this text. |
| **R7 Account approval — confirmed by user** | Admin keeps direct creation. IT Support submits staff-account requests; IT Supervisor reviews them. Admin can also review. Approval creates one usable account; rejection creates none. No public registration. |

**Working assumption, not yet confirmed:** Interns can update assigned tickets in Workbench, with assigned job logs and repair-library content read-only. They cannot claim unassigned work, dispatch, manage accounts, or perform employee sign-off. Default landing: Intern/Support → KPI overview; Supervisor → reports; Admin → existing dashboard. Fail closed for unknown roles; never map every non-admin to Support.

**Session rules:** both exit choices stop staff polling, invalidate in-flight requests, clear staff screen data and old employee matching context, and navigate to `/report`. Public requests must not inherit a retained staff bearer or trigger staff refresh. Retained refresh cookies may restore staff access only when explicitly returning to the workspace; a reload of `/report` stays public. A retained session allows another person on that device to return to staff access, so the checkbox states that consequence. For revoke, keep the bearer until the server confirms revocation, then clear it and the cookie. If revocation fails, show failure/retry without claiming sign-out completed. Prevent late refresh responses from resurrecting a revoked session and clear revoked-session data in other tabs. This is current-session revocation, not sign-out on every device.

## One sprint, two coordinated tracks

Order is dependency-based, not a promise of fixed completion dates. At kickoff, estimate the remaining work against the current branch and set the sprint dates together. All rows start **Planned**; existing implementation must pass acceptance before a row advances.

| ID / dependency | Backend — Jefferson | Frontend — Rafael | Shared acceptance |
| --- | --- | --- | --- |
| **S0: shared baseline and CI** / first | Confirm migrations/readiness and disposable PostgreSQL/Redis; publish current endpoint schemas and implement the shared CI environment | Reproduce Track Code/logout/role failures; add real-browser baseline and explicit empty/error states | Both developers run the same browser → API → database flow; CI runs on changes in either tier |
| **S1: roles and session exit** / S0 | Add compatible role migration, explicit endpoint/scoped-data guards, role-change invalidation and reliable current-session revoke | One typed role/view/action map for navigation, routes, controls and fetches; checkbox exit flow; isolate public and staff requests | R1/R2: no forbidden requests during normal navigation, forged requests still fail, both exit choices work after reload |
| **S2: employee experience** / S0, alongside S1 | Verify existing match/history/track/location contracts, ownership and expired credentials; add history pagination if needed | Connect matching to My Tickets, render Track Code result, add location preview/retry and Tiketa title | R3–R6: create → pending list → track result; wrong employee denied; location shown accurately; errors remain visible |
| **S3: ticket lifecycle** / S1/S2 | Verify role and assignment checks across claim, diagnosis, comments, checklist, resolution and employee closure | Use saved responses across Workbench/details; restrict Intern controls and remove remaining local-only success paths | Support → assigned Intern → Support/Admin → employee can collaborate on the same persisted ticket without widening access |
| **S4: account requests and reports** / S1; may overlap S3 | Add the small request/decision API, atomic provisioning and audit fields; allow Supervisor reports; preserve Admin creation | Support request/status form; Supervisor approval queue and reports; Admin retains existing management | R7: pending → approved/rejected; duplicate decision creates no duplicate user; Support/Intern cannot approve |
| **S5: complete operational acceptance** / S1–S4 | Complete backend gates, migration/role/cache isolation and existing hub/notes/report verification | Complete UI tests, type-check/build and retained operational screens; verify all roles and session cases | R1–R7 plus remaining BF-01–BF-12 pass on the combined candidate; post-merge checks pass on `develop` |

**Parallel work:** during backend S1, frontend implements S2 against existing APIs; during backend S4, frontend completes S1/S3 against the merged role contract. Backend stays one compatible API change ahead. No frontend mock backend is needed. Work that uses a new contract waits for that contract; independent work continues.

**File ownership:** backend owns `backend/**` and backend/combined CI service setup; frontend owns `frontend/**` and browser checks. Each author updates their existing tests/fixtures. Both review changes to this plan, API contracts, generated OpenAPI/TypeScript role types and shared CI. Frontend does not weaken backend permissions to make a screen work; backend does not remove fields without coordinating callers. Ownership coordinates edits, not access to the shared repository.

## No mock data policy

- Normal development, integration and production use real API responses. No demo toggle, fabricated tickets/users/messages/chart values, local-only business saves, or fallback sample records.
- A successful empty response shows “No records yet.” A failed request shows “Could not load/save” with retry. A missing feature is explicitly unavailable and cannot report success.
- Preserve real null/unknown values; do not turn unknown support mode into `SITE`, missing metrics into zero, or public receipts into invented staff records. Zero is shown only when returned or correctly derived from complete server data.
- Mutations show a pending state and prevent duplicate clicks. Update committed UI state and show success only after the response; on failure retain the user's input and show the error. Re-fetch affected lists/totals.
- Failed refreshes must visibly mark previous data unavailable/stale; they must not look like a fresh successful load. Clear user-specific data on logout/session change.
- Isolated automated-test fixtures may remain under tests; they must never populate the running app or substitute for connected acceptance. Use a disposable real database for integration, with only required reference data/accounts initially; create operational records through the API/UI. Do not run demo-operation seeders in the default acceptance setup.
- Form hints, static labels and navigation preferences are fine; invented operational facts and locally “saved” business fields are not.

## Keep both developers moving

1. Each morning choose one shared flow, confirm its endpoint contract, and identify each person's next independent task. Keep one active feature per person plus its integration fixes.
2. Backend handoff includes method/path, schema, access, errors, migrations, runnable environment/revision and a reproducible request. Frontend handoff includes screen/action, actual request, returned record ID and reload result.
3. If blocked for 30 minutes, record the failing request/status, expected result, responsible layer and next check; review together that day. Do not hand the entire failure to the other developer.
4. While backend fixes a blocker, frontend can finish typed clients, explicit error states, pagination or already-available admin/notes APIs. While frontend integrates, backend can verify the next compatible API, migrations or aggregation tests. Neither uses mock UI data to claim progress.
5. Use one status per shared row: **Planned → In progress → API ready → Connected → Verified → Merged**. API ready requires a working endpoint; Connected requires a browser request; Verified requires persistence and failure checks. Log blockers alongside the status.

## Gate for every individual merge

Feature branches start from `develop`; use `feat/backend-*` / `feat/frontend-*`, conventional commits, and PRs targeting `develop`. Only Jefferson merges. Preserve existing local work; no direct protected-branch commits or force-pushes.

- Test the candidate with latest `develop`, not only with an unmerged companion branch. Record both backend and frontend revisions.
- Backend changes merge first when needed and must remain compatible with the existing frontend. The frontend PR then uses that merged API. For breaking changes, add the compatible contract first, migrate callers second, and remove the old contract only after callers are gone.
- Role rollout: retain existing `it` (displayed as IT Support) and `admin` values; add `intern` and `supervisor`. Keep existing accounts, IDs and ticket assignments. First expand schema and guard **all** affected endpoints; then merge frontend role support; only then provision new-role accounts. Never temporarily expose every authenticated endpoint to new roles. Do not roll back to a two-role server while new-role accounts exist without a reviewed migration plan.
- Every PR runs existing backend gates, frontend type-check/build and applicable functional tests, plus the connected smoke flow. Configure the integration workflow to trigger for changes in **either** tier and related deployment/configuration files. S0/S5 add this missing enforcement; it is not present today.
- A baseline smoke flow must use a real browser, FastAPI, PostgreSQL and Redis: match employee → submit → staff reads/claims → reload confirms persistence. Add changed-feature acceptance, including a failed request, to the same candidate check. S3 adds resolve/employee closure to the baseline.
- Readiness alone is insufficient. Capture the UI-triggered request, server response/record ID, independent API read or database check, and fresh-browser/reload result. A mocked test or build success does not prove this.
- Test empty data, unreachable API, validation errors, expired auth, permission denial and relevant concurrent-write conflicts. No false success, silent failure or phantom row is allowed.
- After each merge, repeat the smoke check on `develop`. If it regresses, stop dependent merges and have the responsible author repair it immediately; the other developer continues an independent ready task.

**GitHub automation to implement in S0:** a required `integration` check runs for every PR to `develop` and every push to `develop`, testing frontend and backend from the same candidate checkout. It starts disposable PostgreSQL/Redis, migrates, runs FastAPI and the frontend, and executes browser/API checks; failures upload logs and browser evidence. Jefferson configures branch protection to require the check and an up-to-date candidate before merging. Do not use path filters that skip backend-only PRs. No automatic merge is enabled. This automates verification, not compatibility fixes or deployment; a shared preview deployment is outside this sprint.

**Required regressions:** all four roles' allowed screens load without unauthorized toasts; forbidden screens do not fetch; direct API denial remains. Test both exit choices with pending requests, page refresh and a second tab. Test My Tickets empty/populated/expired/wrong employee, valid/invalid Track Code and shared links, location accepted/denied/save failed, and approval accept/reject/concurrent double approval. Retain the no-mock persistence checks above.

### PR evidence / shared status record

Copy this small record into each PR and update the relevant S-row status:

```text
Sprint row / BF requirement:
Backend owner / frontend owner:
Backend revision / frontend revision / develop base:
Endpoints + schema/migration changes:
Environment + test database identity (no credentials):
UI action → response status + record ID → independent read → reload result:
Empty/error/conflict checks:
Automated checks + evidence link:
Status / blocker / next task / next joint check:
```

Planning deliverable only: application changes, CI enforcement and live integration verification remain to be executed. This review does not certify the current branch as working.
