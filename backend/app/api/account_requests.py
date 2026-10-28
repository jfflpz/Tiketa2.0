import secrets
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.api.deps import DB, CurrentUser, SupervisorOrAdmin
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
async def submit_account_request(
    body: AccountRequestCreate, db: DB, user: CurrentUser
):
    if user.role not in ("it", "admin"):
        raise HTTPException(
            403, "Only IT Support and Administrators can submit account requests"
        )

    # Check for existing user or pending request
    existing_user = await db.scalar(
        select(User).where(
            (User.username == body.username) | (User.email == body.email)
        )
    )
    if existing_user:
        raise HTTPException(
            409, "A user with this username or email already exists"
        )

    pending_req = await db.scalar(
        select(AccountRequest).where(
            AccountRequest.status == "pending",
            (AccountRequest.username == body.username)
            | (AccountRequest.email == body.email),
        )
    )
    if pending_req:
        raise HTTPException(
            409, "A pending request with this username or email already exists"
        )

    loc = None
    if body.location_id:
        loc = await db.get(Location, body.location_id)

    req = AccountRequest(
        username=body.username.lower(),
        email=body.email.lower(),
        full_name=body.full_name,
        role=body.role,
        location_id=body.location_id,
        department=body.department,
        requested_by_id=user.id,
        status="pending",
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)

    return AccountRequestOut(
        id=req.id,
        username=req.username,
        email=req.email,
        full_name=req.full_name,
        role=req.role,
        department=req.department,
        location_id=req.location_id,
        location_name=loc.name if loc else None,
        status="pending",
        requested_by_id=user.id,
        requester_name=user.full_name,
        created_at=req.created_at,
    )


@router.get("", response_model=list[AccountRequestOut])
async def list_account_requests(db: DB, user: CurrentUser):
    if user.role == "intern":
        raise HTTPException(403, "Interns cannot view account requests")

    query = select(AccountRequest).order_by(AccountRequest.created_at.desc())
    # IT Support only sees their own submitted requests
    if user.role == "it":
        query = query.where(AccountRequest.requested_by_id == user.id)

    rows = (await db.scalars(query)).all()
    results = []
    for r in rows:
        loc = await db.get(Location, r.location_id) if r.location_id else None
        req_user = await db.get(User, r.requested_by_id)
        rev_user = await db.get(User, r.reviewed_by_id) if r.reviewed_by_id else None
        results.append(
            AccountRequestOut(
                id=r.id,
                username=r.username,
                email=r.email,
                full_name=r.full_name,
                role=r.role,
                department=r.department,
                location_id=r.location_id,
                location_name=loc.name if loc else None,
                status=r.status,  # type: ignore
                rejection_reason=r.rejection_reason,
                requested_by_id=r.requested_by_id,
                requester_name=req_user.full_name if req_user else None,
                reviewed_by_id=r.reviewed_by_id,
                reviewer_name=rev_user.full_name if rev_user else None,
                reviewed_at=r.reviewed_at,
                created_at=r.created_at,
            )
        )
    return results


@router.post("/{request_id}/approve", response_model=AccountRequestApprovalOut)
async def approve_account_request(
    request_id: UUID, db: DB, reviewer: SupervisorOrAdmin
):
    req = await db.get(AccountRequest, request_id)
    if not req:
        raise HTTPException(404, "Account request not found")
    if req.status != "pending":
        raise HTTPException(400, f"Cannot approve request with status '{req.status}'")

    # Generate single-use temporary password: 16 characters alphanumeric
    temp_password = secrets.token_urlsafe(12)

    new_user = User(
        username=req.username,
        email=req.email,
        full_name=req.full_name,
        role=req.role,
        location_id=req.location_id,
        password_hash=hash_password(temp_password),
        is_active=True,
    )
    db.add(new_user)

    req.status = "approved"
    req.reviewed_by_id = reviewer.id
    req.reviewed_at = datetime.now(UTC)

    await db.commit()
    await db.refresh(new_user)

    return AccountRequestApprovalOut(
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


@router.post("/{request_id}/reject", response_model=AccountRequestOut)
async def reject_account_request(
    request_id: UUID,
    body: AccountRequestRejectInput,
    db: DB,
    reviewer: SupervisorOrAdmin,
):
    req = await db.get(AccountRequest, request_id)
    if not req:
        raise HTTPException(404, "Account request not found")
    if req.status != "pending":
        raise HTTPException(400, f"Cannot reject request with status '{req.status}'")

    req.status = "rejected"
    req.rejection_reason = body.rejection_reason
    req.reviewed_by_id = reviewer.id
    req.reviewed_at = datetime.now(UTC)

    await db.commit()
    await db.refresh(req)

    req_user = await db.get(User, req.requested_by_id)
    return AccountRequestOut(
        id=req.id,
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
        reviewed_by_id=reviewer.id,
        reviewer_name=reviewer.full_name,
        reviewed_at=req.reviewed_at,
        created_at=req.created_at,
    )