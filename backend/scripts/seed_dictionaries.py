import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models import Company, Location, Department, Employee

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
    ("AH", "Adamo Holdings")
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
    ("TRL", "Tarlac")
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
    ("HERO", "Hero Express"),
    ("BP", "Body Plant"),
    ("BP-FUEL", "Body Plant - Fuel"),
    ("BP-GPS", "Body Plant - GPS"),
    ("PURCH", "Purchasing"),
    ("CS", "Customer Service"),
    ("FIN", "Finance"),
    ("ADMIN", "Administration"),
    ("AP", "Accounts Payable")
]

async def seed():
    async with AsyncSessionLocal() as session:
        for code, name in COMPANIES:
            stmt = select(Company).where(Company.code == code)
            res = await session.execute(stmt)
            if not res.scalar_one_or_none():
                session.add(Company(code=code, name=name))

        for code, name in LOCATIONS:
            stmt = select(Location).where(Location.code == code)
            res = await session.execute(stmt)
            if not res.scalar_one_or_none():
                session.add(Location(code=code, name=name))

        for code, name in DEPARTMENTS:
            stmt = select(Department).where(Department.code == code)
            res = await session.execute(stmt)
            if not res.scalar_one_or_none():
                session.add(Department(code=code, name=name))

        await session.commit()

        res_fs = await session.execute(select(Company).where(Company.code == "FS"))
        fs_comp = res_fs.scalar_one()
        res_psy = await session.execute(select(Location).where(Location.code == "PSY"))
        psy_loc = res_psy.scalar_one()
        res_cash = await session.execute(select(Department).where(Department.code == "CASH"))
        cash_dept = res_cash.scalar_one()

        emp_stmt = select(Employee).where(Employee.employee_id == "FS-1042")
        emp_res = await session.execute(emp_stmt)
        if not emp_res.scalar_one_or_none():
            session.add(Employee(
                employee_id="FS-1042",
                full_name="Maria Santos",
                email="maria.santos@fivestarbus.com",
                company_id=fs_comp.id,
                location_id=psy_loc.id,
                department_id=cash_dept.id
            ))
            await session.commit()

        print("✓ Dictionary and initial employee seeding completed successfully.")

if __name__ == "__main__":
    asyncio.run(seed())