import uuid
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_location_and_department_admin_configuration(client: AsyncClient, accounts):
    """B-05: Admin can create and update locations, departments, and their link."""
    # 1. Non-admin cannot create location (403)
    res_unauth = await client.post(
        "/api/v1/locations",
        json={"code": "TEST_LOC", "name": "Test Location", "is_active": True},
        headers=accounts["tech"],
    )
    assert res_unauth.status_code == 403

    # 2. Admin creates new location
    code_loc = f"LOC_{uuid.uuid4().hex[:6].upper()}"
    res_loc = await client.post(
        "/api/v1/locations",
        json={"code": code_loc, "name": f"Terminal {code_loc}", "address": "Terminal St."},
        headers=accounts["admin"],
    )
    assert res_loc.status_code == 201
    loc_id = res_loc.json()["id"]

    # 3. Duplicate code returns 409
    res_dup = await client.post(
        "/api/v1/locations",
        json={"code": code_loc, "name": "Different Name"},
        headers=accounts["admin"],
    )
    assert res_dup.status_code == 409

    # 4. Admin creates new department
    code_dept = f"DEP_{uuid.uuid4().hex[:6].upper()}"
    res_dept = await client.post(
        "/api/v1/departments",
        json={"code": code_dept, "name": f"Dept {code_dept}"},
        headers=accounts["admin"],
    )
    assert res_dept.status_code == 201
    dept_id = res_dept.json()["id"]

    # 5. Link location and department
    res_link = await client.post(
        "/api/v1/admin/location-departments",
        json={"location_id": loc_id, "department_id": dept_id},
        headers=accounts["admin"],
    )
    assert res_link.status_code == 201

    # 6. Admin patches location-department active state
    res_patch_link = await client.patch(
        f"/api/v1/admin/location-departments/{loc_id}/{dept_id}",
        json={"is_active": False},
        headers=accounts["admin"],
    )
    assert res_patch_link.status_code == 200
    assert res_patch_link.json()["is_active"] is False

    # 7. Reactivate link via POST /admin/location-departments
    res_reactivate = await client.post(
        "/api/v1/admin/location-departments",
        json={"location_id": loc_id, "department_id": dept_id},
        headers=accounts["admin"],
    )
    assert res_reactivate.status_code == 201


@pytest.mark.asyncio
async def test_dictionaries_active_filtering_and_include_inactive(client: AsyncClient, accounts):
    """B-05: Dictionaries return only active choices; include_inactive requires Admin."""
    # 1. Tech requests include_inactive=true -> 403 Forbidden
    res_forbidden = await client.get(
        "/api/v1/dictionaries?include_inactive=true",
        headers=accounts["tech"],
    )
    assert res_forbidden.status_code == 403

    # 2. Tech requests normal dictionaries -> 200, all returned have is_active == True
    res_normal = await client.get("/api/v1/dictionaries", headers=accounts["tech"])
    assert res_normal.status_code == 200
    data = res_normal.json()
    assert all(loc["is_active"] is True for loc in data["locations"])
    assert all(dept["is_active"] is True for dept in data["departments"])
    assert all(ld["is_active"] is True for ld in data["location_departments"])

    # 3. Admin requests include_inactive=true -> 200 OK
    res_admin = await client.get(
        "/api/v1/dictionaries?include_inactive=true",
        headers=accounts["admin"],
    )
    assert res_admin.status_code == 200


@pytest.mark.asyncio
async def test_unsafe_deactivation_blocked_by_in_use_records(client: AsyncClient, accounts):
    """B-05: Deactivating location/department with active employees or active tickets returns 409."""
    # 1. Fetch existing active employee
    emp_res = await client.get("/api/v1/admin/employees", headers=accounts["admin"])
    assert emp_res.status_code == 200
    employees = emp_res.json()
    emp = employees[0]
    loc_id = emp["location_id"]
    dept_id = emp["department_id"]

    # 2. Deactivating location with active employee returns 409
    res_deact_loc = await client.patch(
        f"/api/v1/locations/{loc_id}",
        json={"is_active": False},
        headers=accounts["admin"],
    )
    assert res_deact_loc.status_code == 409
    assert "active assigned employees" in res_deact_loc.json()["detail"]

    # 3. Deactivating department with active employee returns 409
    res_deact_dept = await client.patch(
        f"/api/v1/departments/{dept_id}",
        json={"is_active": False},
        headers=accounts["admin"],
    )
    assert res_deact_dept.status_code == 409
    assert "active assigned employees" in res_deact_dept.json()["detail"]

    # 4. Create an active ticket in progress using seeded task code "PRN-TS"
    ticket_res = await client.post(
        "/api/v1/tickets/quick-intake",
        json={
            "employee_id": emp["employee_id"],
            "task_code": "PRN-TS",
            "description": "Active in-use test ticket for deactivation protection",
            "mode": "SITE",
        },
        headers=accounts["tech"],
    )
    assert ticket_res.status_code == 201

    # 5. Deactivating location-department link with active tickets returns 409
    res_deact_link = await client.patch(
        f"/api/v1/admin/location-departments/{loc_id}/{dept_id}",
        json={"is_active": False},
        headers=accounts["admin"],
    )
    assert res_deact_link.status_code == 409
    assert "active" in res_deact_link.json()["detail"]

    # 6. Deactivating department with active tickets returns 409
    res_deact_dept_ticket = await client.patch(
        f"/api/v1/departments/{dept_id}",
        json={"is_active": False},
        headers=accounts["admin"],
    )
    assert res_deact_dept_ticket.status_code == 409