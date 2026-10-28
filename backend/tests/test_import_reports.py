from datetime import UTC, date, datetime, timedelta
from types import SimpleNamespace

import pandas as pd
import pytest
from sqlalchemy import func, select

from app.core.security import encrypt
from app.db.session import AsyncSessionLocal
from app.models import Ticket
from app.services.reports import build_report, csv_chunks, metrics, pms_report
from scripts.seed_historical_logs import import_file, read_frame


def historical(**updates):
    return {
        "Company": "FS",
        "Mode": "REM",
        "Dept": "CASH",
        "Requestor": "Maria Santos",
        "Task": "PRN-TS",
        "Description": "Printer thermal head jammed",
        "Month": "ignored derived value",
        "Date started": "2026-08-01",
        "Time Started": "10:00:00",
        "Time Finished": "11:00:00",
        "Duration": 1,
        "Date finished": "2026-08-03",
        "Status": "RESL",
        "Location": "PSY",
        "Tech": "tech",
        **updates,
    }


async def test_import_dry_run_repeat_and_atomic_errors(tmp_path, accounts):
    path = tmp_path / "logs.csv"
    pd.DataFrame([historical(), historical()]).to_csv(path, index=False)
    dry = await import_file(path, dry_run=True)
    assert dry == {
        "inserted": 0,
        "would_insert": 1,
        "skipped": 1,
        "errors": [],
        "dry_run": True,
    }
    async with AsyncSessionLocal() as db:
        assert await db.scalar(select(func.count()).select_from(Ticket)) == 0
    result = await import_file(path)
    assert result["inserted"] == 1 and result["skipped"] == 1
    assert (await import_file(path))["skipped"] == 2
    async with AsyncSessionLocal() as db:
        row = await db.scalar(select(Ticket))
        assert float(row.duration) == 1 and row.month == "August 2026"
        assert (row.date_finished - row.date_started).days == 2
    pd.DataFrame(
        [historical(Requestor="Another Person"), historical(Location="INVALID")]
    ).to_csv(path, index=False)
    failed = await import_file(path)
    assert failed["inserted"] == 0 and failed["errors"][0]["row"] == 3
    async with AsyncSessionLocal() as db:
        assert await db.scalar(select(func.count()).select_from(Ticket)) == 1


async def test_xlsx_and_validation(tmp_path, accounts):
    path = tmp_path / "logs.xlsx"
    pd.DataFrame(
        [
            historical(
                **{
                    "Time Started": "23:00:00",
                    "Time Finished": "01:00:00",
                    "Duration": 2,
                }
            )
        ]
    ).to_excel(path, index=False)
    assert (await import_file(path))["inserted"] == 1
    with pytest.raises(ValueError, match="batch-size"):
        await import_file(path, batch_size=0)
    with pytest.raises(ValueError, match="Only"):
        read_frame(tmp_path / "logs.txt")
    pd.DataFrame([{"Company": "FS"}]).to_excel(path, index=False)
    with pytest.raises(ValueError, match="Missing columns"):
        await import_file(path)


def report_row(**values):
    day = date(2026, 8, 1)
    stamp = datetime(2026, 8, 1, tzinfo=UTC)
    return SimpleNamespace(
        **(
            dict(
                id="id",
                ticket_code="T-2608-0001",
                employee_id="1001",
                assigned_tech_id="t1",
                technician="Tech One",
                company="Five Star",
                location="Pasay",
                department="Cash",
                company_id="c1",
                location_id="l1",
                department_id="d1",
                requester_name="Maria",
                task_code="PRN-TS",
                mode="REM",
                status="RESL",
                date_started=day,
                date_finished=day,
                duration=1,
                created_at=stamp,
                resolved_at=stamp + timedelta(hours=1),
                month="August 2026",
                description_enc=encrypt("Printer failed during dispatch"),
            )
            | values
        )
    )


