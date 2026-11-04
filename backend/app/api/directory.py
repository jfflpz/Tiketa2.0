from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import func, select
from starlette.concurrency import run_in_threadpool

from app.api.deps import DB, Admin, CurrentUser, SupervisorOrAdmin
from app.core.cache import (
    check_session_cooldown,
    rate_limit,
    record_matching_attempt,
)
from app.core.security import digest, hash_password, issue_match_token
from app.models import (
    Company,
    Department,
    Employee,
    Location,
    LocationDepartment,
    MaintenancePlan,
    TaskCategory,
    Ticket,
    User,
)
from app.schemas import (
    DepartmentCreate,
    DepartmentOut,
    DepartmentUpdate,
    EmployeeInput,
    EmployeeMatchInput,
    EmployeeMatchOut,
    EmployeeScopeOut,
    LocationDepartmentOut,
    LocationDepartmentUpdate,
    PlanInput,
    ScopeInput,
    UserCreate,
    UserOut,
    UserUpdate,
)
from app.services.directory import employee_view, find_employee, validate_scope

router = APIRouter(tags=["Directory"])


@router.post("/employees/match", response_model=EmployeeMatchOut)
async def match_employee(
    body: EmployeeMatchInput,
    request: Request,
    db: DB,
):
    session_id = request.headers.get("X-Kiosk-Session-ID") or request.headers.get(
        "x-kiosk-session-id"
    )
    if not session_id or len(session_id.strip()) < 8:
        raise HTTPException(400, "X-Kiosk-Session-ID header is required")
    session_id = session_id.strip()

    client_ip = request.client.host if request.client else "unknown"
    await rate_limit("match_ip:" + digest(client_ip), 60, 60)
    await check_session_cooldown(session_id)

    clean_id = body.employee_id.strip()
    clean_email = str(body.email).strip().lower()

    employee = await db.scalar(
        select(Employee).where(
            Employee.employee_id == clean_id,
            func.lower(Employee.email) == clean_email,
            Employee.is_active.is_(True),
        )
    )

    if not employee:
        await record_matching_attempt(session_id, is_mismatch=True)
        raise HTTPException(
            404, "Employee ID and email do not match an active employee record."
        )

    await record_matching_attempt(session_id, is_mismatch=False)

    company = await db.get(Company, employee.company_id)
    location = await db.get(Location, employee.location_id)
    department = await db.get(Department, employee.department_id)

    token = issue_match_token(employee.employee_id, session_id)

    return EmployeeMatchOut(
        matched=True,
        match_token=token,
        employee=EmployeeScopeOut(
            full_name=employee.full_name,
            company_name=company.name if company else "",
            location_name=location.name if location else "",
            department_name=department.name if department else "",
        ),
    )


@router.get("/employees/lookup")
async def lookup(
    request: Request,
    db: DB,
    user: CurrentUser,
    q: Annotated[str, Query(min_length=1, max_length=150)],
):
    await rate_limit("lookup:" + digest(request.client.host), 60, 60)
    query_str = q.strip()
    if "@" not in query_str and not query_str.isdigit():
        raise HTTPException(422, "Employee ID query must consist only of ASCII digits")
    return await employee_view(db, await find_employee(db, query_str))


@router.get("/dictionaries")
async def dictionaries(
    db: DB,
    user: CurrentUser,
    include_inactive: bool = Query(False),
):
    if include_inactive and user.role != "admin":
        raise HTTPException(
            403, "Only administrators can view inactive dictionary records"
        )

    result = {}
    for key, model in (
        ("companies", Company),
        ("locations", Location),
        ("departments", Department),
        ("tasks", TaskCategory),
    ):
        stmt = select(model).order_by(model.code)
        if hasattr(model, "is_active") and not include_inactive:
            stmt = stmt.where(model.is_active.is_(True))

        rows = (await db.scalars(stmt)).all()
        result[key] = [
            {
                "id": getattr(row, "id", None),
                "code": row.code,
                "name": row.name,
                **({"is_active": row.is_active} if hasattr(row, "is_active") else {}),
            }
            for row in rows
        ]

    ld_stmt = select(LocationDepartment)
    if not include_inactive:
        ld_stmt = ld_stmt.where(LocationDepartment.is_active.is_(True))
    ld_rows = (await db.scalars(ld_stmt)).all()
    result["location_departments"] = [
        {
            "location_id": row.location_id,
            "department_id": row.department_id,
            "is_default": row.is_default,
            "is_active": row.is_active,
        }
        for row in ld_rows
    ]
    return result


@router.get("/admin/users", response_model=list[UserOut])
async def users(
    db: DB,
    user: SupervisorOrAdmin,
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
):
    users_list = (
        await db.scalars(
            select(User).order_by(User.username).offset(offset).limit(limit)
        )
    ).all()
    if not users_list:
        return []

    user_ids = [u.id for u in users_list]
    stats_query = (
        select(
            Ticket.assigned_tech_id,
            func.count().filter(Ticket.status == "PROG").label("active_bench"),
            func.count()
            .filter(Ticket.status.in_(["CLSD", "RESL"]))
            .label("closed_repairs"),
        )
        .where(Ticket.assigned_tech_id.in_(user_ids))
        .group_by(Ticket.assigned_tech_id)
    )
    stats_rows = (await db.execute(stats_query)).all()
    stats_map = {
        row.assigned_tech_id: (row.active_bench, row.closed_repairs)
        for row in stats_rows
    }

    return [
        UserOut(
            id=u.id,
            username=u.username,
            email=u.email,
            full_name=u.full_name,
            role=u.role,
            is_active=u.is_active,
            active_bench=stats_map.get(u.id, (0, 0))[0],
            closed_repairs=stats_map.get(u.id, (0, 0))[1],
        )
        for u in users_list
    ]


