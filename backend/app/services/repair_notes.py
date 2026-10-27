import uuid
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.orm import selectinload

from app.core.security import decrypt, encrypt
from app.models import (
    RepairNote,
    RepairNoteStep,
    TaskCategory,
    Ticket,
    TicketChecklist,
    TicketChecklistStep,
    User,
)
from app.schemas import (
    RepairNoteCreate,
    RepairNoteListResponse,
    RepairNoteOut,
    RepairNoteStepOut,
    RepairNoteUpdate,
    TicketChecklistApplyRequest,
    TicketChecklistOut,
    TicketChecklistStepCreate,
    TicketChecklistStepOut,
    TicketChecklistStepUpdate,
)


def now():
    return datetime.now(UTC)


def check_guide_edit_permission(user: User, note: RepairNote):
    if user.role == "admin":
        return True
    return note.author_id == user.id


def check_ticket_access(user: User, ticket: Ticket):
    if user.role == "admin":
        return True
    return ticket.assigned_tech_id == user.id


def check_ticket_prog(ticket: Ticket):
    if ticket.status != "PROG":
        raise HTTPException(
            409,
            f"Checklist operations are only permitted on tickets in PROG status; current status is {ticket.status}",
        )


async def get_repair_note_out(
    db, note: RepairNote, current_user: User, steps: list[RepairNoteStep] | None = None
) -> RepairNoteOut:
    task_cat = await db.get(TaskCategory, note.task_code)
    task_name = task_cat.name if task_cat else note.task_code
    author = await db.get(User, note.author_id)
    updated_by = await db.get(User, note.updated_by_id)
    source_ticket_code = None
    if note.source_ticket_id:
        st = await db.get(Ticket, note.source_ticket_id)
        if st:
            source_ticket_code = st.ticket_code

    try:
        symptom_and_fix = decrypt(note.symptom_and_fix_enc)
    except Exception:
        symptom_and_fix = "[Decryption Error]"

    if steps is None:
        steps_stmt = (
            select(RepairNoteStep)
            .where(RepairNoteStep.repair_note_id == note.id)
            .order_by(RepairNoteStep.position.asc())
        )
        steps = list((await db.execute(steps_stmt)).scalars().all())

    step_outs = []
    for s in steps:
        try:
            step_text = decrypt(s.text_enc)
        except Exception:
            step_text = "[Decryption Error]"
        step_outs.append(
            RepairNoteStepOut(
                id=s.id,
                position=s.position,
                text=step_text,
            )
        )

    return RepairNoteOut(
        id=note.id,
        title=note.title,
        task_code=note.task_code,
        task_name=task_name,
        symptom_and_fix=symptom_and_fix,
        author_id=note.author_id,
        author_name=author.full_name if author else "Unknown",
        updated_by_id=note.updated_by_id,
        updated_by_name=updated_by.full_name if updated_by else "Unknown",
        source_ticket_id=note.source_ticket_id,
        source_ticket_code=source_ticket_code,
        revision=note.revision,
        created_at=note.created_at,
        updated_at=note.updated_at,
        steps=step_outs,
        can_edit=check_guide_edit_permission(current_user, note),
    )


async def list_repair_notes(
    db,
    user: User,
    offset: int = 0,
    limit: int = 50,
    task_code: str | None = None,
    q: str | None = None,
) -> RepairNoteListResponse:
    query = select(RepairNote).order_by(
        RepairNote.updated_at.desc(), RepairNote.id.desc()
    )
    if task_code:
        query = query.where(RepairNote.task_code == task_code)

    if q and q.strip():
        search_term = q.strip().lower()
        result = await db.execute(query)
        candidates = result.scalars().all()

        matched_notes = []
        for note in candidates:
            task_cat = await db.get(TaskCategory, note.task_code)
            task_name = task_cat.name.lower() if task_cat else ""
            title_lower = note.title.lower()
            try:
                body_lower = decrypt(note.symptom_and_fix_enc).lower()
            except Exception:
                body_lower = ""

            steps_stmt = (
                select(RepairNoteStep)
                .where(RepairNoteStep.repair_note_id == note.id)
                .order_by(RepairNoteStep.position.asc())
            )
            note_steps = list((await db.execute(steps_stmt)).scalars().all())

            steps_match = False
            for s in note_steps:
                try:
                    if search_term in decrypt(s.text_enc).lower():
                        steps_match = True
                        break
                except Exception:
                    pass

            if (
                search_term in title_lower
                or search_term in task_name
                or search_term in body_lower
                or steps_match
            ):
                matched_notes.append((note, note_steps))

        total = len(matched_notes)
        paged_notes = matched_notes[offset : offset + limit]
        items = [
            await get_repair_note_out(db, n, user, steps=s) for n, s in paged_notes
        ]
        return RepairNoteListResponse(
            items=items,
            total=total,
            offset=offset,
            limit=limit,
        )

    # No text search query: database pagination
    total_query = select(func.count(RepairNote.id))
    if task_code:
        total_query = total_query.where(RepairNote.task_code == task_code)
    total = (await db.scalar(total_query)) or 0

    paged_query = query.offset(offset).limit(limit)
    res = await db.execute(paged_query)
    notes = res.scalars().all()
    items = [await get_repair_note_out(db, n, user) for n in notes]
    return RepairNoteListResponse(
        items=items,
        total=total,
        offset=offset,
        limit=limit,
    )


