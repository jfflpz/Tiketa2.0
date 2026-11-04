import secrets
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import func, select
from starlette.concurrency import run_in_threadpool

from app.api.deps import DB, Admin, CurrentUser
from app.core.cache import cache
from app.core.security import hash_password
from app.models import AccountRequest, Location, User
from app.schemas import (
    AccountRequestApprovalOut,
    AccountRequestCreate,
    AccountRequestOut,
    AccountRequestRejectInput,
    UserOut,
)

router = APIRouter(prefix="/account-requests", tags=["Account Requests"])


@router.post("", status_code=201, response_model=AccountRequestOut)
async def submit_account_request(body: AccountRequestCreate, db: DB, admin: Admin):
    """Admin proposes account creation or deactivation. Decisions reserved for Supervisor."""
    if body.request_type == "create":
        clean_username = body.username.strip().lower()  # type: ignore
        clean_email = str(body.email).strip().lower()

        # Check existing user
        existing_user = await db.scalar(
            select(User).where(
                (func.lower(User.username) == clean_username)
                | (func.lower(User.email) == clean_email)
            )
        )
        if existing_user:
            raise HTTPException(409, "A user with this username or email already exists")

        # Check existing pending create request
        pending_req = await db.scalar(
            select(AccountRequest).where(
                AccountRequest.status == "pending",
                AccountRequest.request_type == "create",
                (func.lower(AccountRequest.username) == clean_username)
                | (func.lower(AccountRequest.email) == clean_email),
            )
        )
        if pending_req:
            raise HTTPException(409, "A pending creation request with this username or email already exists")

        loc = None
        if body.location_id:
            loc = await db.get(Location, body.location_id)

        req = AccountRequest(
            request_type="create",
            username=clean_username,
            email=clean_email,
            full_name=body.full_name.strip(),  # type: ignore
            role=body.role,  # type: ignore
            location_id=body.location_id,
            department=body.department,
            requested_by_id=admin.id,
            status="pending",
        )
        db.add(req)
        await db.commit()
        await db.refresh(req)

        return AccountRequestOut(
            id=req.id,
            request_type="create",
            target_user_id=None,
            username=req.username,
            email=req.email,
            full_name=req.full_name,
            role=req.role,
            department=req.department,
            location_id=req.location_id,
            location_name=loc.name if loc else None,
            status="pending",
            requested_by_id=admin.id,
            requester_name=admin.full_name,
            created_at=req.created_at,
        )

    else:
        # request_type == 'deactivate'
        target = await db.get(User, body.target_user_id)
        if not target:
            raise HTTPException(404, "Target user for deactivation not found")
        if not target.is_active:
            raise HTTPException(409, "User is already deactivated")

        # Protect last active Admin and last active Supervisor
        if target.role == "admin":
            admin_count = await db.scalar(
                select(func.count()).select_from(User).where(User.role == "admin", User.is_active.is_(True))
            )
            if (admin_count or 0) <= 1:
                raise HTTPException(409, "Cannot deactivate the last active administrator")
        elif target.role == "supervisor":
            sup_count = await db.scalar(
                select(func.count()).select_from(User).where(User.role == "supervisor", User.is_active.is_(True))
            )
            if (sup_count or 0) <= 1:
                raise HTTPException(409, "Cannot deactivate the last active supervisor")

        # Check existing pending deactivation request for this user
        pending_deact = await db.scalar(
            select(AccountRequest).where(
                AccountRequest.status == "pending",
                AccountRequest.request_type == "deactivate",
                AccountRequest.target_user_id == target.id,
            )
        )
        if pending_deact:
            raise HTTPException(409, "A pending deactivation request for this user already exists")

        loc = await db.get(Location, target.location_id) if target.location_id else None

        req = AccountRequest(
            request_type="deactivate",
            target_user_id=target.id,
            username=target.username,
            email=target.email,
            full_name=target.full_name,
            role=target.role,
            location_id=target.location_id,
            requested_by_id=admin.id,
            status="pending",
        )
        db.add(req)
        await db.commit()
        await db.refresh(req)

        return AccountRequestOut(
            id=req.id,
            request_type="deactivate",
            target_user_id=target.id,
            username=req.username,
            email=req.email,
            full_name=req.full_name,
            role=req.role,
            department=None,
            location_id=req.location_id,
            location_name=loc.name if loc else None,
            status="pending",
            requested_by_id=admin.id,
            requester_name=admin.full_name,
            created_at=req.created_at,
        )


