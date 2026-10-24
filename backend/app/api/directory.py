from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import select
from starlette.concurrency import run_in_threadpool

from app.api.deps import DB, Admin, CurrentUser
from app.core.cache import rate_limit
from app.core.security import digest, hash_password
from app.models import (
    Company,
    Department,
    Employee,
    Location,
    LocationDepartment,
    MaintenancePlan,
    TaskCategory,
    User,
)
from app.schemas import (
    EmployeeInput,
    PlanInput,
    ScopeInput,
    UserCreate,
    UserOut,
    UserUpdate,
)
from app.services.directory import employee_view, find_employee, validate_scope

router = APIRouter(tags=["Directory"])


@router.get("/employees/lookup")
async def lookup(
    request: Request, db: DB, q: Annotated[str, Query(min_length=1, max_length=150)]
):
    await rate_limit("lookup:" + digest(request.client.host), 60, 60)
    query_str = q.strip()
    if "@" not in query_str and not query_str.isdigit():
        raise HTTPException(422, "Employee ID query must consist only of ASCII digits")
    return await employee_view(db, await find_employee(db, query_str))


@router.get("/dictionaries")
async def dictionaries(db: DB, user: CurrentUser):
    result = {}
    for key, model in (
        ("companies", Company),
        ("locations", Location),
        ("departments", Department),
        ("tasks", TaskCategory),
    ):
        result[key] = [
            dict(id=getattr(row, "id", None), code=row.code, name=row.name)
            for row in (await db.scalars(select(model).order_by(model.code))).all()
        ]
    result["location_departments"] = [
        dict(location_id=row.location_id, department_id=row.department_id)
        for row in (await db.scalars(select(LocationDepartment))).all()
    ]
    return result


@router.get("/admin/users", response_model=list[UserOut])
async def users(
    db: DB,
    admin: Admin,
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
):
    return (
        await db.scalars(
            select(User).order_by(User.username).offset(offset).limit(limit)
        )
    ).all()


@router.post("/admin/users", status_code=201, response_model=UserOut)
async def create_user(body: UserCreate, db: DB, admin: Admin):
    user = User(
        **body.model_dump(exclude={"password"}),
        password_hash=await run_in_threadpool(hash_password, body.password),
    )
    user.username = user.username.lower()
    user.email = str(user.email).lower()
    db.add(user)
    await db.commit()
    return user


@router.patch("/admin/users/{user_id}", response_model=UserOut)
async def update_user(user_id: UUID, body: UserUpdate, db: DB, admin: Admin):
    user = await db.get(User, user_id, with_for_update=True)
    if not user:
        raise HTTPException(404, "User not found")
    if user.id == admin.id and (body.is_active is False or body.role == "it"):
        raise HTTPException(
            409, "Cannot deactivate or demote your own administrator account"
        )
    for key, value in body.model_dump(exclude_none=True, exclude={"password"}).items():
        setattr(user, key, value)
    if body.password:
        user.password_hash = await run_in_threadpool(hash_password, body.password)
    # Any governance change invalidates existing access and refresh tokens.
    user.token_version += 1
    await db.commit()
    return user


@router.get("/admin/employees")
async def employees(
    db: DB,
    admin: Admin,
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
):
    records = (
        await db.scalars(
            select(Employee).order_by(Employee.employee_id).offset(offset).limit(limit)
        )
    ).all()
    return [await employee_view(db, row) for row in records]


@router.post("/admin/employees", status_code=201)
async def create_employee(body: EmployeeInput, db: DB, admin: Admin):
    await validate_scope(db, body.location_id, body.department_id, body.company_id)
    row = Employee(**body.model_dump())
    row.email = str(row.email).lower()
    db.add(row)
    await db.commit()
    return await employee_view(db, row)


@router.put("/admin/employees/{employee_id}")
async def update_employee(employee_id: UUID, body: EmployeeInput, db: DB, admin: Admin):
    row = await db.get(Employee, employee_id, with_for_update=True)
    if not row:
        raise HTTPException(404, "Employee not found")
    await validate_scope(db, body.location_id, body.department_id, body.company_id)
    for key, value in body.model_dump().items():
        setattr(row, key, value)
    row.email = str(row.email).lower()
    await db.commit()
    return await employee_view(db, row)


@router.post("/admin/location-departments", status_code=201)
async def create_scope(body: ScopeInput, db: DB, admin: Admin):
    for model, value in (
        (Location, body.location_id),
        (Department, body.department_id),
    ):
        row = await db.get(model, value)
        if not row or not row.is_active:
            raise HTTPException(422, "Unknown or inactive location/department")
    if not await db.get(LocationDepartment, (body.location_id, body.department_id)):
        db.add(LocationDepartment(**body.model_dump()))
        await db.commit()
    return body


@router.post("/admin/maintenance-plans", status_code=201)
async def create_plan(body: PlanInput, db: DB, admin: Admin):
    await validate_scope(db, body.location_id, body.department_id)
    plan = MaintenancePlan(**body.model_dump())
    db.add(plan)
    await db.commit()
    return {"id": plan.id, **body.model_dump()}


@router.put("/admin/maintenance-plans/{plan_id}")
async def update_plan(plan_id: UUID, body: PlanInput, db: DB, admin: Admin):
    plan = await db.get(MaintenancePlan, plan_id)
    if not plan:
        raise HTTPException(404, "Maintenance plan not found")
    await validate_scope(db, body.location_id, body.department_id)
    for key, value in body.model_dump().items():
        setattr(plan, key, value)
    await db.commit()
    return {"id": plan.id, **body.model_dump()}