async def get_repair_note(db, note_id: uuid.UUID, user: User) -> RepairNoteOut:
    stmt = select(RepairNote).where(RepairNote.id == note_id)
    note = (await db.execute(stmt)).scalar_one_or_none()
    if not note:
        raise HTTPException(404, "Repair note not found")
    return await get_repair_note_out(db, note, user)


async def create_repair_note(
    db, payload: RepairNoteCreate, user: User
) -> RepairNoteOut:
    category = await db.get(TaskCategory, payload.task_code)
    if not category:
        raise HTTPException(422, f"Invalid task_code '{payload.task_code}'")

    if payload.source_ticket_id:
        st = await db.get(Ticket, payload.source_ticket_id)
        if not st:
            raise HTTPException(422, "Referenced source ticket does not exist")

    note = RepairNote(
        title=payload.title.strip(),
        task_code=payload.task_code,
        symptom_and_fix_enc=encrypt(payload.symptom_and_fix.strip()),
        author_id=user.id,
        updated_by_id=user.id,
        source_ticket_id=payload.source_ticket_id,
        revision=1,
    )
    db.add(note)
    await db.flush()

    for idx, step_text in enumerate(payload.steps):
        if step_text.strip():
            step = RepairNoteStep(
                repair_note_id=note.id,
                position=idx,
                text_enc=encrypt(step_text.strip()),
            )
            db.add(step)

    await db.commit()
    return await get_repair_note(db, note.id, user)


async def update_repair_note(
    db, note_id: uuid.UUID, payload: RepairNoteUpdate, user: User
) -> RepairNoteOut:
    stmt = (
        select(RepairNote)
        .where(RepairNote.id == note_id)
        .options(selectinload(RepairNote.steps))
        .with_for_update()
    )
    note = (await db.execute(stmt)).scalar_one_or_none()
    if not note:
        raise HTTPException(404, "Repair note not found")

    if not check_guide_edit_permission(user, note):
        raise HTTPException(403, "You do not have permission to edit this repair guide")

    if note.revision != payload.expected_revision:
        raise HTTPException(
            409,
            f"Conflict: guide revision is {note.revision}, expected {payload.expected_revision}",
        )

    if payload.task_code is not None:
        cat = await db.get(TaskCategory, payload.task_code)
        if not cat:
            raise HTTPException(422, f"Invalid task_code '{payload.task_code}'")
        note.task_code = payload.task_code

    if payload.title is not None:
        note.title = payload.title.strip()

    if payload.symptom_and_fix is not None:
        note.symptom_and_fix_enc = encrypt(payload.symptom_and_fix.strip())

    if payload.steps is not None:
        await db.execute(
            delete(RepairNoteStep).where(RepairNoteStep.repair_note_id == note.id)
        )
        await db.flush()
        for idx, step_text in enumerate(payload.steps):
            if step_text.strip():
                s = RepairNoteStep(
                    repair_note_id=note.id,
                    position=idx,
                    text_enc=encrypt(step_text.strip()),
                )
                db.add(s)

    note.revision += 1
    note.updated_by_id = user.id
    await db.commit()
    return await get_repair_note(db, note.id, user)


