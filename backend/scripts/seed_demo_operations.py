import asyncio
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.core.config import settings
from app.core.security import encrypt, hash_password
from app.db.session import AsyncSessionLocal
from app.models import (
    Company,
    Department,
    Employee,
    Location,
    LocationDepartment,
    MaintenancePlan,
    Ticket,
    TicketComment,
    TicketCounter,
    TicketTechnician,
    User,
)

PUBLIC_KIOSK_ISSUES = {
    "PRN-TS",
    "NET-CFG",
    "SW-ASST",
    "PC-HW-REP",
    "SRV-ASSESS",
    "PC-PMS",
}


def local(dt: datetime) -> datetime:
    return dt.astimezone(ZoneInfo(settings.BUSINESS_TIMEZONE))


# 1. Location-Department Scopes across transit terminals
LOCATION_DEPARTMENTS = [
    ("PSY", "CASH"),
    ("PSY", "OPS"),
    ("PSY", "MAINT"),
    ("PSY", "ACCT"),
    ("CAL", "CASH"),
    ("CAL", "OPS"),
    ("CAL", "MAINT"),
    ("CMA", "CASH"),
    ("CMA", "OPS"),
    ("CMA", "BP-GPS"),
    ("AVN", "CASH"),
    ("AVN", "OPS"),
    ("BTM", "OPS"),
    ("BTM", "MAINT"),
    ("SNC", "OPS"),
    ("TRL", "OPS"),
    ("TRL", "MAINT"),
]

# 2. Verified Employees across terminals
EMPLOYEES = [
    ("1042", "Maria Santos", "maria.santos@fivestarbus.com", "FS", "PSY", "CASH"),
    ("1088", "Juan Dela Cruz", "juan.delacruz@fivestarbus.com", "FS", "PSY", "OPS"),
    (
        "1092",
        "Roberto D. Garcia",
        "roberto.garcia@fivestarbus.com",
        "FS",
        "PSY",
        "MAINT",
    ),
    ("1105", "Elena M. Reyes", "elena.reyes@fivestarbus.com", "FS", "PSY", "ACCT"),
    ("2015", "Ricardo Ramos", "ricardo.ramos@fivestarbus.com", "FS", "CAL", "CASH"),
    (
        "2022",
        "Lorna B. Bautista",
        "lorna.bautista@fivestarbus.com",
        "FS",
        "CAL",
        "OPS",
    ),
    ("2041", "Danilo Tan", "danilo.tan@fivestarbus.com", "FS", "CAL", "MAINT"),
    (
        "3011",
        "Grace P. Mendoza",
        "grace.mendoza@fivestarbus.com",
        "FS",
        "CMA",
        "CASH",
    ),
    ("3019", "Ferdinand Cruz", "ferdinand.cruz@fivestarbus.com", "FS", "CMA", "OPS"),
    (
        "3044",
        "Arnel S. Navarro",
        "arnel.navarro@fivestarbus.com",
        "FS",
        "CMA",
        "BP-GPS",
    ),
    (
        "4008",
        "Teresa G. Aquino",
        "teresa.aquino@fivestarbus.com",
        "FS",
        "AVN",
        "CASH",
    ),
    ("4015", "Eduardo Lim", "eduardo.lim@fivestarbus.com", "FS", "AVN", "OPS"),
    (
        "5012",
        "Nestor V. Macaraeg",
        "nestor.macaraeg@fivestarbus.com",
        "FS",
        "BTM",
        "OPS",
    ),
    (
        "5020",
        "Wilfredo Perez",
        "wilfredo.perez@fivestarbus.com",
        "FS",
        "BTM",
        "MAINT",
    ),
    (
        "6018",
        "Maricel D. Soriano",
        "maricel.soriano@fivestarbus.com",
        "FS",
        "SNC",
        "OPS",
    ),
    (
        "7014",
        "Benjamin Flores",
        "benjamin.flores@fivestarbus.com",
        "FS",
        "TRL",
        "OPS",
    ),
]

