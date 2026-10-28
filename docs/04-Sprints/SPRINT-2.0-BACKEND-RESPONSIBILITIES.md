# ⚙️ Sprint 2.0: Backend Track Responsibilities

**Sprint:** Sprint 2.0 — End-to-End State Sync & 4-Tier RBAC Architecture  
**Owner:** Backend Engineering  
**Master Plan:** [`SPRINT-2.0-SYNC-AND-4TIER-RBAC-PLAN.md`](SPRINT-2.0-SYNC-AND-4TIER-RBAC-PLAN.md)  
**Specification:** [`docs/audit-and-rbac-spec.md`](../audit-and-rbac-spec.md)  
**Status:** Planned  

---

## 1. Ownership & Scope

The Backend Track owns the database layer, Alembic migrations, FastAPI routers, Pydantic schemas, and authentication/authorization dependencies within `backend/app/`.

### Key Responsibilities
1. Upgrade PostgreSQL check constraint `ck_users_role` from binary `('it', 'admin')` to 4 roles: `('intern', 'it', 'analyst', 'admin')`.
2. Fix queue query sorting bug (`order_by(Ticket.created_at.desc(), Ticket.id.desc())`).
3. Add authoritative `id: UUID` to `PublicTicket` schema in `POST /tickets/submit`.
4. Create granular FastAPI role-checking dependencies (`AnalystOrAdmin`, `SupportOrAdmin`, `TechnicianRoles`).
5. Update `GET /reports/{report_name}` authorization to allow `AnalystOrAdmin`.
6. Enforce claim authorization (prevent `intern` and `analyst` from claiming open pool tickets).
7. Implement soft-deactivation in `PATCH /admin/users/{user_id}` and `PUT /admin/employees/{employee_id}` with immediate Redis session revocation.

---

## 2. Detailed Task Breakdown

### Task B-01: Alembic Database Migration (`ck_users_role`)
- **File:** `backend/alembic/versions/0004_upgrade_to_4tier_rbac.py`
- **Actions:**
  - Create revision 0004 with down_revision pointing to `0003_report_index_index_maintenance_completion_queries`.
  - Drop existing check constraint:
    ```sql
    ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_role;
    ```
  - Re-add check constraint supporting all 4 roles:
    ```sql
    ALTER TABLE users ADD CONSTRAINT ck_users_role 
        CHECK (role IN ('intern', 'it', 'analyst', 'admin'));
    ```
  - Update `backend/app/models/user.py`:
    ```python
    __table_args__ = (
        CheckConstraint(
            "role IN ('intern', 'it', 'analyst', 'admin')", 
            name="ck_users_role"
        ),
    )
    ```
- **Acceptance Criteria:** `alembic upgrade head` executes cleanly on PostgreSQL. Inserting a user with role `intern` or `analyst` succeeds; invalid roles fail with DB integrity error.

---

### Task B-02: Contract-First Pydantic v2 Schema Updates
- **File:** `backend/app/schemas.py`
- **Actions:**
  - Define role literal:
    ```python
    StaffRoleLiteral = Literal["intern", "it", "analyst", "admin"]
    ```
  - Update `UserCreate`:
    ```python
    class UserCreate(Input):
        username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_.-]+$")
        email: EmailStr = Field(max_length=150)
        full_name: str = Field(min_length=2, max_length=150)
        role: StaffRoleLiteral
        password: str = Field(min_length=12, max_length=128)
    ```
  - Update `UserUpdate`:
    ```python
    class UserUpdate(Input):
        full_name: str | None = Field(default=None, min_length=2, max_length=150)
        role: StaffRoleLiteral | None = None
        is_active: bool | None = None
        password: str | None = Field(default=None, min_length=12, max_length=128)
    ```
  - Update `UserOut`:
    ```python
    class UserOut(BaseModel):
        model_config = ConfigDict(from_attributes=True)
        id: UUID
        username: str
        email: str
        full_name: str
        role: StaffRoleLiteral
        is_active: bool
    ```
  - **Fix RCA-2 (Public Ticket UUID):** Update `PublicTicket` to include `id: UUID`:
    ```python
    class PublicTicket(BaseModel):
        id: UUID
        ticket_code: str
        status: str
        created_at: datetime
    ```
- **Acceptance Criteria:** `POST /tickets/submit` returns valid JSON with `id` matching database row UUID. `openapi.json` exports new role enum values.

