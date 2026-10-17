from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Company, Department, Employee, Location, LocationDepartment


async def validate_scope(db: AsyncSession, location_id, department_id, company_id=None):
    for model, value in (
        (Location, location_id),
        (Department, department_id),
        (Company, company_id),
    ):
        if value is not None:
            record = await db.get(model, value)
            if not record or not record.is_active:
                raise HTTPException(422, f"Inactive or unknown {model.__tablename__}")
    if not await db.get(LocationDepartment, (location_id, department_id)):
        raise HTTPException(422, "Department is not assigned to this location")


async def find_employee(db: AsyncSession, query: str):
    employee = await db.scalar(
        select(Employee).where(
            or_(
                Employee.employee_id == query,
                func.lower(Employee.email) == query.lower(),
            )
        )
    )
    if not employee or not employee.is_active:
        raise HTTPException(404, "Active employee not found")
    await validate_scope(
        db, employee.location_id, employee.department_id, employee.company_id
    )
    return employee


async def employee_view(db: AsyncSession, employee):
    result = {
        key: getattr(employee, key)
        for key in (
            "id",
            "employee_id",
            "full_name",
            "email",
            "company_id",
            "location_id",
            "department_id",
            "is_active",
        )
    }
    for label, model in (
        ("company", Company),
        ("location", Location),
        ("department", Department),
    ):
        result[label + "_name"] = (
            await db.get(model, getattr(employee, label + "_id"))
        ).name
    return result