@router.post("/admin/users", status_code=201, response_model=UserOut)
async def create_user(body: UserCreate, db: DB, admin: Admin):
    raise HTTPException(
        403,
        "Direct user creation is disabled. Propose account creation via /account-requests for Supervisor approval.",
    )
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

    # Audit Finding 15 & B-03 Governance
    if body.role is not None and body.role != user.role:
        raise HTTPException(
            403,
            "Direct role changes are disabled. Role changes require governed account proposals.",
        )
    if body.is_active is False:
        raise HTTPException(
            403,
            "Direct deactivation is disabled. Submit a deactivation request via /account-requests.",
        )

    for key, value in body.model_dump(
        exclude_none=True, exclude={"password", "role", "is_active"}
    ).items():
        setattr(user, key, value)
    if body.password:
        user.password_hash = await run_in_threadpool(hash_password, body.password)
    user.token_version += 1
    await db.commit()
    return user


@router.get("/admin/employees")
async def employees(
    db: DB,
    user: SupervisorOrAdmin,
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

    loc_dept = await db.get(LocationDepartment, (body.location_id, body.department_id))
    if not loc_dept:
        loc_dept = LocationDepartment(**body.model_dump(), is_active=True)
        db.add(loc_dept)
    else:
        loc_dept.is_active = True
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


@router.post("/departments", status_code=201, response_model=DepartmentOut)
async def create_department(body: DepartmentCreate, db: DB, admin: Admin):
    clean_code = body.code.strip().upper()
    clean_name = body.name.strip()

    conflict = await db.scalar(
        select(Department).where(
            (func.upper(Department.code) == clean_code)
            | (func.lower(Department.name) == clean_name.lower())
        )
    )
    if conflict:
        raise HTTPException(409, "A department with this code or name already exists")

    dept = Department(
        code=clean_code,
        name=clean_name,
        is_active=body.is_active,
    )
    db.add(dept)
    await db.commit()
    await db.refresh(dept)
    return dept


@router.patch("/departments/{department_id}", response_model=DepartmentOut)
async def update_department(
    department_id: UUID, body: DepartmentUpdate, db: DB, admin: Admin
):
    dept = await db.get(Department, department_id, with_for_update=True)
    if not dept:
        raise HTTPException(404, "Department not found")

    if body.code is not None:
        clean_code = body.code.strip().upper()
        conflict = await db.scalar(
            select(Department).where(
                func.upper(Department.code) == clean_code,
                Department.id != department_id,
            )
        )
        if conflict:
            raise HTTPException(409, "A department with this code already exists")
        dept.code = clean_code

    if body.name is not None:
        clean_name = body.name.strip()
        conflict = await db.scalar(
            select(Department).where(
                func.lower(Department.name) == clean_name.lower(),
                Department.id != department_id,
            )
        )
        if conflict:
            raise HTTPException(409, "A department with this name already exists")
        dept.name = clean_name

    if body.is_active is False and dept.is_active is True:
        emp_count = await db.scalar(
            select(func.count())
            .select_from(Employee)
            .where(
                Employee.department_id == department_id, Employee.is_active.is_(True)
            )
        )
        if (emp_count or 0) > 0:
            raise HTTPException(
                409, "Cannot deactivate department with active assigned employees"
            )

        ticket_count = await db.scalar(
            select(func.count())
            .select_from(Ticket)
            .where(
                Ticket.department_id == department_id,
                Ticket.status.in_(["OPEN", "PROG"]),
            )
        )
        if (ticket_count or 0) > 0:
            raise HTTPException(
                409, "Cannot deactivate department with active tickets in progress"
            )

        dept.is_active = False
    elif body.is_active is True:
        dept.is_active = True

    await db.commit()
    await db.refresh(dept)
    return dept


@router.patch(
    "/admin/location-departments/{location_id}/{department_id}",
    response_model=LocationDepartmentOut,
)
async def update_location_department(
    location_id: UUID,
    department_id: UUID,
    body: LocationDepartmentUpdate,
    db: DB,
    admin: Admin,
):
    loc_dept = await db.get(
        LocationDepartment, (location_id, department_id), with_for_update=True
    )
    if not loc_dept:
        raise HTTPException(404, "Location-department link not found")

    if body.is_active is False and loc_dept.is_active is True:
        emp_count = await db.scalar(
            select(func.count())
            .select_from(Employee)
            .where(
                Employee.location_id == location_id,
                Employee.department_id == department_id,
                Employee.is_active.is_(True),
            )
        )
        if (emp_count or 0) > 0:
            raise HTTPException(
                409, "Cannot deactivate link with active assigned employees"
            )

        ticket_count = await db.scalar(
            select(func.count())
            .select_from(Ticket)
            .where(
                Ticket.location_id == location_id,
                Ticket.department_id == department_id,
                Ticket.status.in_(["OPEN", "PROG"]),
            )
        )
        if (ticket_count or 0) > 0:
            raise HTTPException(
                409, "Cannot deactivate link with active tickets in progress"
            )

        loc_dept.is_active = False
    elif body.is_active is True:
        loc_dept.is_active = True

    if body.is_default is not None:
        loc_dept.is_default = body.is_default

    await db.commit()
    await db.refresh(loc_dept)
    return loc_dept