# 3. Comprehensive Seed Ticket Scenarios
DEMO_TICKETS = [
    # --- ACTIVE: OPEN QUEUE (Awaiting Triage) ---
    {
        "code": "T-2610-0101",
        "emp_id": "1042",
        "task": "PRN-TS",
        "desc": "Thermal ticket printer red error light blinking. Cash booth 2 receipts not printing.",
        "status": "OPEN",
        "days_ago": 0,
        "mode": None,
    },
    {
        "code": "T-2610-0102",
        "emp_id": "1088",
        "task": "NET-CFG",
        "desc": "Passenger Wi-Fi access point in Pasay dispatch waiting lounge unreachable.",
        "status": "OPEN",
        "days_ago": 0,
        "mode": None,
    },
    {
        "code": "T-2610-0103",
        "emp_id": "2015",
        "task": "SW-ASST",
        "desc": "POS Ticketing App database lock error after morning shift handover at Caloocan.",
        "status": "OPEN",
        "days_ago": 0,
        "mode": None,
    },
    {
        "code": "T-2610-0104",
        "emp_id": "3011",
        "task": "PC-HW-REP",
        "desc": "Cubao ticketing cashier monitor flickering and displaying blue artifacts.",
        "status": "OPEN",
        "days_ago": 1,
        "mode": None,
    },
    {
        "code": "T-2610-0105",
        "emp_id": "4008",
        "task": "PRN-TS",
        "desc": "Epson LX-310 roller feed slipping. Conductor manifest printing skewed at Avenida.",
        "status": "OPEN",
        "days_ago": 1,
        "mode": None,
    },
    {
        "code": "T-2610-0106",
        "emp_id": "5012",
        "task": "NET-CFG",
        "desc": "Bataan Mirasol dispatch booth lost internet connection to central booking server.",
        "status": "OPEN",
        "days_ago": 2,
        "mode": None,
    },
    {
        "code": "T-2610-0107",
        "emp_id": "3044",
        "task": "SRV-ASSESS",
        "desc": "GPS tracking receiver server room UPS alarming battery degradation.",
        "status": "OPEN",
        "days_ago": 2,
        "mode": None,
    },
    {
        "code": "T-2610-0108",
        "emp_id": "7014",
        "task": "PC-PMS",
        "desc": "Scheduled quarterly PMS checkup for Tarlac gateway dispatch desktop units.",
        "status": "OPEN",
        "days_ago": 3,
        "mode": None,
    },
    # --- ACTIVE: IN PROGRESS (Claimed by Technicians) ---
    {
        "code": "T-2610-0109",
        "emp_id": "1092",
        "task": "PC-HW-REP",
        "desc": "Pasay Maintenance inspection PC hard drive clicking; cloned to new 500GB SSD.",
        "status": "PROG",
        "days_ago": 0,
        "mode": "SITE",
        "tech_role": "it",
        "hours_labor": None,
    },
    {
        "code": "T-2610-0110",
        "emp_id": "2022",
        "task": "NET-CFG",
        "desc": "Caloocan ticketing router VLAN reconfiguration for remote credit card POS swipe terminal.",
        "status": "PROG",
        "days_ago": 0,
        "mode": "REM",
        "tech_role": "it",
        "hours_labor": None,
    },
    {
        "code": "T-2610-0111",
        "emp_id": "3019",
        "task": "SW-ASST",
        "desc": "Remote assistance updating Windows security patches and terminal firewall rules at Cubao.",
        "status": "PROG",
        "days_ago": 1,
        "mode": "REM",
        "tech_role": "admin",
        "hours_labor": None,
    },
    {
        "code": "T-2610-0112",
        "emp_id": "4015",
        "task": "PRN-TS",
        "desc": "Avenida terminal ticket printer waste ink counter reset and head alignment.",
        "status": "PROG",
        "days_ago": 1,
        "mode": "SITE",
        "tech_role": "it",
        "hours_labor": None,
    },
    {
        "code": "T-2610-0113",
        "emp_id": "6018",
        "task": "PC-HW-REP",
        "desc": "San Carlos shop dispatch desktop power supply replacement (450W PSU).",
        "status": "PROG",
        "days_ago": 2,
        "mode": "SITE",
        "tech_role": "it",
        "hours_labor": None,
    },
    # --- RESOLVED: AWAITING EMPLOYEE CONFIRMATION ---
    {
        "code": "T-2610-0114",
        "emp_id": "1042",
        "task": "PRN-TS",
        "desc": "Thermal printer sensor cleaned and calibrated. Test print batch completed with zero errors.",
        "status": "RESL",
        "days_ago": 0,
        "mode": "REM",
        "tech_role": "it",
        "hours_labor": Decimal("0.50"),
    },
    {
        "code": "T-2610-0115",
        "emp_id": "2015",
        "task": "NET-CFG",
        "desc": "Replaced corroded RJ45 keystone jack in Cash booth 1. Bandwidth restored to 100Mbps.",
        "status": "RESL",
        "days_ago": 1,
        "mode": "SITE",
        "tech_role": "it",
        "hours_labor": Decimal("1.25"),
    },
    {
        "code": "T-2610-0116",
        "emp_id": "3011",
        "task": "SW-ASST",
        "desc": "Reinstalled corrupted ticket barcode scanner driver and verified USB COM port mapping.",
        "status": "RESL",
        "days_ago": 1,
        "mode": "REM",
        "tech_role": "admin",
        "hours_labor": Decimal("0.75"),
    },
    # --- HISTORICAL CLOSED: COMPLETED REPAIRS (For Analytics & SLA Reports) ---
    {
        "code": "T-2610-0117",
        "emp_id": "1088",
        "task": "PRN-TS",
        "desc": "Replaced thermal printhead on Bixolon SRP-330 printer in Pasay dispatch.",
        "status": "CLSD",
        "days_ago": 3,
        "mode": "SITE",
        "tech_role": "it",
        "hours_labor": Decimal("1.50"),
    },
    {
        "code": "T-2610-0118",
        "emp_id": "1105",
        "task": "SW-ASST",
        "desc": "Accounting Excel macro runtime error debugged and cell formatting restored.",
        "status": "CLSD",
        "days_ago": 4,
        "mode": "REM",
        "tech_role": "admin",
        "hours_labor": Decimal("0.40"),
    },
    {
        "code": "T-2610-0119",
        "emp_id": "2041",
        "task": "PC-PMS",
        "desc": "Cleaned dust filters, applied thermal paste, and tested CPU temps on Caloocan shop PC.",
        "status": "CLSD",
        "days_ago": 5,
        "mode": "SITE",
        "tech_role": "it",
        "hours_labor": Decimal("1.75"),
    },
    {
        "code": "T-2610-0120",
        "emp_id": "5020",
        "task": "NET-CFG",
        "desc": "Rebooted and reconfigured Bataan Mirasol Mikrotik router DHCP lease reservations.",
        "status": "CLSD",
        "days_ago": 6,
        "mode": "REM",
        "tech_role": "it",
        "hours_labor": Decimal("0.60"),
    },
    {
        "code": "T-2610-0121",
        "emp_id": "4015",
        "task": "PC-HW-REP",
        "desc": "Replaced blown 12V DC power brick on Avenida conductor manifest workstation.",
        "status": "CLSD",
        "days_ago": 7,
        "mode": "SITE",
        "tech_role": "it",
        "hours_labor": Decimal("1.10"),
    },
    {
        "code": "T-2610-0122",
        "emp_id": "3044",
        "task": "SRV-ASSESS",
        "desc": "Routine verification of GPS telemetry ingestion health on central server.",
        "status": "CLSD",
        "days_ago": 8,
        "mode": "REM",
        "tech_role": "admin",
        "hours_labor": Decimal("0.80"),
    },
    {
        "code": "T-2610-0123",
        "emp_id": "1042",
        "task": "SW-ASST",
        "desc": "Resolved printer paper size mismatch (A4 vs Receipt roll) in terminal booking portal.",
        "status": "CLSD",
        "days_ago": 9,
        "mode": "REM",
        "tech_role": "it",
        "hours_labor": Decimal("0.35"),
    },
    {
        "code": "T-2610-0124",
        "emp_id": "2022",
        "task": "PRN-TS",
        "desc": "Cleared stuck receipt paper roll from cutter assembly in Caloocan booth 3.",
        "status": "CLSD",
        "days_ago": 10,
        "mode": "SITE",
        "tech_role": "it",
        "hours_labor": Decimal("0.50"),
    },
    {
        "code": "T-2610-0125",
        "emp_id": "7014",
        "task": "NET-CFG",
        "desc": "Replaced bad patch cable between switch and Tarlac terminal supervisor desk.",
        "status": "CLSD",
        "days_ago": 12,
        "mode": "SITE",
        "tech_role": "it",
        "hours_labor": Decimal("0.90"),
    },
]


