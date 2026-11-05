# Tiketa Sprint 5.0 — Master Plan

Status: requirements agreed; implementation pending. Updated: 2026-11-05.

## Ownership and delivery

Backend: Jefferson Lopez. Frontend: Rafael Emmanuel Codiñera. Acceptance: both. Merge custody: Jefferson after peer review. Dates remain undecided until reproduction and estimation.

Companions: [Backend responsibilities](SPRINT-5.0-BACKEND-RESPONSIBILITIES.md), [Frontend responsibilities](SPRINT-5.0-FRONTEND-RESPONSIBILITIES.md), [Glossary](GLOSSARY.md).

## Evidence

Source inspection at repository HEAD 29a9b3d95cd0e9fd619fd51746c7a54ba4889316 found that EditITStaffModal resets another staff member's password; UserUpdate lacks username/current-password fields; ticket mutation authorization restricts Intern assignment but not IT/Admin assignment. Source inspection is not runtime reproduction. Implemented four-role schemas supersede stale two-role notes. Recheck current develop and preserve unrelated local changes before implementation.

## Traceability and acceptance

| ID | Agreed outcome and acceptance | Backend | Frontend |
| --- | --- | --- | --- |
| S5-01 | Full viewport backdrop/blur for Edit Staff Account Governance, Apply Saved Repair Guide, and Delete Repair Note; no uncovered top edge at desktop/small viewports or when scrolling. | B-06 | F-01 |
| S5-02 | Replace job-log CSV with XLSX; styled header, filters, readable widths, all matching authorized rows and canonical 15 columns. Other report formats unchanged. | B-07 (B-05 support) | F-05 review |
| S5-03 | Workbench and drawer show each detail once: summary/status/priority/assignee/creation date; original employee context; checklist and saved Technician Notes; available actions. | B-06 | F-02 |
| S5-04 | Remove Technician Work Controls card; retain Remote (REM)/On-Site (SITE) controls where editing is authorized. | B-01 | F-02 |
| S5-05 | Persisted notes visible in workbench after save/reload; clear empty state and no cross-ticket leakage. | B-05 | F-02 |
| S5-06 | Log Walk-In / Viber Support Ticket scrolling stays inside dialog; fields/actions remain reachable at small viewport and zoom. | B-06 | F-01 |
| S5-07 | Remove My Weekly Repair Hours; expand monthly output trend responsively, retaining real data and displayed year. | B-06 | F-06 |
| S5-08 | Non-owner staff, including Admin, cannot edit assigned work or send messages/add notes. Show Assigned to [name]. Server and UI enforce this. | B-01 | F-03 |
| S5-09 | Table and Kanban default to highest priority then oldest creation time, with creation date visible and stable ordering across pages. | B-02 | F-03 |
| S5-10 | Replace staff closure-confirmation card with compact Waiting for requester approval. Preserve requester confirmation, rejection reason and reopen behavior. | B-01 | F-02 |
| S5-11 | Close guide picker before replacement confirmation. Cancel reopens picker retaining selection and leaves checklist untouched. Successful apply persists and closes the flow. | B-05 | F-04 |
| S5-12 | Admin reset requires acting Admin current password plus target new password entered twice. Invalid credentials/mismatch cannot change password; preserve target session revocation. | B-03 | F-07 |
| S5-13 | Admin username edits take effect immediately without approval; enforce account-wide 168-hour cooldown, uniqueness, fresh login and preserved identity/history. | B-04 | F-07 |

## Shared contracts

### Assigned work

Assignment is ownership, not a new lifecycle status. Keep OPEN/PROG/RESL/CLSD. Only the assigned technician may edit assigned work, including mode, notes, checklist, guide application, status and staff messages. Admin has no implicit bypass; existing authorized reassignment must occur explicitly before the new assignee edits. Do not broaden reassignment permissions. Preserve unassigned claiming, requester conversation/confirmation permissions and Supervisor read-only scope. Other technicians read only what their existing role permits. Check assignment at write time, including stale tabs and concurrent claims; rejected writes leave data unchanged.