async def delete_repair_note(
    db, note_id: uuid.UUID, expected_revision: int, user: User
) -> None:
    stmt = select(RepairNote).where(RepairNote.id == note_id).with_for_update()
    note = (await db.execute(stmt)).scalar_one_or_none()
    if not note:
        raise HTTPException(404, "Repair note not found")

    if not check_guide_edit_permission(user, note):
        raise HTTPException(
            403, "You do not have permission to delete this repair guide"
        )

    if note.revision != expected_revision:
        raise HTTPException(
            409,
            f"Conflict: guide revision is {note.revision}, expected {expected_revision}",
        )

    await db.delete(note)
    await db.commit()


# =========================================================================
# TICKET CHECKLIST FUNCTIONS
# =========================================================================


async def get_ticket_checklist_out(
    db, checklist: TicketChecklist | None, ticket_id: uuid.UUID
) -> TicketChecklistOut:
    if not checklist:
        return TicketChecklistOut(ticket_id=ticket_id, revision=0, steps=[])

    task_name = None
    if checklist.guide_task_code_snapshot:
        cat = await db.get(TaskCategory, checklist.guide_task_code_snapshot)
        task_name = cat.name if cat else checklist.guide_task_code_snapshot

    applied_by_name = None
    if checklist.applied_by_id:
        ap_user = await db.get(User, checklist.applied_by_id)
        if ap_user:
            applied_by_name = ap_user.full_name

    guide_body = None
    if checklist.guide_body_enc:
        try:
            guide_body = decrypt(checklist.guide_body_enc)
        except Exception:
            guide_body = "[Decryption Error]"

    steps_stmt = (
        select(TicketChecklistStep)
        .where(TicketChecklistStep.checklist_id == checklist.id)
        .order_by(TicketChecklistStep.position.asc())
    )
    checklist_steps = (await db.execute(steps_stmt)).scalars().all()

    step_outs = []
    for s in checklist_steps:
        try:
            text = decrypt(s.text_enc)
        except Exception:
            text = "[Decryption Error]"
        cb_name = None
        if s.completed_by_id:
            cb_user = await db.get(User, s.completed_by_id)
            if cb_user:
                cb_name = cb_user.full_name

        step_outs.append(
            TicketChecklistStepOut(
                id=s.id,
                checklist_id=s.checklist_id,
                position=s.position,
                text=text,
                completed=s.completed,
                completed_at=s.completed_at,
                completed_by_id=s.completed_by_id,
                completed_by_name=cb_name,
                created_at=s.created_at,
                updated_at=s.updated_at,
            )
        )

    return TicketChecklistOut(
        id=checklist.id,
        ticket_id=checklist.ticket_id,
        source_repair_note_id=checklist.source_repair_note_id,
        source_revision=checklist.source_revision,
        guide_title_snapshot=checklist.guide_title_snapshot,
        guide_task_code_snapshot=checklist.guide_task_code_snapshot,
        guide_task_name_snapshot=task_name,
        guide_body=guide_body,
        applied_by_id=checklist.applied_by_id,
        applied_by_name=applied_by_name,
        applied_at=checklist.applied_at,
        created_by_id=checklist.created_by_id,
        updated_by_id=checklist.updated_by_id,
        revision=checklist.revision,
        created_at=checklist.created_at,
        updated_at=checklist.updated_at,
        steps=step_outs,
    )


async def get_ticket_checklist(
    db, ticket_id: uuid.UUID, user: User
) -> TicketChecklistOut:
    ticket = await db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(404, "Ticket not found")

    if not check_ticket_access(user, ticket):
        raise HTTPException(
            403, "You are not authorized to view this ticket's checklist"
        )

    stmt = select(TicketChecklist).where(TicketChecklist.ticket_id == ticket_id)
    checklist = (await db.execute(stmt)).scalar_one_or_none()
    return await get_ticket_checklist_out(db, checklist, ticket_id)


