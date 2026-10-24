# Tiketa — Bug Fixes 1.0 Sprint Plan

Updated: 2026-10-24. Status: planned; implementation has not started under this plan.

## 1. Sprint structure

**One sprint, two people, two parallel tracks, one shared completion gate.** All BF-01 through BF-12 requirements belong to this sprint.

- **Person 1 — Backend:** database changes, migrations, API contracts, persistence, authorization, backend tests and server integration.
- **Person 2 — Frontend:** routes, forms, ticket screens, state synchronization, API integration, browser behavior and frontend tests.
- **Both:** agree on contracts, reproduce cross-layer defects, integrate each workflow, review changes and demonstrate the finished release.

Execution documents:

| Document | Purpose |
| --- | --- |
| [Backend track](BUG-FIXES-1.0-BACKEND-PLAN.md) | Person 1's tasks, dependencies, deliverables and checks |
| [Corrected backend M1/M2 plan](BUG-FIXES-1.0-BACKEND-M1-M2-IMPLEMENTATION-PLAN.md) | Reviewed migration/API strategy for B-01–B-04, including numeric-only IDs |
| [Frontend track](BUG-FIXES-1.0-FRONTEND-PLAN.md) | Person 2's tasks, dependencies, deliverables and checks |
| [Requirement backlog](BUG-FIXES-1.0.md) | Original findings, intended behavior and BF-01–BF-12 acceptance criteria |

**Sprint goal:** Make employee reporting, staff navigation, ticket diagnosis/lifecycle, job history, accounts, conversations, repair notes, overview metrics and browser location work against persistent backend data, including refresh and failure paths.

**Timebox:** Start and end dates have not been specified. The working estimate remains 25–39 combined person-days including testing, based on source inspection. Set the sprint window using the two people's actual availability and the backend/frontend dependency sequence. The single-sprint structure includes the full scope and final integrated testing; no requirements are assigned to a later sprint.

## 2. Scope allocation

All items start as Planned. B/F identifiers below refer to tasks in the two execution documents. A BF requirement is complete only when its backend and frontend work, where applicable, pass the original acceptance checks together.

| Requirement | Backend responsibility | Frontend responsibility |
| --- | --- | --- |
| BF-01 — Submission white screen | B-01: reproduce API failures and verify validation responses | F-02: fix actual crash, normalize errors, retain input and show receipt |
| BF-02 — Login and routing | B-01: confirm login/refresh/logout contract | F-01: dashboard landing, public route behavior, verification-link login and one Login button |
| BF-03 — Report and diagnosis | B-02: persist original issue/details and separate diagnosis/resolution | F-02/F-03: six-button title, description-only additional details and diagnosis workflow |
| BF-04 — Ticket history/status | B-03: complete ticket reads, status filters, dates/duration and pagination | F-04: fresh employee/staff status, closed history and canonical mapping |
| BF-05 — Bell/messages/dispatch | B-03/B-05: durable claim/assignment and conversation summaries | F-04/F-05: all action entry points, current bell/dispatch and persistent message summaries |
| BF-06 — Employee/technician chat | B-05: message storage and participant authorization | F-05: real conversation reads/writes and refresh/retry handling |
| BF-07 — Repair notes/checklists | B-06: persisted library and independent ticket checklist instances | F-06: create/edit/delete/apply and saved checklist progress |
| BF-08 — Accounts/employees | B-04: directory APIs, numeric-ID migration/validation, roles and password handling | F-07: staff/employee forms and lists, password input and numeric-only employee IDs |
| BF-09 — Overview charts | B-07: scoped monthly aggregates and documented metrics | F-08: live chart data, dynamic year and correct labels |
| BF-10 — Drawer/workbench UX | B-02/B-05: diagnosis save and conversation behavior | F-03/F-05: Service Record & Diagnosis default, shortcuts and internal-note control removal |
| BF-11 — Modal backdrop | No API dependency | F-09: full-viewport overlays, stacking, scrolling and focus |
| BF-12 — Browser location | B-08: separate location observations and association | F-09: permission request, capture, save and denial/error handling |

## 3. Shared milestones inside this sprint

These are integration checkpoints within the same sprint. Backend and frontend work proceed together; each finished API is handed over immediately.

