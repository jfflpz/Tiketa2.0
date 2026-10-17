import asyncio

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models import (
    Company,
    Department,
    Employee,
    Location,
    LocationDepartment,
    TaskCategory,
)

COMPANIES = [
    ("FS", "Pangasinan Five Star Bus Co."),
    ("LCTI", "Luzon Cisco Transit Inc."),
    ("BTCI", "Bataan Transit Co., Inc."),
    ("FNLT", "First North Luzon Transit"),
    ("MDL", "Maria De Leon"),
    ("CBM", "Cubao Motors"),
    ("ATTI", "Asian Transport and Tourism Institute Inc."),
    ("LNDRY", "Laundry Group"),
    ("FSC", "Food Stop Company"),
    ("HG", "Hotel Group"),
    ("AH", "Adamo Holdings"),
]

LOCATIONS = [
    ("AVN", "Avenida"),
    ("BTM", "Bataan Mirasol"),
    ("CAL", "Caloocan"),
    ("FSM", "Five Star Mirasol"),
    ("PSY", "Pasay"),
    ("CMA", "Cubao Maya"),
    ("MEY", "Meycauayan"),
    ("MTL", "Montreal"),
    ("SNC", "San Carlos"),
    ("SSH", "Sunshine"),
    ("CLS", "Calasiao"),
    ("CSM", "Cisco Mirasol"),
    ("VAL", "Valenzuela"),
    ("NWT", "Northway Terminal"),
    ("TRL", "Tarlac"),
]

DEPARTMENTS = [
    ("ACCT", "Accounting"),
    ("HR", "Human Resources"),
    ("OPS", "Operation"),
    ("OPRES", "Office of the President"),
    ("MAINT", "Maintenance"),
    ("CASH", "Cash Management"),
    ("SOG", "SOG"),
    ("SOG-DIG", "SOG - Digital"),
    ("ATTI", "ATTI"),
    ("SEC", "Security"),
    ("HERO", "Hero Pharma"),
    ("BP", "Business Process"),
    ("BP-FUEL", "Business Process - Fuel Team"),
    ("BP-GPS", "Business Process - GPS Team"),
    ("PURCH", "Purchasing"),
    ("CS", "Customer Service"),
    ("FIN", "Finance"),
    ("ADMIN", "Admin"),
    ("AP", "AP Team"),
]

TASKS = [
    ("NET-CFG", "Network Configuration"),
    ("PC-ASSESS", "PC/Laptop Assessment"),
    ("SRV-ASSESS", "Server Assessment"),
    ("PRN-TS", "Printer Troubleshoot"),
    ("SW-ASST", "Software Assistance"),
    ("PRN-NET", "Printer Network Connection"),
    ("PC-HW-REP", "PC/Laptop Hardware Replacement"),
    ("PERIPH-REP", "Peripherals Replacement"),
    ("PC-TS", "PC/Laptop Troubleshoot"),
    ("PC-PMS", "PC/Laptop PMS"),
    ("PC-SETUP", "PC/Laptop Set-up"),
    ("PRN-PMS", "Printer PMS"),
    ("PRN-SETUP", "Printer Set-up"),
]


async def seed(demo=False):
    from sqlalchemy.dialects.postgresql import insert

    async with AsyncSessionLocal() as session:
        async with session.begin():
            for model, values in (
                (Company, COMPANIES),
                (Location, LOCATIONS),
                (Department, DEPARTMENTS),
                (TaskCategory, TASKS),
            ):
                for code, name in values:
                    statement = (
                        insert(model)
                        .values(code=code, name=name)
                        .on_conflict_do_nothing(index_elements=[model.code])
                    )
                    await session.execute(statement)
            # Do not invent production department mappings or employees.
            if demo:
                from app.core.config import settings

                if settings.ENVIRONMENT == "production":
                    raise ValueError("Demo seeding is prohibited in production")
                company = await session.scalar(
                    select(Company).where(Company.code == "FS")
                )
                location = await session.scalar(
                    select(Location).where(Location.code == "PSY")
                )
                department = await session.scalar(
                    select(Department).where(Department.code == "CASH")
                )
                await session.execute(
                    insert(LocationDepartment)
                    .values(location_id=location.id, department_id=department.id)
                    .on_conflict_do_nothing()
                )
                await session.execute(
                    insert(Employee)
                    .values(
                        employee_id="FS-1042",
                        full_name="Maria Santos",
                        email="maria.santos@example.com",
                        company_id=company.id,
                        location_id=location.id,
                        department_id=department.id,
                    )
                    .on_conflict_do_nothing(index_elements=[Employee.employee_id])
                )
    print("Dictionary seeding complete.")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--demo", action="store_true")
    asyncio.run(seed(parser.parse_args().demo))