---

### Task B-03: Queue Ordering & Invalidation Fix (RCA-1)
- **File:** `backend/app/api/tickets.py`
- **Actions:**
  - Fix query ordering in `GET /tickets` (`queue` endpoint):
    ```python
    # BEFORE (Bug): select(Ticket).order_by(Ticket.created_at, Ticket.id)
    # AFTER (Fixed):
    query = (
        select(Ticket)
        .order_by(Ticket.created_at.desc(), Ticket.id.desc())
        .offset(offset)
        .limit(limit)
    )
    ```
  - Verify that `submit` calls `await cache.incr("queue:version")` to invalidate cached queue pages immediately upon creation.
- **Acceptance Criteria:** A newly created ticket created at $T_0$ appears at index 0 of the first page of `GET /api/v1/tickets`.

---

### Task B-04: Role-Based Authorization Dependencies
- **File:** `backend/app/api/deps.py`
- **Actions:**
  - Update `validated_user`:
    ```python
    if (
        not user
        or not user.is_active
        or user.role not in ("intern", "it", "analyst", "admin")
        or user.token_version != claims["ver"]
    ):
        raise HTTPException(401, "Account unavailable or credentials changed")
    ```
  - Add reusable role dependency helper:
    ```python
    def require_roles(*roles: str):
        async def dependency(user: CurrentUser):
            if user.role not in roles:
                raise HTTPException(403, f"Operation requires role in {roles}")
            return user
        return dependency

    Admin = Annotated[User, Depends(require_roles("admin"))]
    AnalystOrAdmin = Annotated[User, Depends(require_roles("analyst", "admin"))]
    SupportOrAdmin = Annotated[User, Depends(require_roles("it", "admin"))]
    TechnicianRoles = Annotated[User, Depends(require_roles("intern", "it", "admin"))]
    AllStaff = Annotated[User, Depends(require_roles("intern", "it", "analyst", "admin"))]
    ```
  - In `backend/app/api/tickets.py`:
    - Enforce that `claim_ticket` requires `SupportOrAdmin`. If an `intern` or `analyst` calls `PATCH /tickets/{id}/claim`, return 403 Forbidden.
  - In `backend/app/api/reports.py`:
    - Change `report` endpoint from `admin: Admin` to `user: AnalystOrAdmin`. Both `admin` and `analyst` can view and stream reports.
- **Acceptance Criteria:** `analyst` can fetch `/reports/monthly-sla` (HTTP 200); `it` and `intern` are rejected with HTTP 403. `intern` cannot claim pool tickets (HTTP 403).

---

### Task B-05: Account Directory Governance & Soft Deactivation
- **File:** `backend/app/api/directory.py`
- **Actions:**
  - Verify `PATCH /admin/users/{user_id}`:
    - When `body.is_active is False`:
      - Set `user.is_active = False`.
      - Increment `user.token_version += 1`.
      - Write session revocation key to Redis:
        ```python
        await cache.set("revoked-user:" + str(user.id), "1", ex=86400 * 7)
        ```
      - Commit changes.
  - Update `PUT /admin/employees/{employee_id}`:
    - Ensure `is_active: bool = False` can be updated cleanly.
  - Allow `AnalystOrAdmin` to read `GET /admin/users` and `GET /admin/employees` for compliance audit and account approval verification.
- **Acceptance Criteria:** Deactivating a user terminates their active JWT tokens. Foreign keys on existing closed tickets remain intact without database integrity violations.

---

## 3. Backend Verification Checklist

- [ ] `0004_upgrade_to_4tier_rbac.py` applied to test and dev databases.
- [ ] Pytest test cases added:
  - Test role creation for `intern` and `analyst`.
  - Test `GET /tickets` returns newest tickets first.
  - Test `GET /reports/...` allows `analyst` and rejects `it` / `intern`.
  - Test claiming rejected for `intern`.
  - Test soft deactivation revokes token.
- [ ] Run test suite:
  ```powershell
  cd "C:\Users\Rain\Documents\Ominitick\Tiketa2.0\backend"
  pytest -v tests/
  ```
- [ ] Export OpenAPI schema:
  ```powershell
  python -c "import json; from app.main import app; print(json.dumps(app.openapi()))" > openapi.json
  ```
