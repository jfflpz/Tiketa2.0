"""Transactional, repeatable historical CSV/XLSX import. Run as a module."""

import argparse
import asyncio
import hashlib
import json
import re
import sys
from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal, InvalidOperation
from pathlib import Path
from uuid import uuid4
from zoneinfo import ZoneInfo

import pandas as pd
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.core.config import settings
from app.core.security import encrypt
from app.db.session import AsyncSessionLocal
from app.models import (
    Company,
    Department,
    Location,
    LocationDepartment,
    TaskCategory,
    Ticket,
    TicketCounter,
    TicketTechnician,
    User,
)

COLUMNS = [
    "company",
    "mode",
    "department",
    "requestor",
    "task",
    "description",
    "month",
    "date started",
    "time started",
    "time finished",
    "duration",
    "date finished",
    "status",
    "location",
    "worked by",
]
ALIASES = {
    "dept": "department",
    "tech": "worked by",
    "technician": "worked by",
    "requester": "requestor",
    "date start": "date started",
    "date end": "date finished",
    "time start": "time started",
    "time end": "time finished",
}


def normalize(value):
    return re.sub(r"[\s_]+", " ", str(value).strip().casefold())


def parse_date(value):
    if isinstance(value, (date, datetime, pd.Timestamp)):
        return value.date() if isinstance(value, datetime) else value
    return date.fromisoformat(str(value).strip())


def parse_time(value):
    if isinstance(value, time):
        return value
    if isinstance(value, (float, int)) and 0 <= value < 1:
        return (datetime.min + timedelta(seconds=round(value * 86400))).time()
    return time.fromisoformat(str(value).strip())


def read_frame(path):
    suffix = Path(path).suffix.lower()
    if suffix not in {".xlsx", ".csv"}:
        raise ValueError("Only .xlsx and .csv files are supported")
    frame = pd.read_excel(path) if suffix == ".xlsx" else pd.read_csv(path)
    names = [ALIASES.get(normalize(name), normalize(name)) for name in frame.columns]
    if len(set(names)) != len(names):
        raise ValueError("Duplicate column names after normalization")
    frame.columns = names
    missing = set(COLUMNS) - set(names)
    if missing:
        raise ValueError("Missing columns: " + ", ".join(sorted(missing)))
    return frame.astype(object).where(pd.notna(frame), None)


async def references(db):
    result = {}
    for label, model in (
        ("company", Company),
        ("location", Location),
        ("department", Department),
        ("task", TaskCategory),
        ("worked by", User),
    ):
        lookup = {}
        for row in (await db.scalars(select(model))).all():
            keys = (
                [row.username, row.full_name] if model is User else [row.code, row.name]
            )
            for key in keys:
                normalized = normalize(key)
                # Ambiguous display names require the stable username/code.
                if normalized in lookup and lookup[normalized] != row.id:
                    lookup[normalized] = None
                else:
                    lookup[normalized] = row.code if model is TaskCategory else row.id
        result[label] = lookup
    result["scope"] = set(
        (
            await db.execute(
                select(LocationDepartment.location_id, LocationDepartment.department_id)
            )
        ).all()
    )
    return result


def convert(row, refs, number):
    values = {}
    for label, target in (
        ("company", "company_id"),
        ("location", "location_id"),
        ("department", "department_id"),
        ("task", "task_code"),
    ):
        value = refs[label].get(normalize(row[label]))
        if not value:
            raise ValueError(f"Unknown or ambiguous {label}; use a canonical code")
        values[target] = value
    if (values["location_id"], values["department_id"]) not in refs["scope"]:
        raise ValueError(
            "Location/department mapping does not exist; provision it first"
        )
    status = {
        "open": "OPEN",
        "in progress": "PROG",
        "resolved": "RESL",
        "closed": "CLSD",
    }.get(normalize(row["status"]), str(row["status"]).upper())
    mode = {"remote": "REM", "site visit": "SITE", "online": "REM"}.get(
        normalize(row["mode"]), str(row["mode"]).upper()
    )
    if status not in {"OPEN", "PROG", "RESL", "CLSD"} or mode not in {"REM", "SITE"}:
        raise ValueError("Status/mode must use canonical codes")
    requester = str(row["requestor"] or "").strip()
    description = str(row["description"] or "").strip()
    if not 2 <= len(requester) <= 150 or not 10 <= len(description) <= 20000:
        raise ValueError("Requestor must be 2–150 and description 10–20000 characters")
    day = parse_date(row["date started"])
    if day > datetime.now(ZoneInfo(settings.BUSINESS_TIMEZONE)).date():
        raise ValueError("Historical creation date cannot be in the future")
    zone = ZoneInfo(settings.BUSINESS_TIMEZONE)
    created = datetime.combine(day, time.min, zone).astimezone(UTC)
    tech = (
        refs["worked by"].get(normalize(row["worked by"])) if row["worked by"] else None
    )
    if status != "OPEN" and not tech:
        raise ValueError("Non-open ticket requires an existing technician username")
    started = resolved = finished = duration = None
    if status in {"RESL", "CLSD"}:
        finished = parse_date(row["date finished"])
        resolved = datetime.combine(
            finished, parse_time(row["time finished"]), zone
        ).astimezone(UTC)
        started = datetime.combine(
            finished, parse_time(row["time started"]), zone
        ).astimezone(UTC)
        if started > resolved:
            started -= timedelta(days=1)
        if started < created or finished < day or resolved > datetime.now(UTC):
            raise ValueError("Historical timestamps are out of order or in the future")
        duration = Decimal(str((resolved - started).total_seconds() / 3600)).quantize(
            Decimal("0.0001")
        )
        if row["duration"] is not None and abs(
            Decimal(str(row["duration"])) - duration
        ) > Decimal("0.02"):
            raise ValueError(
                "Duration disagrees with repair clock times (tolerance 0.02h)"
            )
    elif status == "PROG":
        started = datetime.combine(
            day, parse_time(row["time started"]), zone
        ).astimezone(UTC)
    if status in {"OPEN", "PROG"} and any(
        row[key] is not None for key in ("date finished", "time finished", "duration")
    ):
        raise ValueError("Unresolved ticket cannot have completion values")
    fingerprint = hashlib.sha256(
        json.dumps(
            [
                str(values["company_id"]),
                str(values["location_id"]),
                day.isoformat(),
                normalize(requester),
                values["task_code"],
            ],
            separators=(",", ":"),
        ).encode()
    ).hexdigest()
    return dict(
        **values,
        id=uuid4(),
        mode=mode,
        status=status,
        requester_name=requester,
        description_enc=encrypt(description),
        date_started=day,
        date_finished=finished,
        started_at=started,
        resolved_at=resolved,
        duration=duration,
        month=day.strftime("%B %Y"),
        assigned_tech_id=tech,
        historical_hash=fingerprint,
        created_at=created,
        updated_at=resolved or started or created,
        employee_id=None,
        creator_id=None,
        requester_contact_enc=None,
        closure_token_hash=None,
        user_confirmed_at=None,
    )


