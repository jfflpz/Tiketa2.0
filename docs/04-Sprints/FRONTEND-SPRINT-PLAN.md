# Frontend sprint plan — Rafael Emmanuel Codiñera

Revised 2026-10-28. **Planning only; implementation and live verification remain open.**
Use the [shared sprint](INTEGRATION-SPRINT-PLAN.md) for status/acceptance and the [API map](../03-Contracts/API-INTEGRATION-MAP.md) for exact endpoints and permissions. This replaces the older frontend timeline and examples.

| Order | Frontend deliverable | Backend can work on concurrently | Handoff proof |
| --- | --- | --- | --- |
| S0 | Reproduce current role/logout/tracking failures; real-browser smoke and explicit loading/empty/error states | Shared integration environment and role contracts | Browser action reaches real API/database; failed requests never display mock success |
| S2, alongside backend S1 | Match employee in My Tickets; Pending/Completed filters; render Track Code receipt directly; location preview/retry/omit; Tiketa header/title | Four-role permissions and session endpoint fixes | Created ticket appears after fresh retrieval; valid tracking has visible result; wrong employee denied |
| S1, after compatible role API | Typed role map used by routes, sidebar, buttons, hotkeys, polling and loaders; exit checkbox; separate staff/public request context | Account-request API and report permissions | Every role sees only permitted content; no unauthorized background fetches; both exit choices survive reload |
| S3 | Connect ticket lifecycle and assigned Intern Workbench; remove any remaining local-only mutations | Server role/scope/conflict verification | Saved changes survive another browser; denied or failed updates remain unsaved |
| S4 | Support request/status form; Supervisor approval queue/reports; keep Admin direct creation and management | API/concurrency/permission tests | Pending request becomes approved/rejected; unauthorized actions are hidden and server-denied |
| S5 | Retained notes/checklists/hubs/report integration; frontend tests/type-check/build; full role/session/browser checks | Migrations/backend CI and operational acceptance | Combined candidate and post-merge develop checks pass with evidence |

Scope reaches App, route helpers, Sidebar/header/hotkeys/modals, typed API clients and role models, domain slices/polling, kiosk screen and Track Code/receipt/panel, intake hook/location preview, account/report screens, index.html, existing tests/fixtures and browser CI. Keep strict TypeScript, atomic selectors, domain slices and asynchronous session/lookup cancellation.

Reuse the existing match form/credential flow. My Tickets reads employeeTickets from the employee API; Track Code renders its public response instead of selecting a synthetic ID from another store. Full details require matching; employee closure keeps its dedicated credential checks. Never show cached data as freshly verified after a request fails.

Exit dialog: “Keep my staff session on this device” starts unchecked. Checked returns to ticket creation with session retained; unchecked awaits server revocation before clearing tokens. Both stop staff fetches and clear sensitive screen state. Show revocation errors honestly. Public pages never use a staff bearer or silently resume the workspace.

Location: coordinates, accuracy, capture time, click-to-open map, Retry and Use without location; distinguish captured from saved. No map SDK/address lookup is needed. Current header source already says Tiketa, so verify the served build and document title before changing markup.

Branches: feat/frontend-* from develop; conventional commits; PRs target develop. Only Jefferson merges. Use merged compatible APIs; while waiting, work on existing employee APIs or error states. No runtime mock data. A successful build is not proof of integration; use the shared plan's write/read/reload evidence.
