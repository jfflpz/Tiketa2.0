import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.ticket import Ticket
    from app.models.user import User


class RepairNote(Base, TimestampMixin):
    __tablename__ = "repair_notes"
    __table_args__ = (
        CheckConstraint("revision > 0", name="ck_repair_notes_revision"),
        CheckConstraint(
            "length(trim(title)) > 0", name="ck_repair_notes_title_nonblank"
        ),
        Index("ix_repair_notes_updated_id", "updated_at", "id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    task_code: Mapped[str] = mapped_column(
        ForeignKey("task_categories.code", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    symptom_and_fix_enc: Mapped[str] = mapped_column(Text, nullable=False)
    author_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    updated_by_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    source_ticket_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("tickets.id", ondelete="SET NULL"), nullable=True, index=True
    )
    revision: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    steps: Mapped[list["RepairNoteStep"]] = relationship(
        back_populates="repair_note",
        cascade="all, delete-orphan",
        order_by="RepairNoteStep.position",
        lazy="raise",
    )
    author: Mapped["User"] = relationship("User", foreign_keys=[author_id])
    updated_by: Mapped["User"] = relationship("User", foreign_keys=[updated_by_id])
    source_ticket: Mapped["Ticket"] = relationship(
        "Ticket", foreign_keys=[source_ticket_id]
    )


class RepairNoteStep(Base):
    __tablename__ = "repair_note_steps"
    __table_args__ = (
        CheckConstraint("position >= 0", name="ck_repair_note_steps_position"),
        UniqueConstraint("repair_note_id", "position", name="uq_repair_note_steps_pos"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    repair_note_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("repair_notes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    text_enc: Mapped[str] = mapped_column(Text, nullable=False)

    repair_note: Mapped["RepairNote"] = relationship(
        "RepairNote", back_populates="steps"
    )


class TicketChecklist(Base, TimestampMixin):
    __tablename__ = "ticket_checklists"
    __table_args__ = (
        CheckConstraint("revision > 0", name="ck_ticket_checklists_revision"),
        UniqueConstraint("ticket_id", name="uq_ticket_checklists_ticket"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tickets.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    source_repair_note_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("repair_notes.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    source_revision: Mapped[int | None] = mapped_column(Integer, nullable=True)
    guide_title_snapshot: Mapped[str | None] = mapped_column(String(200), nullable=True)
    guide_task_code_snapshot: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )
    guide_body_enc: Mapped[str | None] = mapped_column(Text, nullable=True)
    applied_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=True
    )
    applied_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    updated_by_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    revision: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    steps: Mapped[list["TicketChecklistStep"]] = relationship(
        back_populates="checklist",
        cascade="all, delete-orphan",
        order_by="TicketChecklistStep.position",
        lazy="raise",
    )
    ticket: Mapped["Ticket"] = relationship("Ticket", foreign_keys=[ticket_id])
    source_repair_note: Mapped["RepairNote"] = relationship(
        "RepairNote", foreign_keys=[source_repair_note_id]
    )
    applied_by: Mapped["User"] = relationship("User", foreign_keys=[applied_by_id])
    created_by: Mapped["User"] = relationship("User", foreign_keys=[created_by_id])
    updated_by: Mapped["User"] = relationship("User", foreign_keys=[updated_by_id])


class TicketChecklistStep(Base, TimestampMixin):
    __tablename__ = "ticket_checklist_steps"
    __table_args__ = (
        CheckConstraint("position >= 0", name="ck_ticket_checklist_steps_position"),
        CheckConstraint(
            "(completed = false AND completed_at IS NULL AND completed_by_id IS NULL) "
            "OR (completed = true AND completed_at IS NOT NULL AND completed_by_id IS NOT NULL)",
            name="ck_ticket_checklist_steps_completion",
        ),
        UniqueConstraint(
            "checklist_id", "position", name="uq_ticket_checklist_steps_pos"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    checklist_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ticket_checklists.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    text_enc: Mapped[str] = mapped_column(Text, nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=True
    )

    checklist: Mapped["TicketChecklist"] = relationship(
        "TicketChecklist", back_populates="steps"
    )
    completed_by: Mapped["User"] = relationship("User", foreign_keys=[completed_by_id])
