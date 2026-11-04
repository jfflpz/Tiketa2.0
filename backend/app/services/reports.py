import csv
import io
from collections import Counter, defaultdict
from datetime import date

from app.core.security import decrypt

COMPLETED = {"RESL", "CLSD"}
REPORT_COLUMNS = {
    "monthly-sla": [
        "month",
        "total_tickets",
        "active_tickets",
        "completed",
        "overdue_backlog",
        "avg_labor_minutes",
        "same_day_resolution_pct",
        "sla_compliance_pct",
        "completion_rate_pct",
        "remote",
        "site",
        "unknown_mode",
        "remote_pct",
        "site_pct",
        "avg_labor_hours",
    ],
    "staff-productivity": [
        "technician_id",
        "technician",
        "total_assigned",
        "completed",
        "pending",
        "total_hours",
        "avg_hours",
        "primary_location",
        "most_frequent_task",
    ],
    "department-demand": [
        "company",
        "department",
        "location",
        "total_tickets",
        "total_hours",
        "top_requester",
        "primary_issue",
    ],
    "backlog-exception": [
        "ticket_code",
        "date_started",
        "days_open",
        "company",
        "department",
        "requester",
        "task",
        "description",
        "location",
        "technician",
        "status",
    ],
    "transit-lag": [
        "location",
        "mode",
        "completed",
        "mean_labor_minutes",
        "mean_turnaround_days",
        "mean_transit_lag_days",
        "lag_to_labor_ratio",
        "data_review_required",
        "recommended_action",
    ],
    "hardware-vulnerability": [
        "location",
        "company",
        "task",
        "incidents",
        "labor_hours",
        "severity_score",
        "risk",
        "recommendation",
    ],
    "pms-compliance": [
        "location_id",
        "department_id",
        "task_code",
        "month",
        "expected_services",
        "completed_services",
        "missing_services",
        "coverage_pct",
        "excess_services",
        "due_date",
        "status",
        "last_completed",
        "serviced_by",
    ],
    "chronic-requestors": [
        "requester",
        "department",
        "location",
        "total_tickets",
        "repeat_incidents",
        "dominant_task",
        "remote_resolution_pct",
        "training_suggestion",
    ],
}
HARDWARE = {
    "NET-CFG",
    "PC-ASSESS",
    "SRV-ASSESS",
    "PRN-TS",
    "PRN-NET",
    "PC-HW-REP",
    "PERIPH-REP",
    "PC-TS",
}


def percentage(numerator, denominator):
    return round(numerator / denominator * 100, 2) if denominator else None


def mean(values):
    return round(sum(values) / len(values), 4) if values else None


def top(values):
    counts = Counter(values)
    return (
        min(counts, key=lambda value: (-counts[value], str(value))) if counts else None
    )


def hours(row):
    return float(row.duration or 0)


def completed(rows):
    return [row for row in rows if row.status in COMPLETED]


def metrics(rows, now):
    done = completed(rows)
    active = [row for row in rows if row.status in {"OPEN", "PROG"}]
    overdue = [
        row for row in active if (now - row.created_at).total_seconds() > 48 * 3600
    ]
    on_time = [
        row
        for row in done
        if (row.resolved_at - row.created_at).total_seconds() <= 48 * 3600
    ]
    return dict(
        total_tickets=len(rows),
        active_tickets=len(active),
        completed=len(done),
        overdue_backlog=len(overdue),
        avg_labor_minutes=mean([hours(row) * 60 for row in done]),
        same_day_resolution_pct=percentage(
            sum(row.date_started == row.date_finished for row in done), len(done)
        ),
        sla_compliance_pct=percentage(len(on_time), len(done) + len(overdue)),
    )


def groups(rows, fields):
    result = defaultdict(list)
    for row in rows:
        result[tuple(getattr(row, field) for field in fields)].append(row)
    return sorted(
        result.items(), key=lambda item: tuple(str(value) for value in item[0])
    )