| Milestone | Person 1 — Backend | Person 2 — Frontend | Shared exit check |
| --- | --- | --- | --- |
| M1 — Reproduction and contracts | Reconcile existing local changes; reproduce intake failures; publish API/data changes and migration sequence | Reproduce affected screens; start login/crash/modal fixes; prepare typed clients from agreed contracts | Known causes recorded, payloads agreed and test environment available |
| M2 — Core ticket workflow | Deliver ticket fields, directory validation, lifecycle/history and assignment | Connect account/employee forms, intake, diagnosis, lists, bell and dispatch | Create account/employee → submit → claim/assign → diagnose → resolve → verify → job history survives reload |
| M3 — Conversations and repair library | Deliver participant access, messages/summaries, notes and checklist APIs | Connect chat, header summaries, note editing/deletion and ticket checklists | Two browsers exchange persisted messages and observe persisted repair-note changes |
| M4 — Overview and location | Deliver aggregates and browser-location persistence | Connect charts, location permission/capture and remaining UI work | Chart values match known records; consented location is saved separately from official terminal |
| M5 — Integrated acceptance | Rehearse migrations and complete backend/recovery checks; fix integration defects | Complete browser/mobile/error-path checks; fix integration defects | All BF-01–BF-12 acceptance checks pass with evidence |

Independent work can overlap: frontend routing, error rendering and overlays can proceed while backend contracts are finalized; frontend can connect existing directory APIs while new ticket APIs are built. Backend overview/location work can proceed after handing over conversations/notes while frontend integrates them. Keep the integration environment usable throughout.

## 4. API handoff agreement

Person 1 owns backend schemas and the generated OpenAPI description. Person 2 owns matching TypeScript types and client methods. For every changed or new endpoint, hand over:

1. Path/method, access rules and any employee ticket-access mechanism.
2. Request/response examples, IDs, nullable fields, status codes, validation errors and pagination.
3. Persistence behavior, lifecycle effects, cache refresh expectations and migration prerequisites.
4. A runnable backend test or reproducible API example using seeded non-production records.

Person 2 connects the real endpoint and demonstrates a save/read after reload before marking integration done. Development fixtures can unblock layout work, but they must not provide the completed production behavior.

## 5. Decisions and dependencies

- Preserve the existing uncommitted backend changes; reconcile their tested behavior before changing the same files.
- Reproduce the white screen. Validation objects reaching React toast content are a hypothesis until the failure is observed.
- Define stable six-button issue labels, original description, diagnosis and resolution fields together. Preserve historical records and canonical 15-field job-log exports.
- Use consistent statuses: OPEN = awaiting technician, PROG = in progress, RESL = repaired/awaiting verification, CLSD = verified/closed. RESL and CLSD appear in completed history.
- Apply the updated numeric-only employee-ID requirement through a collision-checked migration that preserves UUIDs and leading zeros. Recommended bounds are 1–50 ASCII digits. Coordinate frontend prefix removal and backend enforcement; see the corrected M1/M2 plan.
- Document accountless employee conversation access and recovery. Ticket code or Employee ID alone must not expose a conversation. Staff login must never act as employee closure confirmation.
- Agree repair-library edit/delete permissions and retain applied ticket records when templates change.
- Define overview completion-month/personal/fleet scope separately from creation-month SLA reports.
- Browser location alongside official terminal is confirmed. Document observation association, access and retention; preserve the directory-derived terminal and support denied permission.

Resolve these within the relevant tasks and record the result in the contracts/backlog. They are not separate sprints or extra approval stages for routine implementation.

## 6. Shared completion checklist

- [ ] Every BF-01–BF-12 requirement passes its original acceptance checks.
- [ ] Database writes survive page refresh, a second browser and a new session where access is authorized.
- [ ] No production sample notes/charts or local-only success paths remain in the affected workflows.
- [ ] Meaningful backend tests, PostgreSQL/Redis integration, migrations/drift and OpenAPI checks pass under required CI gates.
- [ ] Frontend type-check/build and focused intake/routing/asynchronous-state regressions pass.
- [ ] A complete employee → technician → admin lifecycle is demonstrated across separate sessions, including real closure verification.
- [ ] Failure cases cover validation, duplicate/failed writes, concurrent claims, stale requests, expired sessions, denied location and unauthorized conversation access.
- [ ] Lists/messages spanning more than one API page remain correct; job history and chart totals agree with known database records.
- [ ] Existing-row migration and recovery are checked; modal coverage works on desktop/mobile and after scrolling.
- [ ] Record tested revision, environment, expected/actual results and evidence for each requirement.

Use backend/frontend feature branches based on `develop`, conventional commits and PRs targeting `develop`. Only Jefferson Lopez merges. Keep strict TypeScript, domain slices, atomic selectors, async lookup guards and session invalidation. Employee accounts, public registration and web uploaders remain outside the project scope.

Track each task as Planned → In progress → Ready for integration → Verified. If a dependency slips, show the blocker and revise the forecast within this sprint; do not remove a requirement or mark it complete without acceptance evidence.

Documentation update only: application code, migrations, execution and deployment are not performed by this plan.