async def apply_repair_note_to_ticket(
    db, ticket_id: uuid.UUID, payload: TicketChecklistApplyRequest, user: User
) -> TicketChecklistOut:
    # 1. Lock Ticket
    ticket_stmt = select(Ticket).where(Ticket.id == ticket_id).with_for_update()
    ticket = (await db.execute(ticket_stmt)).scalar_one_or_none()
    if not ticket:
        raise HTTPException(404, "Ticket not found")

    if not check_ticket_access(user, ticket):
        raise HTTPException(
            403, "You are not authorized to manage this ticket's checklist"
        )

    check_ticket_prog(ticket)

    # 2. Lock Source Repair Note
    note_stmt = (
        select(RepairNote)
        .where(RepairNote.id == payload.repair_note_id)
        .options(selectinload(RepairNote.steps))
        .with_for_update()
    )
    note = (await db.execute(note_stmt)).scalar_one_or_none()
    if not note:
        raise HTTPException(404, "Repair note not found")

    if note.revision != payload.expected_note_revision:
        raise HTTPException(
            409,
            f"Conflict: source guide revision is {note.revision}, expected {payload.expected_note_revision}",
        )

    # 3. Check existing checklist
    cl_stmt = (
        select(TicketChecklist)
        .where(TicketChecklist.ticket_id == ticket_id)
        .options(selectinload(TicketChecklist.steps))
        .with_for_update()
    )
    checklist = (await db.execute(cl_stmt)).scalar_one_or_none()

    if checklist is not None:
        if not payload.replace_existing:
            raise HTTPException(
                409,
                "A checklist already exists for this ticket. Explicit replacement is required.",
            )
        if (
            payload.expected_checklist_revision is None
            or payload.expected_checklist_revision != checklist.revision
        ):
            raise HTTPException(
                409,
                f"Conflict: checklist revision is {checklist.revision}, expected {payload.expected_checklist_revision}",
            )
        # Delete existing steps atomically
        await db.execute(
            delete(TicketChecklistStep).where(
                TicketChecklistStep.checklist_id == checklist.id
            )
        )
        await db.flush()

        checklist.source_repair_note_id = note.id
        checklist.source_revision = note.revision
        checklist.guide_title_snapshot = note.title
        checklist.guide_task_code_snapshot = note.task_code
        checklist.guide_body_enc = note.symptom_and_fix_enc
        checklist.applied_by_id = user.id
        checklist.applied_at = now()
        checklist.updated_by_id = user.id
        checklist.revision += 1
    else:
        checklist = TicketChecklist(
            ticket_id=ticket.id,
            source_repair_note_id=note.id,
            source_revision=note.revision,
            guide_title_snapshot=note.title,
            guide_task_code_snapshot=note.task_code,
            guide_body_enc=note.symptom_and_fix_enc,
            applied_by_id=user.id,
            applied_at=now(),
            created_by_id=user.id,
            updated_by_id=user.id,
            revision=1,
        )
        db.add(checklist)
        await db.flush()

    # Copy template steps as independent ticket steps with completed=False
    for s in note.steps:
        step = TicketChecklistStep(
            checklist_id=checklist.id,
            position=s.position,
            text_enc=s.text_enc,
            completed=False,
            completed_at=None,
            completed_by_id=None,
        )
        db.add(step)

    await db.commit()
    return await get_ticket_checklist(db, ticket.id, user)


async def add_ticket_checklist_step(
    db, ticket_id: uuid.UUID, payload: TicketChecklistStepCreate, user: User
) -> TicketChecklistOut:
    ticket_stmt = select(Ticket).where(Ticket.id == ticket_id).with_for_update()
    ticket = (await db.execute(ticket_stmt)).scalar_one_or_none()
    if not ticket:
        raise HTTPException(404, "Ticket not found")

    if not check_ticket_access(user, ticket):
        raise HTTPException(
            403, "You are not authorized to update this ticket's checklist"
        )

    check_ticket_prog(ticket)

    cl_stmt = (
        select(TicketChecklist)
        .where(TicketChecklist.ticket_id == ticket_id)
        .options(selectinload(TicketChecklist.steps))
        .with_for_update()
    )
    checklist = (await db.execute(cl_stmt)).scalar_one_or_none()

    if not checklist:
        # Initial creation of manual checklist
        checklist = TicketChecklist(
            ticket_id=ticket.id,
            created_by_id=user.id,
            updated_by_id=user.id,
            revision=1,
        )
        db.add(checklist)
        await db.flush()
        next_pos = 0
    else:
        if checklist.revision != payload.expected_checklist_revision:
            raise HTTPException(
                409,
                f"Conflict: checklist revision is {checklist.revision}, expected {payload.expected_checklist_revision}",
            )
        pos_res = await db.scalar(
            select(func.coalesce(func.max(TicketChecklistStep.position) + 1, 0)).where(
                TicketChecklistStep.checklist_id == checklist.id
            )
        )
        next_pos = pos_res if pos_res is not None else 0
        checklist.revision += 1
        checklist.updated_by_id = user.id

    step = TicketChecklistStep(
        checklist_id=checklist.id,
        position=next_pos,
        text_enc=encrypt(payload.text.strip()),
        completed=False,
        completed_at=None,
        completed_by_id=None,
    )
    db.add(step)
    await db.commit()
    return await get_ticket_checklist(db, ticket.id, user)