def build_report(name, rows, now):
    result = []
    if name == "monthly-sla":
        for (month,), items in groups(rows, ["month"]):
            summary = metrics(items, now)
            modes = Counter(row.mode or "unknown" for row in items)
            result.append(
                dict(
                    month=month,
                    **summary,
                    completion_rate_pct=percentage(summary["completed"], len(items)),
                    remote=modes["REM"],
                    site=modes["SITE"],
                    unknown_mode=modes["unknown"],
                    remote_pct=percentage(modes["REM"], len(items)),
                    site_pct=percentage(modes["SITE"], len(items)),
                    avg_labor_hours=mean([hours(row) for row in completed(items)]),
                )
            )
    elif name == "staff-productivity":
        for (tech_id, tech), items in groups(
            [row for row in rows if row.assigned_tech_id],
            ["assigned_tech_id", "technician"],
        ):
            done = completed(items)
            result.append(
                dict(
                    technician_id=str(tech_id),
                    technician=tech,
                    total_assigned=len(items),
                    completed=len(done),
                    pending=len(items) - len(done),
                    total_hours=round(sum(hours(row) for row in done), 4),
                    avg_hours=mean([hours(row) for row in done]),
                    primary_location=top(row.location for row in items),
                    most_frequent_task=top(row.task_code for row in items),
                )
            )
    elif name == "department-demand":
        for (company, department, location), items in groups(
            rows, ["company", "department", "location"]
        ):
            result.append(
                dict(
                    company=company,
                    department=department,
                    location=location,
                    total_tickets=len(items),
                    total_hours=round(sum(hours(row) for row in completed(items)), 4),
                    top_requester=top(row.requester_name for row in items),
                    primary_issue=top(row.task_code for row in items),
                )
            )
    elif name == "backlog-exception":
        for row in sorted(rows, key=lambda row: row.created_at):
            age = (now - row.created_at).total_seconds() / 86400
            if row.status in {"OPEN", "PROG"} and age > 2:
                result.append(
                    dict(
                        ticket_code=row.ticket_code,
                        date_started=row.date_started.isoformat(),
                        days_open=round(age, 2),
                        company=row.company,
                        department=row.department,
                        requester=row.requester_name,
                        task=row.task_code,
                        description=decrypt(row.description_enc),
                        location=row.location,
                        technician=row.technician,
                        status=row.status,
                    )
                )
    elif name == "transit-lag":
        for (location, mode), items in groups(completed(rows), ["location", "mode"]):
            labor = mean([hours(row) for row in items])
            turnaround = mean(
                [(row.date_finished - row.date_started).days + 1 for row in items]
            )
            lag = mean(
                [
                    (row.date_finished - row.date_started).days + 1 - hours(row) / 8
                    for row in items
                ]
            )
            ratio = round(lag * 24 / labor, 4) if labor else None
            action = "Continue monitoring"
            if ratio is not None and ratio >= 24:
                action = (
                    "Review travel scheduling"
                    if mode == "SITE"
                    else "Review queue waiting time"
                )
            result.append(
                dict(
                    location=location,
                    mode=mode,
                    completed=len(items),
                    mean_labor_minutes=round(labor * 60, 4),
                    mean_turnaround_days=turnaround,
                    mean_transit_lag_days=lag,
                    lag_to_labor_ratio=ratio,
                    data_review_required=any(
                        (row.date_finished - row.date_started).days + 1 - hours(row) / 8
                        < 0
                        for row in items
                    ),
                    recommended_action=action,
                )
            )
    elif name == "hardware-vulnerability":
        for (location, company, task), items in groups(
            [row for row in rows if row.task_code in HARDWARE],
            ["location", "company", "task_code"],
        ):
            labor = sum(hours(row) for row in completed(items))
            score = round(min(10, len(items) * 0.2 + labor * 0.05), 1)
            risk = "High" if score >= 7 else "Medium" if score >= 4 else "Low"
            action = {
                "High": "Review spares and root cause",
                "Medium": "Inspect recurring faults",
                "Low": "Monitor",
            }[risk]
            result.append(
                dict(
                    location=location,
                    company=company,
                    task=task,
                    incidents=len(items),
                    labor_hours=round(labor, 4),
                    severity_score=score,
                    risk=risk,
                    recommendation=action,
                )
            )
    elif name == "chronic-requestors":
        identities = defaultdict(list)
        for row in rows:
            key = (
                str(row.employee_id)
                if row.employee_id
                else (
                    row.requester_name.strip().casefold(),
                    row.company,
                    row.location,
                    row.department,
                )
            )
            identities[str(key)].append(row)
        for key, items in sorted(identities.items()):
            if len(items) < 3:
                continue
            row = items[0]
            done = completed(items)
            task = top(item.task_code for item in items)
            training = {
                "PRN": "Printer handling",
                "NET": "Connectivity checks",
                "SW": "Application basics",
                "PC": "Workstation care",
            }.get(task.split("-")[0], "Peripheral handling")
            result.append(
                dict(
                    requester=row.requester_name,
                    department=row.department,
                    location=row.location,
                    total_tickets=len(items),
                    repeat_incidents=len(items) - 1,
                    dominant_task=task,
                    remote_resolution_pct=percentage(
                        sum(item.mode == "REM" for item in done), len(done)
                    ),
                    training_suggestion=training,
                )
            )
    else:
        raise ValueError("Unknown report")
    return result


def pms_report(rows, plans, today: date, company_filter=False):
    activity = defaultdict(list)
    for row in completed(rows):
        if row.task_code in {"PC-PMS", "PRN-PMS"}:
            activity[
                (
                    row.location_id,
                    row.department_id,
                    row.task_code,
                    row.date_finished.replace(day=1),
                )
            ].append(row)
    plan_map = {
        (row.location_id, row.department_id, row.task_code, row.month_start): row
        for row in plans
    }
    result = []
    for key in sorted(set(activity) | set(plan_map), key=str):
        items, plan = activity.get(key, []), plan_map.get(key)
        expected = plan.expected_services if plan and not company_filter else None
        missing = max(0, expected - len(items)) if expected is not None else None
        status = (
            "unplanned"
            if not plan
            else "company-filtered"
            if company_filter
            else "compliant"
            if not missing
            else "critical"
            if (today - plan.due_date).days >= 60
            else "overdue"
            if today > plan.due_date
            else "due"
        )
        result.append(
            dict(
                location_id=str(key[0]),
                department_id=str(key[1]),
                task_code=key[2],
                month=key[3].isoformat(),
                expected_services=expected,
                completed_services=len(items),
                missing_services=missing,
                coverage_pct=min(100, percentage(len(items), expected))
                if expected
                else None,
                excess_services=max(0, len(items) - expected) if expected else None,
                due_date=plan.due_date.isoformat() if plan else None,
                status=status,
                last_completed=max((row.date_finished for row in items), default=None),
                serviced_by=", ".join(
                    sorted({row.technician for row in items if row.technician})
                ),
            )
        )
    return result


def csv_chunks(rows, columns):
    stream = io.StringIO()
    writer = csv.DictWriter(stream, fieldnames=columns)
    writer.writeheader()
    yield stream.getvalue()
    for row in rows:
        stream.seek(0)
        stream.truncate(0)
        # Prevent spreadsheet formula execution when an exported name begins =,+,-,@.
        safe = {
            key: "'" + value
            if isinstance(value, str)
            and value.lstrip().startswith(("=", "+", "-", "@", "\t", "\r"))
            else value
            for key, value in row.items()
        }
        writer.writerow(safe)
        yield stream.getvalue()