async def import_file(path, dry_run=False, batch_size=1000):
    if not 1 <= batch_size <= 1000:
        raise ValueError("batch-size must be 1–1000")
    frame = read_frame(path)
    async with AsyncSessionLocal() as db, db.begin():
        refs = await references(db)
        prepared, errors, seen = [], [], set()
        duplicates = 0
        for number, row in enumerate(frame.to_dict("records"), 2):
            try:
                item = convert(row, refs, number)
                if item["historical_hash"] in seen:
                    duplicates += 1
                    continue
                seen.add(item["historical_hash"])
                prepared.append(item)
            except (ValueError, TypeError, InvalidOperation) as exc:
                errors.append({"row": number, "error": str(exc)})
        if errors:
            return {
                "inserted": 0,
                "would_insert": 0,
                "skipped": duplicates,
                "errors": errors,
                "dry_run": dry_run,
            }
        existing = set()
        hashes = [row["historical_hash"] for row in prepared]
        for start in range(0, len(hashes), 1000):
            existing.update(
                (
                    await db.scalars(
                        select(Ticket.historical_hash).where(
                            Ticket.historical_hash.in_(hashes[start : start + 1000])
                        )
                    )
                ).all()
            )
        duplicates += sum(row["historical_hash"] in existing for row in prepared)
        prepared = [row for row in prepared if row["historical_hash"] not in existing]
        if dry_run:
            return {
                "inserted": 0,
                "would_insert": len(prepared),
                "skipped": duplicates,
                "errors": [],
                "dry_run": True,
            }
        # Reserve identifiers per month, reducing round-trips while preserving concurrency.
        months = {}
        for row in prepared:
            months.setdefault(row["date_started"].strftime("%y%m"), []).append(row)
        for month, items in sorted(months.items()):
            statement = insert(TicketCounter).values(month=month, value=len(items))
            end = await db.scalar(
                statement.on_conflict_do_update(
                    index_elements=[TicketCounter.month],
                    set_={"value": TicketCounter.value + len(items)},
                ).returning(TicketCounter.value)
            )
            for index, item in enumerate(items, end - len(items) + 1):
                item["ticket_code"] = f"T-{month}-{index:04d}"
        inserted = 0
        for start in range(0, len(prepared), batch_size):
            batch = prepared[start : start + batch_size]
            # Asyncpg parameter limit; each ticket has about 27 columns.
            statement = (
                insert(Ticket.__table__)
                .on_conflict_do_nothing(index_elements=[Ticket.historical_hash])
                .returning(Ticket.id)
            )
            if not batch:
                continue
            ids = set((await db.scalars(statement, batch)).all())
            inserted += len(ids)
            links = [
                {
                    "ticket_id": row["id"],
                    "technician_id": row["assigned_tech_id"],
                    "assigned_at": row["started_at"],
                    "is_primary": True,
                }
                for row in batch
                if row["id"] in ids and row["assigned_tech_id"] and row["started_at"]
            ]
            if links:
                await db.execute(insert(TicketTechnician.__table__), links)
        return {
            "inserted": inserted,
            "would_insert": len(prepared),
            "skipped": duplicates + len(prepared) - inserted,
            "errors": [],
            "dry_run": False,
        }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--file", required=True, type=Path)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--batch-size", type=int, default=1000)
    args = parser.parse_args()
    try:
        result = asyncio.run(import_file(args.file, args.dry_run, args.batch_size))
    except (ValueError, OSError) as exc:
        parser.error(str(exc))
    print(json.dumps(result, indent=2))
    return 1 if result["errors"] else 0


if __name__ == "__main__":
    sys.exit(main())
