# Reporting rules — backend amendment, 2026-10-17

The owner authorized the backend engineer to settle previously undefined rules
and record them here and in the master SRS. These rules supersede illustrative
SRS table values, obsolete branch/device models, and undefined recommendation
columns. They are explicit operational heuristics, not statistical predictions.

## Common definitions

- Business calendar: Asia/Manila. Instants are UTC timestamptz; calendar dates and
  month labels use the business timezone. Range filters include both dates and
  select by ticket `date_started`; default is current calendar month. Maximum
  range is 366 days. Company, location and department UUID filters intersect.
- Completed = RESL or CLSD. Pending/active = OPEN or PROG. Resolved tickets await
  verification but are not active repair backlog. Null averages/ratios indicate
  no denominator, not zero performance. Counts on empty sets are zero.
- Completion % = completed / all tickets × 100. Same-day % = completed with
  `date_finished == date_started` / completed × 100. Mode split uses all tickets;
  unknown support mode is counted separately until a technician records it.
- Average labor uses completed tickets with recorded duration. Duration is full
  elapsed time between claim and resolution, including midnight crossings, in
  hours (4 decimal places). No pause clock or manual labor override is specified.
- SLA target = resolution within 48 elapsed hours from creation. SLA denominator
  includes completed tickets and pending tickets already older than 48 hours;
  pending tickets still inside target are excluded. Numerator is completed on
  time. Backlog is strictly older than 48h, not exactly 48h.
- Turnaround days = date_finished - date_started + 1. Transit lag days =
  turnaround - labor_hours / 8, exactly as SRS 3.4. Ratio converts lag days to
  calendar hours (×24) / labor hours; null when labor is zero. Negative lag is
  retained and flagged for data review, never silently clamped.
- Ties in top task, requester, and location use lexical ordering for repeatability.
- Reports and CSV exports are admin-only. IT may read aggregate queue KPIs only.
  Public tracking exposes ticket code/status/created_at only.

## Eight report definitions

1. `monthly-sla`: group by creation month; volume, completed, pending, completion
   %, mode counts/percentages, average labor, same-day %, and 48-hour SLA %.
2. `staff-productivity`: group by primary assigned technician; assigned/completed/
   pending, completed labor hours and mean, primary location, most frequent task.
   Collaborators are recorded separately and never double-count primary labor.
3. `department-demand`: group by company/department/location; count, completed
   labor, top requester, and most frequent task.
4. `backlog-exception`: pending tickets older than 48h; elapsed days open,
   attribution, task, decrypted description (admin only), assignee and status.
5. `transit-lag`: completed tickets grouped by location and mode; mean labor
   minutes, mean turnaround days, mean lag days, ratio, data-review flag. Action:
   review travel scheduling for SITE with ratio >=24, otherwise review queue
   wait if ratio >=24; below that, continue monitoring. This is advice, not an SLA.
6. `hardware-vulnerability`: exclude software assistance and planned maintenance/
   setup; group by location/company/task. Score = min(10, incidents ×0.2 + completed
   labor_hours ×0.05), rounded to one decimal. High >=7, Medium >=4, Low <4.
   High: review spares and root cause; Medium: inspect recurring faults; Low:
   monitor. Counts measure incidents, not unique assets or proven downtime.
7. `pms-compliance`: administrator-maintained monthly plans per location,
   department and PMS task (PC-PMS/PRN-PMS), expected service count, due date.
   Count completed PMS tickets by resolution month, including tickets created
   earlier. Coverage = min(completed/expected ×100,100), excess shown separately.
   Each completed ticket represents one service; this is service-plan coverage,
   not proof of distinct devices maintained. No devices table. Unplanned activity
   is shown with null denominator and `unplanned` status. Missing counts after due
   date are `overdue`, after 60 days `critical`; otherwise `due` or `compliant`.
   Company filters apply to activity, so plan denominators are unavailable when
   filtering by company (plans are shared by location/department).
8. `chronic-requestors`: at least 3 tickets for the same verified employee (legacy
   rows group by normalized name + company/location/department) in the selected
   range. Repeat incidents = count -1. Dominant task uses all tickets; remote
   resolution % = REM completed / completed. Training suggestions: PRN* printer
   handling; NET* connectivity checks; SW* application basics; PC* workstation
   care; others peripheral handling. Suggestions do not imply employee fault.

## Operational choices

Verified Employee ID is authoritative for company/location/department. Directory
edits require an existing active company and a valid location-department pair.
Companies share terminal locations; no unapproved company-location restriction
is invented. Admin creates scope mappings; production seeds do not invent them.

Mode may be unknown at intake because the public contract does not supply it;
resolution requires REM or SITE. All IT/admin users can update the shared queue,
consistent with the SRS RBAC matrix. Only admin can force-close a resolved ticket
after 72h of inactivity. Comments and attachments reset that inactivity clock.

Closure tokens are sent to the verified email captured on intake using SMTP with
TLS in production. Only their SHA-256 hash is stored. Failed delivery rolls back
resolution. A rare commit failure after SMTP acceptance may send an unusable
token; retry resolution sends a new one. No worker logs token bodies. Actual mail
delivery and frontend confirmation UX require deployment configuration/testing.
Attachments are authenticated ticket evidence (PNG/JPEG/PDF/text), max 5 MiB,
AES-GCM encrypted in PostgreSQL and downloaded as attachments with nosniff.
Historical workbook import remains CLI-only.
