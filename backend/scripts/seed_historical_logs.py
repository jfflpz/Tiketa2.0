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
from sqlalchemy import delete, select, update
from sqlalchemy.dialects.postgresql import insert

from app.core.config import settings
from app.core.security import encrypt, hash_password
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

COMPANY_ALIASES = {
    "five star": "fs",
    "cisco": "lcti",
    "hero diagnostic": "ah",
    "property management office": "pmo",
    "resort group": "rg",
}

LOCATION_ALIASES = {
    "fivestar mirasol": "fsm",
}

DEPT_ALIASES = {
    "business process - gps monitoring team": "bp-gps",
}

TASK_ALIASES = {
    "tablet set-up": "pc-setup",
}

TECH_ALIASES = {
    "nath": "technician",
}

TECH_CHECKBOX_COLUMNS = ["stephen", "carlo", "nath", "matt", "ronel"]


def normalize(value):
    return re.sub(r"[\s_]+", " ", str(value).strip().casefold())


def parse_duration(value):
    if value is None or pd.isna(value):
        return None
    m = re.search(r"(\d+(?:\.\d+)?)", str(value))
    if m:
        num = Decimal(m.group(1))
        if "min" in str(value).lower():
            return (num / Decimal("60")).quantize(Decimal("0.0001"))
        return num.quantize(Decimal("0.0001"))
    return None


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
    if suffix == ".xlsx":
        xl = pd.ExcelFile(path)
        sheet = "Job Logs UPDATED" if "Job Logs UPDATED" in xl.sheet_names else 0
        frame = pd.read_excel(path, sheet_name=sheet)
    else:
        frame = pd.read_csv(path)

    # 1. Normalize column names (trims leading/trailing whitespace like ' Time Finished')
    names = [ALIASES.get(normalize(name), normalize(name)) for name in frame.columns]
    if len(set(names)) != len(names):
        raise ValueError("Duplicate column names after normalization")
    frame.columns = names

    # 2. Filter out trailing empty rows beyond filled records
    subset = [
        c
        for c in ["company", "department", "task", "date started"]
        if c in frame.columns
    ]
    if subset:
        frame = frame.dropna(how="all", subset=subset)

    # 3. Detect multi-tech checkbox columns (Stephen, Carlo, Nath, Matt, Ronel)
    detected_techs = [c for c in TECH_CHECKBOX_COLUMNS if c in frame.columns]
    if detected_techs and "worked by" not in frame.columns:

        def extract_techs(row):
            active = []
            for col in detected_techs:
                val = row.get(col)
                if val is True or str(val).strip().lower() in {
                    "true",
                    "1",
                    "checked",
                    "yes",
                }:
                    active.append(col)
            return active

        frame["_collaborators"] = frame.apply(extract_techs, axis=1)
        # Primary technician or fallback to General IT Pool for historical unassigned logs
        frame["worked by"] = frame["_collaborators"].apply(
            lambda ts: ts[0] if ts else "unassigned_it"
        )
        frame["_preserve_all"] = True

    missing = set(COLUMNS) - set(frame.columns)
    if missing:
        raise ValueError("Missing columns: " + ", ".join(sorted(missing)))
    return frame.astype(object).where(pd.notna(frame), None)