@router.get("", response_model=list[AccountRequestOut])
async def list_account_requests(
    db: DB,
    user: CurrentUser,
    status: str | None = None,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    if user.role not in ("admin", "supervisor"):
        raise HTTPException(403, "Insufficient role permissions to view account requests")

    query = select(AccountRequest).order_by(AccountRequest.created_at.desc())
    if status and status in ("pending", "approved", "rejected"):
        query = query.where(AccountRequest.status == status)

    query = query.offset(offset).limit(limit)
    rows = (await db.scalars(query)).all()

    req_ids = {r.requested_by_id for r in rows if r.requested_by_id}
    rev_ids = {r.reviewed_by_id for r in rows if r.reviewed_by_id}
    loc_ids = {r.location_id for r in rows if r.location_id}

    users_map = {}
    if req_ids | rev_ids:
        u_list = (await db.scalars(select(User).where(User.id.in_(req_ids | rev_ids)))).all()
        users_map = {u.id: u.full_name for u in u_list}

    locs_map = {}
    if loc_ids:
        l_list = (await db.scalars(select(Location).where(Location.id.in_(loc_ids)))).all()
        locs_map = {loc.id: loc.name for loc in l_list}

    return [
        AccountRequestOut(
            id=r.id,
            request_type=r.request_type,  # type: ignore
            target_user_id=r.target_user_id,
            username=r.username,
            email=r.email,
            full_name=r.full_name,
            role=r.role,
            department=r.department,
            location_id=r.location_id,
            location_name=locs_map.get(r.location_id),
            status=r.status,  # type: ignore
            rejection_reason=r.rejection_reason,
            requested_by_id=r.requested_by_id,
            requester_name=users_map.get(r.requested_by_id),
            reviewed_by_id=r.reviewed_by_id,
            reviewer_name=users_map.get(r.reviewed_by_id),
            reviewed_at=r.reviewed_at,
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.post("/{request_id}/approve", response_model=AccountRequestApprovalOut)
async def approve_account_request(request_id: UUID, db: DB, user: CurrentUser):
    if user.role != "supervisor":
        raise HTTPException(403, "Only supervisors can approve account requests")

    # Lock row to prevent concurrency race
    req = await db.scalar(
        select(AccountRequest).where(AccountRequest.id == request_id).with_for_update()
    )
    if not req:
        raise HTTPException(404, "Account request not found")
    if req.status != "pending":
        raise HTTPException(409, f"Cannot approve request with status '{req.status}'")

    if req.request_type == "create":
        temp_password = secrets.token_urlsafe(12)
        pwd_hash = await run_in_threadpool(hash_password, temp_password)

        new_user = User(
            username=req.username,
            email=req.email,
            full_name=req.full_name,
            role=req.role,
            location_id=req.location_id,
            password_hash=pwd_hash,
            is_active=True,
        )
        db.add(new_user)
        req.status = "approved"
        req.reviewed_by_id = user.id
        req.reviewed_at = datetime.now(UTC)

        await db.commit()
        await db.refresh(new_user)

        return AccountRequestApprovalOut(
            request_type="create",
            user=UserOut(
                id=new_user.id,
                username=new_user.username,
                email=new_user.email,
                full_name=new_user.full_name,
                role=new_user.role,  # type: ignore
                is_active=new_user.is_active,
            ),
            temporary_password=temp_password,
        )

    else:
        # Deactivation approval
        target = await db.get(User, req.target_user_id, with_for_update=True)
        if not target:
            raise HTTPException(404, "Target user not found")

        # Protect last active Admin and Supervisor
        if target.role == "admin":
            admin_count = await db.scalar(
                select(func.count()).select_from(User).where(User.role == "admin", User.is_active.is_(True))
            )
            if (admin_count or 0) <= 1:
                raise HTTPException(409, "Cannot deactivate the last active administrator")
        elif target.role == "supervisor":
            sup_count = await db.scalar(
                select(func.count()).select_from(User).where(User.role == "supervisor", User.is_active.is_(True))
            )
            if (sup_count or 0) <= 1:
                raise HTTPException(409, "Cannot deactivate the last active supervisor")

        target.is_active = False
        target.token_version += 1
        req.status = "approved"
        req.reviewed_by_id = user.id
        req.reviewed_at = datetime.now(UTC)

        await cache.set(f"revoked-user:{target.id}", "1", ex=86400 * 7)
        await db.commit()
        await db.refresh(target)

        return AccountRequestApprovalOut(
            request_type="deactivate",
            user=UserOut(
                id=target.id,
                username=target.username,
                email=target.email,
                full_name=target.full_name,
                role=target.role,  # type: ignore
                is_active=target.is_active,
            ),
            temporary_password=None,
        )


@router.post("/{request_id}/reject", response_model=AccountRequestOut)
async def reject_account_request(
    request_id: UUID,
    body: AccountRequestRejectInput,
    db: DB,
    user: CurrentUser,
):
    if user.role != "supervisor":
        raise HTTPException(403, "Only supervisors can reject account requests")

    req = await db.scalar(
        select(AccountRequest).where(AccountRequest.id == request_id).with_for_update()
    )
    if not req:
        raise HTTPException(404, "Account request not found")
    if req.status != "pending":
        raise HTTPException(409, f"Cannot reject request with status '{req.status}'")

    req.status = "rejected"
    req.rejection_reason = body.rejection_reason
    req.reviewed_by_id = user.id
    req.reviewed_at = datetime.now(UTC)

    await db.commit()
    await db.refresh(req)

    req_user = await db.get(User, req.requested_by_id)
    return AccountRequestOut(
        id=req.id,
        request_type=req.request_type,  # type: ignore
        target_user_id=req.target_user_id,
        username=req.username,
        email=req.email,
        full_name=req.full_name,
        role=req.role,
        department=req.department,
        location_id=req.location_id,
        status="rejected",
        rejection_reason=req.rejection_reason,
        requested_by_id=req.requested_by_id,
        requester_name=req_user.full_name if req_user else None,
        reviewed_by_id=user.id,
        reviewer_name=user.full_name,
        reviewed_at=req.reviewed_at,
        created_at=req.created_at,
    )