async def seed():
    async with AsyncSessionLocal() as session:
        async with session.begin():
            print("--> 1. Seeding Location-Department Scopes...")
            loc_map = {}
            dept_map = {}
            for loc in (await session.scalars(select(Location))).all():
                loc_map[loc.code] = loc
            for dept in (await session.scalars(select(Department))).all():
                dept_map[dept.code] = dept
            comp_map = {}
            for comp in (await session.scalars(select(Company))).all():
                comp_map[comp.code] = comp

            for loc_code, dept_code in LOCATION_DEPARTMENTS:
                loc = loc_map.get(loc_code)
                dept = dept_map.get(dept_code)
                if loc and dept:
                    stmt = (
                        insert(LocationDepartment)
                        .values(
                            location_id=loc.id, department_id=dept.id, is_default=True
                        )
                        .on_conflict_do_nothing()
                    )
                    await session.execute(stmt)

            print("--> 2. Seeding Verified Terminal Employees...")
            emp_map = {}
            for eid, name, email, c_code, l_code, d_code in EMPLOYEES:
                comp = comp_map.get(c_code)
                loc = loc_map.get(l_code)
                dept = dept_map.get(d_code)
                if comp and loc and dept:
                    stmt = (
                        insert(Employee)
                        .values(
                            employee_id=eid,
                            full_name=name,
                            email=email,
                            company_id=comp.id,
                            location_id=loc.id,
                            department_id=dept.id,
                            is_active=True,
                        )
                        .on_conflict_do_update(
                            index_elements=[Employee.employee_id],
                            set_={"full_name": name, "email": email, "is_active": True},
                        )
                        .returning(Employee)
                    )
                    res = await session.execute(stmt)
                    row = res.scalar_one_or_none()
                    if row:
                        emp_map[eid] = row

            print("--> 3. Resolving IT Technicians...")
            tech_user = await session.scalar(
                select(User).where(User.role == "it", User.is_active)
            )
            if tech_user:
                tech_user.password_hash = hash_password("Tiketa2026!Pass")
                tech_user.email = "technician@fivestar.com.ph"
            else:
                tech_user = User(
                    username="technician",
                    email="technician@fivestar.com.ph",
                    full_name="Nathaniel D. Esguerra",
                    role="it",
                    password_hash=hash_password("Tiketa2026!Pass"),
                    is_active=True,
                )
                session.add(tech_user)
                await session.flush()

            admin_user = await session.scalar(
                select(User).where(User.role == "admin", User.is_active)
            )
            if admin_user:
                admin_user.password_hash = hash_password("Tiketa2026!Pass")
                admin_user.email = "admin@fivestar.com.ph"
            else:
                admin_user = User(
                    username="admin",
                    email="admin@fivestar.com.ph",
                    full_name="IT Administrator",
                    role="admin",
                    password_hash=hash_password("Tiketa2026!Pass"),
                    is_active=True,
                )
                session.add(admin_user)
                await session.flush()

            print("--> 4. Seeding Realistic Tickets across States...")
            now = datetime.now(UTC)
            for tdata in DEMO_TICKETS:
                emp = emp_map.get(tdata["emp_id"])
                if not emp:
                    continue

                code = tdata["code"]
                existing = await session.scalar(
                    select(Ticket).where(Ticket.ticket_code == code)
                )
                if existing:
                    continue

                start_dt = now - timedelta(days=tdata["days_ago"], hours=2)
                start_date = local(start_dt).date()
                tech = admin_user if tdata.get("tech_role") == "admin" else tech_user

                status = tdata["status"]
                res_dt = None
                date_fin = None
                conf_dt = None
                duration = None

                if status in ("RESL", "CLSD"):
                    duration = tdata.get("hours_labor") or Decimal("1.00")
                    res_dt = start_dt + timedelta(minutes=int(float(duration) * 60))
                    date_fin = local(res_dt).date()
                if status == "CLSD":
                    conf_dt = res_dt + timedelta(hours=1)

                reported_issue = (
                    tdata["task"] if tdata["task"] in PUBLIC_KIOSK_ISSUES else None
                )

                ticket = Ticket(
                    ticket_code=code,
                    employee_id=emp.id,
                    creator_id=None,
                    company_id=emp.company_id,
                    location_id=emp.location_id,
                    department_id=emp.department_id,
                    requester_name=emp.full_name,
                    requester_contact_enc=encrypt(emp.email),
                    reported_issue_code=reported_issue,
                    task_code=tdata["task"],
                    description_enc=encrypt(tdata["desc"]),
                    mode=tdata.get("mode"),
                    month=start_date.strftime("%B %Y"),
                    date_started=start_date,
                    date_finished=date_fin,
                    started_at=start_dt if status != "OPEN" else None,
                    resolved_at=res_dt,
                    duration=duration,
                    status=status,
                    assigned_tech_id=tech.id if (tech and status != "OPEN") else None,
                    user_confirmed_at=conf_dt,
                )
                session.add(ticket)
                await session.flush()

                # Add technician assignment record
                if status != "OPEN" and tech:
                    session.add(
                        TicketTechnician(
                            ticket_id=ticket.id,
                            technician_id=tech.id,
                            assigned_at=start_dt,
                            is_primary=True,
                        )
                    )

                # Add initial dispatch note
                if status in ("PROG", "RESL", "CLSD") and tech:
                    session.add(
                        TicketComment(
                            ticket_id=ticket.id,
                            user_id=tech.id,
                            body_enc=encrypt(
                                f"Technician acknowledged issue. Support Mode: {tdata.get('mode') or 'SITE'}."
                            ),
                            is_internal=True,
                        )
                    )

            # Ensure ticket counter is synchronized
            month_key = now.strftime("%y%m")
            stmt = (
                insert(TicketCounter)
                .values(month=month_key, value=150)
                .on_conflict_do_update(
                    index_elements=[TicketCounter.month],
                    set_={"value": 150},
                )
            )
            await session.execute(stmt)

            print("--> 5. Seeding Fleet Maintenance Plans for PMS Compliance...")
            psy_loc = loc_map.get("PSY")
            ops_dept = dept_map.get("OPS")
            cash_dept = dept_map.get("CASH")
            if psy_loc and ops_dept:
                stmt = (
                    insert(MaintenancePlan)
                    .values(
                        location_id=psy_loc.id,
                        department_id=ops_dept.id,
                        task_code="PC-PMS",
                        month_start=now.date().replace(day=1),
                        expected_services=10,
                        due_date=now.date().replace(day=28),
                    )
                    .on_conflict_do_nothing()
                )
                await session.execute(stmt)
            if psy_loc and cash_dept:
                stmt = (
                    insert(MaintenancePlan)
                    .values(
                        location_id=psy_loc.id,
                        department_id=cash_dept.id,
                        task_code="PRN-PMS",
                        month_start=now.date().replace(day=1),
                        expected_services=8,
                        due_date=now.date().replace(day=28),
                    )
                    .on_conflict_do_nothing()
                )
                await session.execute(stmt)

    print(
        "SUCCESS: Demo operational database populated with realistic multi-terminal data."
    )


if __name__ == "__main__":
    asyncio.run(seed())
