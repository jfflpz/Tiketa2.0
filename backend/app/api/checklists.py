from uuid import UUID

from fastapi import APIRouter, Query, status

from app.api.deps import DB, CurrentUser
from app.schemas import (
    TicketChecklistApplyRequest,
    TicketChecklistOut,
    TicketChecklistStepCreate,
    TicketChecklistStepUpdate,
)
from app.services import repair_notes as service

router = APIRouter(prefix="/tickets", tags=["checklists"])


@router.get("/{ticket_id}/checklist", response_model=TicketChecklistOut)
async def get_ticket_checklist(
    ticket_id: UUID,
    db: DB,
    user: CurrentUser,
):
    return await service.get_ticket_checklist(db, ticket_id=ticket_id, user=user)


@router.post("/{ticket_id}/checklist/apply", response_model=TicketChecklistOut)
async def apply_repair_note_to_ticket(
    ticket_id: UUID,
    payload: TicketChecklistApplyRequest,
    db: DB,
    user: CurrentUser,
):
    return await service.apply_repair_note_to_ticket(
        db, ticket_id=ticket_id, payload=payload, user=user
    )


@router.post(
    "/{ticket_id}/checklist/steps",
    response_model=TicketChecklistOut,
    status_code=status.HTTP_201_CREATED,
)
async def add_ticket_checklist_step(
    ticket_id: UUID,
    payload: TicketChecklistStepCreate,
    db: DB,
    user: CurrentUser,
):
    return await service.add_ticket_checklist_step(
        db, ticket_id=ticket_id, payload=payload, user=user
    )


@router.patch(
    "/{ticket_id}/checklist/steps/{step_id}", response_model=TicketChecklistOut
)
async def update_ticket_checklist_step(
    ticket_id: UUID,
    step_id: UUID,
    payload: TicketChecklistStepUpdate,
    db: DB,
    user: CurrentUser,
):
    return await service.update_ticket_checklist_step(
        db, ticket_id=ticket_id, step_id=step_id, payload=payload, user=user
    )


@router.delete(
    "/{ticket_id}/checklist/steps/{step_id}", response_model=TicketChecklistOut
)
async def delete_ticket_checklist_step(
    ticket_id: UUID,
    step_id: UUID,
    db: DB,
    user: CurrentUser,
    expected_checklist_revision: int = Query(..., gt=0),
):
    return await service.delete_ticket_checklist_step(
        db,
        ticket_id=ticket_id,
        step_id=step_id,
        expected_checklist_revision=expected_checklist_revision,
        user=user,
    )
