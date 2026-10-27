# Frontend/backend integration sprint

**Working plan: 2026-10-27. Owners: Jefferson Lopez (backend), Rafael Emmanuel Codiñera (frontend).**
**Goal:** every available business action uses the API, persists correctly, and reports failure honestly. No mock business data in the running application.

This is the current integration execution plan. It supersedes conflicting mock-data, optimistic-success, and separate-track handoff guidance in older plans. Existing [BF-01–BF-12 requirements](BUG-FIXES-1.0.md) remain in scope; this changes delivery order and acceptance, not their requirements. The [API integration map](../03-Contracts/API-INTEGRATION-MAP.md) is the shared endpoint index. Schema detail stays in backend OpenAPI rather than being copied into multiple plans.

## What the source review found

Snapshot: local `feat/be-fe-connection`, including existing uncommitted work. These are source findings, not runtime test results. No flow is marked verified by this review.

| Finding | Evidence | Sprint action |
| --- | --- | --- |
| Real API methods coexist with local-only ticket actions | `ticketOperationsSlice.ts`; active callers in `JobLogDrawer.tsx`, `TopHeader.tsx`, `ITWorkbenchBoardView.tsx`, `TicketConversation.tsx` | S2/S3: replace every business mutation caller, then remove obsolete local actions |
| Claim success appears before the response; closure/reopen errors can be swallowed | `ticketOperationsSlice.ts` | S0/S3: pending state first; success only after server confirmation |
| Queue errors are hidden; public tracking fabricates a full ticket from three response fields | `ticketQueueSlice.ts`, `publicIntakeSlice.ts` | S0/S2: visible failures; separate public receipt from staff ticket data |
| Frontend types disagree with backend employee-match and comment responses | `api/client.ts` versus `backend/app/schemas.py` | S1/S3: reconcile types and mapping against actual responses |
| Team metadata can exist only in local storage; a local fake-login helper remains defined | `teamSlice.ts`, `authSlice.ts` | S1/S4: remove fabricated identities and business metadata; trace helper usage before removal |
| Frontend CI runs type-check/build, but neither its tests nor a connected browser flow | `.github/workflows/frontend-ci.yml` | S0/S5: add functional gates for both backend and frontend PRs |

Paths above are relative to `frontend/src/` unless explicitly qualified.

## One sprint, two coordinated tracks

Order is dependency-based, not a promise of fixed completion dates. At kickoff, estimate the remaining work against the current branch and set the sprint dates together. All rows start **Planned**; existing implementation must pass acceptance before a row advances.

| ID / dependency | Backend — Jefferson | Frontend — Rafael | Shared acceptance |
| --- | --- | --- | --- |
| **S0: connection and honest states** / first | Confirm migrations, PostgreSQL, Redis, readiness and repeatable local setup; prepare disposable integration environment | Verify API URL/proxy/cookies; distinguish loading, empty, unavailable and forbidden; remove fake fallback records and premature success in touched flows | Ready backend + empty operational tables shows empty state; backend unavailable shows error/retry; failed save never looks saved |
| **S1: identity and contract** / S0 | Verify login/refresh/logout, dictionaries, staff lookup and public ID/email match; publish corrected schema and access rules | Reconcile API types; connect session restoration, role guards and verified employee scope; remove fake-login path | Reload restores a valid session; expired/invalid credentials are visible; public employee matching works without a staff account |
| **S2: submit and retrieve** / S1 | Verify public submit, quick intake, track, employee ticket access and queue persistence; correct authorization gaps | Use real receipt/UUID models; connect public/quick intake, queue and authorized employee history; implement pagination | Submit in browser A, find the same database record in staff browser B, reload both; failed submission creates no local ticket |
| **S3: complete ticket lifecycle** / S2 | Verify claim/assignment, service record, comments, verification, close/reopen and revision/conflict rules | Replace local claim/edit/chat/validation/closure actions; use dedicated endpoints and returned values | Claim → diagnose → resolve → employee verification → close persists; rejected actions remain unsaved; two browsers see persisted comments |
| **S4: operational screens** / S1; acceptance uses S2/S3 records | Verify admin directory, repair notes/checklists, hub summaries and reporting aggregates; provide missing business fields only when required | Connect every retained control; remove local-only metadata and invented defaults; handle filters, nulls, pagination and errors | Admin changes, notes and checklist edits survive a second session; charts and exports match known database records |
| **S5: merge protection and acceptance** / S0–S4 | Complete migration, contract, API/RBAC and existing backend CI checks; help diagnose integration failures | Run frontend functional tests/type-check/build; finish connected browser regression and missing/error states | Combined candidate passes the gate below and all existing BF acceptance checks; evidence identifies tested revisions |

**Per-person working order:** backend works one compatible API slice ahead; frontend completes the current slice against a runnable backend. S4 work on existing APIs may overlap S2/S3. Polish follows functional acceptance of the same slice.

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
- Every PR runs existing backend gates, frontend type-check/build and applicable functional tests, plus the connected smoke flow. Configure the integration workflow to trigger for changes in **either** tier and related deployment/configuration files. S0/S5 add this missing enforcement; it is not present today.
- A baseline smoke flow must use a real browser, FastAPI, PostgreSQL and Redis: match employee → submit → staff reads/claims → reload confirms persistence. Add changed-feature acceptance, including a failed request, to the same candidate check. S3 adds resolve/employee closure to the baseline.
- Readiness alone is insufficient. Capture the UI-triggered request, server response/record ID, independent API read or database check, and fresh-browser/reload result. A mocked test or build success does not prove this.
- Test empty data, unreachable API, validation errors, expired auth, permission denial and relevant concurrent-write conflicts. No false success, silent failure or phantom row is allowed.
- After each merge, repeat the smoke check on `develop`. If it regresses, stop dependent merges and have the responsible author repair it immediately; the other developer continues an independent ready task.

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