def test_known_result_formulas_and_boundaries():
    now = datetime(2026, 8, 4, tzinfo=UTC)
    rows = [
        report_row(),
        report_row(
            mode="SITE",
            duration=2,
            date_finished=date(2026, 8, 3),
            resolved_at=now - timedelta(hours=1),
        ),
        report_row(
            status="OPEN",
            duration=None,
            date_finished=None,
            resolved_at=None,
            created_at=now - timedelta(hours=48),
        ),
        report_row(
            status="PROG",
            duration=None,
            date_finished=None,
            resolved_at=None,
            created_at=now - timedelta(hours=48, seconds=1),
        ),
    ]
    summary = metrics(rows, now)
    assert summary == dict(
        total_tickets=4,
        active_tickets=2,
        completed=2,
        overdue_backlog=1,
        avg_labor_minutes=90,
        same_day_resolution_pct=50,
        sla_compliance_pct=33.33,
    )
    monthly = build_report("monthly-sla", rows, now)[0]
    assert monthly["completion_rate_pct"] == 50
    assert build_report("staff-productivity", rows, now)[0]["total_hours"] == 3
    assert build_report("department-demand", rows, now)[0]["total_tickets"] == 4
    assert len(build_report("backlog-exception", rows, now)) == 1
    site = next(
        row for row in build_report("transit-lag", rows, now) if row["mode"] == "SITE"
    )
    assert site["mean_transit_lag_days"] == 2.75 and site["lag_to_labor_ratio"] == 33
    hardware = build_report("hardware-vulnerability", rows, now)[0]
    assert hardware["severity_score"] == 1 and hardware["risk"] == "Low"
    chronic = build_report("chronic-requestors", rows, now)[0]
    assert chronic["repeat_incidents"] == 3 and chronic["remote_resolution_pct"] == 50
    assert metrics([], now)["avg_labor_minutes"] is None
    zero = build_report("transit-lag", [report_row(duration=0)], now)[0]
    assert zero["lag_to_labor_ratio"] is None


def test_pms_and_csv():
    plan = SimpleNamespace(
        location_id="l1",
        department_id="d1",
        task_code="PC-PMS",
        month_start=date(2026, 8, 1),
        due_date=date(2026, 8, 31),
        expected_services=4,
    )
    rows = [report_row(task_code="PC-PMS"), report_row(task_code="PC-PMS")]
    result = pms_report(rows, [plan], date(2026, 9, 1))[0]
    assert result["coverage_pct"] == 50 and result["status"] == "overdue"
    assert pms_report(rows, [plan], date(2026, 11, 1))[0]["status"] == "critical"
    assert pms_report(rows, [], date(2026, 9, 1))[0]["coverage_pct"] is None
    assert (
        pms_report(rows, [plan], date(2026, 9, 1), True)[0]["status"]
        == "company-filtered"
    )
    assert "'=HYPERLINK" in "".join(csv_chunks([{"name": "=HYPERLINK(foo)"}], ["name"]))


async def test_reports_endpoints_filters_and_authorization(client, accounts, tmp_path):
    path = tmp_path / "logs.csv"
    pd.DataFrame(
        [
            historical(),
            historical(
                Requestor="Second Employee",
                **{"Date started": "2026-08-31", "Date finished": "2026-08-31"},
            ),
        ]
    ).to_csv(path, index=False)
    assert (await import_file(path))["inserted"] == 2
    query = "?date_from=2026-08-01&date_to=2026-08-31"
    for report in (
        "monthly-sla",
        "staff-productivity",
        "department-demand",
        "backlog-exception",
        "transit-lag",
        "hardware-vulnerability",
        "pms-compliance",
        "chronic-requestors",
    ):
        url = "/api/v1/reports/" + report + query
        assert (await client.get(url)).status_code == 401
        assert (await client.get(url, headers=accounts["tech"])).status_code == 403
        assert (await client.get(url, headers=accounts["admin"])).status_code == 200
        csv = await client.get(url + "&format=csv", headers=accounts["admin"])
        assert csv.status_code == 200 and csv.headers["content-type"].startswith(
            "text/csv"
        )
    response = await client.get(
        "/api/v1/reports/kpis" + query, headers=accounts["tech"]
    )
    assert (
        response.json()["total_tickets"] == 2
        and response.json()["same_day_resolution_pct"] == 50
    )
    response = await client.get(
        "/api/v1/reports/kpis?date_from=2026-08-31&date_to=2026-08-31",
        headers=accounts["admin"],
    )
    assert response.json()["total_tickets"] == 1
    assert (
        await client.get(
            "/api/v1/reports/kpis?date_from=2026-08-31&date_to=2026-08-01",
            headers=accounts["admin"],
        )
    ).status_code == 422
    profile = (
        await client.get("/api/v1/employees/lookup?q=1042", headers=accounts["admin"])
    ).json()
    plan = dict(
        location_id=profile["location_id"],
        department_id=profile["department_id"],
        task_code="PC-PMS",
        month_start="2026-08-01",
        due_date="2026-08-31",
        expected_services=12,
    )
    response = await client.post(
        "/api/v1/admin/maintenance-plans", json=plan, headers=accounts["admin"]
    )
    assert response.status_code == 201, response.text
    assert (
        await client.put(
            "/api/v1/admin/maintenance-plans/" + response.json()["id"],
            json={**plan, "expected_services": 10},
            headers=accounts["admin"],
        )
    ).status_code == 200
    report = (
        await client.get(
            "/api/v1/reports/pms-compliance" + query, headers=accounts["admin"]
        )
    ).json()
    assert report["rows"][0]["expected_services"] == 10
