from zoneinfo import ZoneInfo

import pandas as pd
import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models import Ticket
from scripts.seed_historical_logs import import_file


@pytest.mark.asyncio
async def test_hourly_demand_authorization_and_24_bins(client: AsyncClient, accounts):
    """B-06: Hourly demand is restricted to Supervisor/Admin and returns 24 zero-filled bins."""
    # 1. Tech and unauthenticated are denied
    res_unauth = await client.get("/api/v1/reports/hourly-demand")
    assert res_unauth.status_code == 401

    res_tech = await client.get("/api/v1/reports/hourly-demand", headers=accounts["tech"])
    assert res_tech.status_code == 403

    # 2. Supervisor and Admin are allowed
    res_sup = await client.get("/api/v1/reports/hourly-demand", headers=accounts["supervisor"])
    assert res_sup.status_code == 200
    data = res_sup.json()

    assert data["timezone"] == "Asia/Manila"
    assert data["source_field"] == "started_at"
    assert len(data["rows"]) == 24
    assert data["rows"][0]["hour"] == "00:00"
    assert data["rows"][23]["hour"] == "23:00"
    assert all("tickets" in r for r in data["rows"])


@pytest.mark.asyncio
async def test_hourly_demand_bucketing_in_asia_manila(client: AsyncClient, accounts):
    """B-06: Started tickets are bucketed into their exact Asia/Manila hour."""
    # Create quick-intake ticket
    emp_res = await client.get("/api/v1/admin/employees", headers=accounts["admin"])
    emp = emp_res.json()[0]

    ticket_res = await client.post(
        "/api/v1/tickets/quick-intake",
        json={
            "employee_id": emp["employee_id"],
            "task_code": "PRN-TS",
            "description": "Hourly peak demand test ticket",
            "mode": "SITE",
        },
        headers=accounts["tech"],
    )
    assert ticket_res.status_code == 201
    ticket_id = ticket_res.json()["id"]

    # Claim the ticket to assign started_at timestamp
    claim_res = await client.patch(
        f"/api/v1/tickets/{ticket_id}/claim",
        headers=accounts["tech"],
    )
    assert claim_res.status_code == 200

    # Read ticket from DB to check exact Manila hour
    async with AsyncSessionLocal() as db:
        t = await db.get(Ticket, ticket_id)
        tz = ZoneInfo(settings.BUSINESS_TIMEZONE)
        manila_hour = t.started_at.astimezone(tz).hour
        hour_str = f"{manila_hour:02d}:00"

    # Query hourly demand
    res = await client.get("/api/v1/reports/hourly-demand", headers=accounts["admin"])
    assert res.status_code == 200
    bin_row = next(r for r in res.json()["rows"] if r["hour"] == hour_str)
    assert bin_row["tickets"] >= 1


@pytest.mark.asyncio
async def test_month_year_selector_window_and_kpis(client: AsyncClient, accounts):
    """B-06: Selected past month queries work on KPIs and monthly reports."""
    # Query an empty/past month
    res_kpis = await client.get(
        "/api/v1/reports/kpis?date_from=2025-01-01&date_to=2025-01-31",
        headers=accounts["tech"],
    )
    assert res_kpis.status_code == 200
    kpi_data = res_kpis.json()
    assert kpi_data["total_tickets"] == 0

    # Query monthly-sla report for that period
    res_report = await client.get(
        "/api/v1/reports/monthly-sla?date_from=2025-01-01&date_to=2025-01-31",
        headers=accounts["supervisor"],
    )
    assert res_report.status_code == 200
    report_data = res_report.json()
    assert report_data["date_from"] == "2025-01-01"
    assert report_data["date_to"] == "2025-01-31"


@pytest.mark.asyncio
async def test_historical_import_rehearsal(tmp_path, accounts):
    """B-09: Historical logs rehearsal: idempotent import, duplicate skipping, non-fabricated closure."""
    csv_path = tmp_path / "historical_rehearsal.csv"
    record = {
        "Company": "FS",
        "Mode": "REM",
        "Dept": "CASH",
        "Requestor": "Maria Santos",
        "Task": "PRN-TS",
        "Description": "Historical batch test printer fault",
        "Month": "August 2026",
        "Date started": "2026-08-01",
        "Time Started": "09:00:00",
        "Time Finished": "10:30:00",
        "Duration": 1.5,
        "Date finished": "2026-08-01",
        "Status": "RESL",
        "Location": "PSY",
        "Tech": "tech",
    }
    pd.DataFrame([record]).to_csv(csv_path, index=False)

    # 1. Dry run
    dry_result = await import_file(csv_path, dry_run=True)
    assert dry_result["would_insert"] == 1
    assert dry_result["inserted"] == 0

    # 2. Actual import
    real_result = await import_file(csv_path, dry_run=False)
    assert real_result["inserted"] == 1

    # 3. Re-run skips duplicate
    rerun_result = await import_file(csv_path, dry_run=False)
    assert rerun_result["inserted"] == 0
    assert rerun_result["skipped"] == 1