async def references(db):
    # Ensure standard historical IT technician accounts exist
    for uname, full_name in [
        ("stephen", "Stephen Miralles"),
        ("technician", "Nathaniel Esguerra"),
        ("carlo", "Carlo Agan"),
        ("matt", "Christian Matthew Dator"),
        ("ronel", "Ronel Balajediong"),
        ("tampico", "Juan Miguel Tampico"),
        ("unassigned_it", "General IT Pool"),
    ]:
        user_row = await db.scalar(select(User).where(User.username == uname))
        if user_row:
            user_row.full_name = full_name
        else:
            db.add(
                User(
                    username=uname,
                    full_name=full_name,
                    email=f"{uname}@fivestarbus.com",
                    role="it",
                    password_hash=hash_password("Tiketa2026!Pass"),
                    is_active=True,
                )
            )
        await db.flush()

        # Ensure fallback TBD location exists for unassigned historical rows
        tbd_loc = await db.scalar(select(Location).where(Location.code == "TBD"))
        if not tbd_loc:
            tbd_loc = Location(code="TBD", name="Unassigned / Pending Review")
            db.add(tbd_loc)
        await db.flush()

    # Ensure all location-department pairs exist in scope for historical terminal mobility
    locs = (await db.scalars(select(Location))).all()
    depts = (await db.scalars(select(Department))).all()
    for loc in locs:
        for d in depts:
            await db.execute(
                insert(LocationDepartment)
                .values(location_id=loc.id, department_id=d.id, is_active=True)
                .on_conflict_do_nothing()
            )
    await db.flush()
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

    # Populate canonical domain aliases
    for k, v in COMPANY_ALIASES.items():
        if k not in result["company"]:
            result["company"][k] = result["company"].get(v)
    for k, v in LOCATION_ALIASES.items():
        if k not in result["location"]:
            result["location"][k] = result["location"].get(v)
    for k, v in DEPT_ALIASES.items():
        if k not in result["department"]:
            result["department"][k] = result["department"].get(v)
    for k, v in TASK_ALIASES.items():
        if k not in result["task"]:
            result["task"][k] = result["task"].get(v)
    for k, v in TECH_ALIASES.items():
        if k not in result["worked by"]:
            result["worked by"][k] = result["worked by"].get(v)

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

    # 1. Location fallback to TBD if blank
    loc_val = row.get("location")
    if (
        not loc_val
        or pd.isna(loc_val)
        or str(loc_val).strip().lower() in {"", "nan", "none"}
    ):
        values["location_id"] = refs["location"].get("tbd")
    else:
        norm_loc = normalize(loc_val)
        values["location_id"] = refs["location"].get(norm_loc) or refs["location"].get(
            LOCATION_ALIASES.get(norm_loc)
        )
    if not values["location_id"]:
        raise ValueError(f"Unknown or ambiguous location: {loc_val}")

    # 2. Company fallback to FS if blank
    comp_val = row.get("company")
    if (
        not comp_val
        or pd.isna(comp_val)
        or str(comp_val).strip().lower() in {"", "nan", "none"}
    ):
        values["company_id"] = refs["company"].get("fs")
    else:
        norm_comp = normalize(comp_val)
        values["company_id"] = (
            refs["company"].get(norm_comp)
            or refs["company"].get(COMPANY_ALIASES.get(norm_comp))
            or refs["company"].get("fs")
        )
    if not values["company_id"]:
        raise ValueError(f"Unknown or ambiguous company: {comp_val}")

    # 3. Department fallback to OPS if blank
    dept_val = row.get("department")
    if (
        not dept_val
        or pd.isna(dept_val)
        or str(dept_val).strip().lower() in {"", "nan", "none"}
    ):
        values["department_id"] = refs["department"].get("ops")
    else:
        norm_dept = normalize(dept_val)
        values["department_id"] = (
            refs["department"].get(norm_dept)
            or refs["department"].get(DEPT_ALIASES.get(norm_dept))
            or refs["department"].get("ops")
        )
    if not values["department_id"]:
        raise ValueError(f"Unknown or ambiguous department: {dept_val}")

    # 4. Task fallback to PC-ASSESS if blank
    task_val = row.get("task")
    if (
        not task_val
        or pd.isna(task_val)
        or str(task_val).strip().lower() in {"", "nan", "none"}
    ):
        values["task_code"] = refs["task"].get("pc-assess") or "PC-ASSESS"
    else:
        norm_task = normalize(task_val)
        values["task_code"] = (
            refs["task"].get(norm_task)
            or refs["task"].get(TASK_ALIASES.get(norm_task))
            or "PC-ASSESS"
        )
    if not values["task_code"]:
        raise ValueError(f"Unknown or ambiguous task: {task_val}")

    # 5. Status mapping: Historical imported records are completed archives
    raw_status = normalize(row["status"]) if row.get("status") else "closed"
    if raw_status in {"resolved", "closed", "resl", "clsd", "done"}:
        status = "CLSD"
    elif raw_status in {"in progress", "prog"}:
        status = "PROG"
    else:
        status = "OPEN"

    mode = {"remote": "REM", "site visit": "SITE", "online": "REM"}.get(
        normalize(row["mode"]) if row.get("mode") else "site", "SITE"
    )

    req_raw = str(row["requestor"] or "").strip()
    requester = req_raw if len(req_raw) >= 2 else "Unspecified"

    description = str(row["description"] or "").strip()
    if len(description) < 10:
        description = (
            f"Historical Task: {description}"
            if description
            else "Historical Ticket (Pending details)"
        )

    day = parse_date(row["date started"])
    if day > datetime.now(ZoneInfo(settings.BUSINESS_TIMEZONE)).date():
        raise ValueError("Historical creation date cannot be in the future")
    zone = ZoneInfo(settings.BUSINESS_TIMEZONE)
    created = datetime.combine(day, time.min, zone).astimezone(UTC)

    raw_tech = normalize(row["worked by"]) if row.get("worked by") else "admin"
    tech = (
        refs["worked by"].get(raw_tech)
        or refs["worked by"].get(TECH_ALIASES.get(raw_tech))
        or refs["worked by"].get("admin")
    )
    if status != "OPEN" and not tech:
        raise ValueError("Non-open ticket requires an existing technician username")

    # Multi-tech collaborators preservation
    collab_names = row.get("_collaborators") or ([raw_tech] if raw_tech else [])
    collaborator_ids = [
        refs["worked by"].get(normalize(c))
        or refs["worked by"].get(TECH_ALIASES.get(normalize(c)))
        for c in collab_names
    ]
    collaborator_ids = [cid for cid in collaborator_ids if cid]
    if not collaborator_ids and tech:
        collaborator_ids = [tech]

    started = resolved = finished = duration = None
    if status in {"RESL", "CLSD"}:
        raw_fin = row.get("date finished")
        finished = parse_date(raw_fin) if raw_fin else day
        if finished < day:
            finished = day  # Clamp typos where finished was typed as day before start

        t_start = row.get("time started")
        t_fin = row.get("time finished")
        dur_val = parse_duration(row.get("duration"))

        if t_start is None or t_fin is None:
            # Default to standard 09:00 - 10:00 AM window
            started = datetime.combine(finished, time(9, 0), zone).astimezone(UTC)
            duration = dur_val or Decimal("1.0000")
            resolved = started + timedelta(seconds=float(duration * 3600))
        else:
            resolved = datetime.combine(finished, parse_time(t_fin), zone).astimezone(
                UTC
            )
            started = datetime.combine(finished, parse_time(t_start), zone).astimezone(
                UTC
            )
            if started > resolved:
                started -= timedelta(days=1)
            duration = Decimal(
                str((resolved - started).total_seconds() / 3600)
            ).quantize(Decimal("0.0001"))

        if started < created or finished < day or resolved > datetime.now(UTC):
            raise ValueError("Historical timestamps are out of order or in the future")

    elif status == "PROG":
        t_start = row.get("time started")
        started = datetime.combine(
            day, parse_time(t_start) if t_start else time(9, 0), zone
        ).astimezone(UTC)

    if status in {"OPEN", "PROG"} and any(
        row[key] is not None for key in ("date finished", "time finished", "duration")
    ):
        raise ValueError("Unresolved ticket cannot have completion values")

    hash_payload = [
        str(values["company_id"]),
        str(values["location_id"]),
        day.isoformat(),
        normalize(requester),
        values["task_code"],
    ]
    if row.get("_preserve_all"):
        hash_payload.extend(
            [
                normalize(description),
                normalize(raw_tech),
                str(number),
            ]
        )
    fingerprint = hashlib.sha256(
        json.dumps(hash_payload, separators=(",", ":")).encode()
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
        collaborator_ids=collaborator_ids,
        historical_hash=fingerprint,
        user_confirmed_at=resolved if status == "CLSD" else None,
        created_at=created,
        updated_at=resolved or started or created,
        employee_id=None,
        creator_id=None,
        requester_contact_enc=None,
        closure_token_hash=None,
    )


