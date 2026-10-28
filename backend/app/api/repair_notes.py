from uuid import UUID

from fastapi import APIRouter, Query, Response, status

from app.api.deps import DB, CurrentUser
from app.schemas import (
    RepairNoteCreate,
    RepairNoteListResponse,
    RepairNoteOut,
    RepairNoteUpdate,
)
from app.services import repair_notes as service

router = APIRouter(prefix="/repair-notes", tags=["repair-notes"])


@router.get("", response_model=RepairNoteListResponse)
async def list_repair_notes(
    db: DB,
    user: CurrentUser,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    task_code: str | None = Query(None),
    q: str | None = Query(None),
):
    return await service.list_repair_notes(
        db, user=user, offset=offset, limit=limit, task_code=task_code, q=q
    )


@router.get("/{id}", response_model=RepairNoteOut)
async def get_repair_note(
    id: UUID,
    db: DB,
    user: CurrentUser,
):
    return await service.get_repair_note(db, note_id=id, user=user)


@router.post("", response_model=RepairNoteOut, status_code=status.HTTP_201_CREATED)
async def create_repair_note(
    payload: RepairNoteCreate,
    db: DB,
    user: CurrentUser,
):
    return await service.create_repair_note(db, payload=payload, user=user)


@router.patch("/{id}", response_model=RepairNoteOut)
async def update_repair_note(
    id: UUID,
    payload: RepairNoteUpdate,
    db: DB,
    user: CurrentUser,
):
    return await service.update_repair_note(db, note_id=id, payload=payload, user=user)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_repair_note(
    id: UUID,
    db: DB,
    user: CurrentUser,
    expected_revision: int = Query(..., gt=0),
):
    await service.delete_repair_note(
        db, note_id=id, expected_revision=expected_revision, user=user
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