async def update_ticket_checklist_step(
    db,
    ticket_id: uuid.UUID,
    step_id: uuid.UUID,
    payload: TicketChecklistStepUpdate,
    user: User,
) -> TicketChecklistOut:
    ticket_stmt = select(Ticket).where(Ticket.id == ticket_id).with_for_update()
    ticket = (await db.execute(ticket_stmt)).scalar_one_or_none()
    if not ticket:
        raise HTTPException(404, "Ticket not found")

    if not check_ticket_access(user, ticket):
        raise HTTPException(
            403, "You are not authorized to update this ticket's checklist"
        )

    check_ticket_prog(ticket)

    cl_stmt = (
        select(TicketChecklist)
        .where(TicketChecklist.ticket_id == ticket_id)
        .with_for_update()
    )
    checklist = (await db.execute(cl_stmt)).scalar_one_or_none()
    if not checklist:
        raise HTTPException(404, "Checklist not found for this ticket")

    if checklist.revision != payload.expected_checklist_revision:
        raise HTTPException(
            409,
            f"Conflict: checklist revision is {checklist.revision}, expected {payload.expected_checklist_revision}",
        )

    # Nested resource check: step MUST belong to this checklist
    step_stmt = (
        select(TicketChecklistStep)
        .where(
            TicketChecklistStep.id == step_id,
            TicketChecklistStep.checklist_id == checklist.id,
        )
        .with_for_update()
    )
    step = (await db.execute(step_stmt)).scalar_one_or_none()
    if not step:
        raise HTTPException(404, "Checklist step not found on this ticket")

    if payload.text is not None:
        step.text_enc = encrypt(payload.text.strip())

    if payload.completed is not None:
        if payload.completed is True:
            step.completed = True
            step.completed_at = now()
            step.completed_by_id = user.id
        else:
            step.completed = False
            step.completed_at = None
            step.completed_by_id = None

    checklist.revision += 1
    checklist.updated_by_id = user.id
    await db.commit()
    return await get_ticket_checklist(db, ticket.id, user)


async def delete_ticket_checklist_step(
    db,
    ticket_id: uuid.UUID,
    step_id: uuid.UUID,
    expected_checklist_revision: int,
    user: User,
) -> TicketChecklistOut:
    ticket_stmt = select(Ticket).where(Ticket.id == ticket_id).with_for_update()
    ticket = (await db.execute(ticket_stmt)).scalar_one_or_none()
    if not ticket:
        raise HTTPException(404, "Ticket not found")

    if not check_ticket_access(user, ticket):
        raise HTTPException(
            403, "You are not authorized to delete this ticket's checklist step"
        )

    check_ticket_prog(ticket)

    cl_stmt = (
        select(TicketChecklist)
        .where(TicketChecklist.ticket_id == ticket_id)
        .with_for_update()
    )
    checklist = (await db.execute(cl_stmt)).scalar_one_or_none()
    if not checklist:
        raise HTTPException(404, "Checklist not found for this ticket")

    if checklist.revision != expected_checklist_revision:
        raise HTTPException(
            409,
            f"Conflict: checklist revision is {checklist.revision}, expected {expected_checklist_revision}",
        )

    # Nested resource isolation: step must belong to this checklist
    step_stmt = (
        select(TicketChecklistStep)
        .where(
            TicketChecklistStep.id == step_id,
            TicketChecklistStep.checklist_id == checklist.id,
        )
        .with_for_update()
    )
    step = (await db.execute(step_stmt)).scalar_one_or_none()
    if not step:
        raise HTTPException(404, "Checklist step not found on this ticket")

    await db.delete(step)
    await db.flush()

    # Re-order remaining steps contiguously via two-pass offset to avoid unique constraint collisions
    steps_res = await db.execute(
        select(TicketChecklistStep)
        .where(TicketChecklistStep.checklist_id == checklist.id)
        .order_by(TicketChecklistStep.position.asc())
        .with_for_update()
    )
    remaining_steps = steps_res.scalars().all()
    for idx, s in enumerate(remaining_steps):
        s.position = 10000 + idx
    await db.flush()

    for idx, s in enumerate(remaining_steps):
        s.position = idx
    await db.flush()

    checklist.revision += 1
    checklist.updated_by_id = user.id
    await db.commit()
    return await get_ticket_checklist(db, ticket.id, user)