async def import_file(path, dry_run=False, batch_size=1000, replace=False):
    if not 1 <= batch_size <= 1000:
        raise ValueError("batch-size must be 1–1000")
    async with AsyncSessionLocal() as db:
        refs = await references(db)

        if not dry_run:
            await db.execute(
                update(Ticket)
                .where(Ticket.historical_hash.is_not(None))
                .where(Ticket.status == "RESL")
                .values(
                    status="CLSD",
                    user_confirmed_at=Ticket.resolved_at,
                    closure_token_hash=None,
                    closure_token_expires_at=None,
                )
            )
            if replace:
                # Purge existing historical records so newly configured excel rows re-import cleanly
                hist_ticket_ids = (
                    await db.scalars(
                        select(Ticket.id).where(Ticket.historical_hash.is_not(None))
                    )
                ).all()
                if hist_ticket_ids:
                    await db.execute(
                        delete(TicketTechnician).where(
                            TicketTechnician.ticket_id.in_(hist_ticket_ids)
                        )
                    )
                    await db.execute(
                        delete(Ticket).where(Ticket.id.in_(hist_ticket_ids))
                    )
            await db.commit()

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
            links = []
            for row in batch:
                if row["id"] not in ids or not row["started_at"]:
                    continue
                # Primary technician
                if row["assigned_tech_id"]:
                    links.append(
                        {
                            "ticket_id": row["id"],
                            "technician_id": row["assigned_tech_id"],
                            "assigned_at": row["started_at"],
                            "is_primary": True,
                        }
                    )
                # Secondary collaborative technicians
                for cid in row.get("collaborator_ids", []):
                    if cid != row["assigned_tech_id"]:
                        links.append(
                            {
                                "ticket_id": row["id"],
                                "technician_id": cid,
                                "assigned_at": row["started_at"],
                                "is_primary": False,
                            }
                        )
            if links:
                await db.execute(
                    insert(TicketTechnician.__table__).on_conflict_do_nothing(), links
                )
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
    parser.add_argument(
        "--replace",
        action="store_true",
        help="Purge previous historical tickets before reimporting",
    )
    parser.add_argument("--batch-size", type=int, default=1000)
    args = parser.parse_args()
    try:
        result = asyncio.run(
            import_file(args.file, args.dry_run, args.batch_size, args.replace)
        )
    except (ValueError, OSError) as exc:
        parser.error(str(exc))
    print(json.dumps(result, indent=2))
    return 1 if result["errors"] else 0


if __name__ == "__main__":
    sys.exit(main())