Resolved work retains saved details and compact requester-approval status. Approval closes; rejection preserves its reason and existing reopen rules. Preserve resolution-duration semantics. Use actual creation time for queue ordering, not repair start; use a unique-ID tie-breaker and sort before pagination. Display dates consistently with existing Philippine timezone conventions.

### Administrative passwords and usernames

Sprint scope is administrative reset, not a new self-service password feature. Verify acting Admin's current credential server-side, retain existing password strength validation, require matching new-password entries and preserve target token invalidation. Never log or persist current-password/confirmation values. Coordinate schema and all caller changes.

Username edits are Admin-only and immediate, without governance approval. First change is available immediately. Each successful change starts a 168-hour cooldown on the target account, regardless of acting Admin; no bypass. Failed attempts and canonical no-op saves do not start or extend cooldown. Reuse login normalization and uniqueness rules. Persist last successful change time; use server time and atomic enforcement so concurrent requests cannot evade cooldown or uniqueness. Existing accounts with no change timestamp are eligible.

Old username stops authenticating the changed account immediately. Revoke target sessions and require fresh login; update remembered-login presentation. Preserve stable account ID, display name, assignments and history. Return structured next-eligible time for UI display and handle stale forms. Username is a login identifier, distinct from requester-facing display name. Immediate username editing must not bypass governance for unrelated fields submitted through the same form.

### Exports and dialogs

This supersedes Sprint 4's job-log CSV-plus-XLSX decision: job logs offer XLSX instead. Preserve canonical order:

01_Company, 02_Mode, 03_Department, 04_Requestor, 05_Task, 06_Description, 07_Month, 08_Date_Started, 09_Time_Started, 10_Time_Finished, 11_Duration_Hrs, 12_Date_Finished, 13_Status, 14_Location, 15_Worked_By.

Retain complete paged filtered history, Date Started basis and real worker attribution. Reuse the existing writer/layer where available. Preserve Unicode, leading-zero text, blanks and zero durations; user text must not become executable workbook formulas. Use typed dates/numbers where supported. No uploader or reporting redesign.

Reuse shared dialog patterns. Only one active dialog is visible in guide replacement; preserve focus transfer/return, dismissal and background interaction blocking. Cancel preserves checklist progress; stale revision, failed apply and denied permission remain recoverable. Saved notes come from persisted records and retain validation.

## Sequence and completion evidence

1. B-00/F-00 reproduce and inventory routes, callers, schemas, fixtures and tests against a recorded candidate; agree exact contracts/errors.
2. B-01/B-02/F-03 deliver assignment protection and queue order.
3. B-03/B-04/F-07 deliver coordinated account contracts, migration and UI.
4. F-01/F-02/F-04 deliver dialog and ticket clarity; independent layout work can start earlier.
5. B-05/B-07/F-05/F-06 complete persistence verification, Jefferson-owned XLSX implementation, Rafael export review and dashboard layout.
6. B-06/F-08 complete joint acceptance and reviewed integration.

Use small feature PRs from current develop. Compatible additive backend changes can merge first; incompatible permission/account contracts require a coordinated candidate. Follow actual repository test/CI requirements, peer review and Jefferson merge custody. Record each S5 ID, owner, environment, candidate/develop SHAs, expected/actual behavior, checks, reviewer and evidence. Repeat affected smoke checks after merge.

Acceptance includes direct API denials, all relevant roles, stale assignments, concurrent username changes, exact cooldown boundaries, reload, guide cancel/conflict/retry, keyboard/small-screen/zoom checks, and XLSX opening with more than one page of records. No runtime reproduction or application tests have been performed during planning.

ARCH copies are finalized planning artifacts. Matching repository copies belong in docs/04-Sprints/; publication there remains pending. No implementation is authorized by these documents.

