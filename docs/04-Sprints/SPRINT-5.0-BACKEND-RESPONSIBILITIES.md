# Tiketa Sprint 5.0 — Backend Responsibilities

Owner: Jefferson Lopez. Status: requirements agreed; implementation pending.
Shared behavior and acceptance: [Master plan](SPRINT-5.0-MASTER-PLAN.md).

| Task | Implementation and handoff | Acceptance |
| --- | --- | --- |
| B-00 | Reproduce; record candidate; inventory all mutations, clients, schemas, fixtures, migration needs and CI. Agree exact request/response/error contracts with frontend. | Distinguish source findings from runtime evidence. |
| B-01 | Enforce assigned-owner writes across tickets, notes, mode, checklist, guides and staff comments. Preserve requester rights and explicit authorized reassignment. | S5-08/10: owner succeeds; non-owner IT/Intern/Admin denied; Supervisor unchanged; stale assignments and direct calls cannot mutate. |
| B-02 | Verify/correct priority-first, oldest-created-first sorting before pagination, stable tie-breaker and creation timestamp mapping. | S5-09 across pages, ties, priority updates and role filters. |
| B-03 | Verify acting Admin password on target reset; coordinate confirmation validation; preserve password policy and token revocation. | S5-12: wrong credential, mismatch, invalid new password and unauthorized caller leave credentials unchanged; valid reset persists and old sessions fail. |
| B-04 | Immediate Admin username update isolated from governed fields; persist last-change time, atomic 168-hour cooldown, canonical uniqueness and session revocation. | S5-13: first change, exact boundary, just-before boundary, no-op, failed attempt, duplicate, concurrent requests, cross-Admin cooldown and fresh login. Stable account references retained. |
| B-05 | Verify persisted notes, guide revision/conflict handling and complete authorized job-log history; fix confirmed backend gaps only. | S5-02/05/11: reload, multi-page records, denied writes and revision conflict. |
| B-07 | Replace job-log CSV action with XLSX; reuse writer/mapping, canonical columns, complete filtered rows and styled header. Jefferson owns implementation, including necessary frontend export wiring; coordinate B-05 and Rafael review. | S5-02: workbook opens; counts beyond one page; safe text, Unicode, leading zeros, blanks and zero durations. |
| B-06 | Joint regression acceptance and merge evidence. | All applicable master rows evidenced; presentation verification can close without a backend diff. |

B-07 is a cross-track ownership assignment, not a requirement to move workbook generation to the server. Reuse the existing export layer.

Publish B-01 through B-04 contracts before dependent frontend integration. Update generated OpenAPI/types/fixtures when affected. Username migration initializes existing accounts as eligible and preserves stable IDs; follow repository migration validation practices. Test time boundaries with controlled time, not sleeps.

Run focused authorization, account and concurrency tests plus required repository checks. Verify denied operations leave persisted state unchanged. Test incompatible contracts with frontend before merge; record reviewer, candidate/develop SHAs and post-merge smoke results. Dates remain undecided.

