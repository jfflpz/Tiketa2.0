# Backend sprint plan — Jefferson Lopez

Revised 2026-10-28. **Planning only; implementation and live verification remain open.**
Use the [shared sprint](INTEGRATION-SPRINT-PLAN.md) for status/acceptance and the [API map](../03-Contracts/API-INTEGRATION-MAP.md) for the single endpoint and role contract. This replaces the older backend phase list. Existing BF requirements remain unless explicitly amended there.

| Order | Backend deliverable | Frontend can work on concurrently | Handoff proof |
| --- | --- | --- | --- |
| S0 | Repeatable database/migration/readiness setup; combined GitHub integration job | Browser regression, error states, reproduction | Both developers can run the same real-stack smoke flow |
| S1 | Add intern/supervisor roles while preserving it/admin; audit every endpoint's permissions, assignment scope and cache isolation; fix session revocation | S2 tracking/history/location using existing APIs | Role matrix allow/deny tests; current-session revoke and refresh cannot resurrect access |
| S2 | Verify employee matching/history ownership, public tracking and optional location save; bounded history paging if needed | My Tickets, Track Code result, location preview and Tiketa branding | Known employee sees own requests; public receipt returns only allowed fields; expired/wrong identity denied |
| S3 | Apply role/ownership checks consistently to ticket, comment, checklist and resolution actions | Connect Workbench using merged S1 contract | Assigned Intern updates persist; other tickets and employee sign-off remain protected |
| S4 | Add Support account requests and Supervisor/Admin decisions; preserve Admin direct creation; Supervisor report access | S1/S3 integration against available APIs | Atomic approval creates one account; rejection none; duplicate decisions conflict |
| S5 | Complete migration/OpenAPI/backend CI gates and retained operational features | Full browser role/session acceptance | Required combined check passes on merge candidate and develop after merge |

Scope reaches models, role constraint migration, schemas/OpenAPI, auth/dependencies, ticket/notes/checklist/report/directory services, scoped cache keys, account-request storage/routes, existing fixtures/tests and combined CI. Preserve accounts, UUIDs, ticket assignments and it/admin wire values. No destructive reset or downgrade that strands new-role accounts.

Account-request API is proposed in the shared API map; do not assume it already exists. Reuse current provisioning validation/hashing. Employee matching is accountless; no public registration or web Excel/CSV uploader. Intern mutation scope is an explicit working assumption until confirmed.

Before handoff provide tested revision, migrations, runnable request/response, access/error rules and actual persisted ID. Frontend owns its callers; backend owns server fixes. Contract changes and shared CI need both reviews. Keep compatible APIs available while frontend work proceeds.

Branches: feat/backend-* from develop; conventional commits; PRs target develop. Only Jefferson merges. Required checks automate integration verification, not merging, deployment or defect repair. Use the shared plan's evidence record; do not mark a backend-only success as a finished feature.
