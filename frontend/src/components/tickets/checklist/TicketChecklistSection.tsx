import React, { useEffect, useState } from 'react';
import {
  CheckSquare,
  Plus,
  BookOpen,
  Trash2,
  Edit2,
  Check,
  X,
  AlertTriangle,
  RotateCcw,
  Search,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import type { TaskCategoryCode, TicketStatus } from '../../../types/ticket';
import { TASK_CATEGORIES } from '../../../constants/domain';

export interface TicketChecklistSectionProps {
  ticketId: string;
  ticketStatus: TicketStatus;
  ticketTaskCode: TaskCategoryCode;
  compact?: boolean;
}

export const TicketChecklistSection: React.FC<TicketChecklistSectionProps> = ({
  ticketId,
  ticketStatus,
  ticketTaskCode,
  compact = false,
}) => {
  const checklistsByTicketId = useAppStore((state) => state.checklistsByTicketId);
  const isLoadingChecklists = useAppStore((state) => state.isLoadingChecklists);
  const fetchTicketChecklist = useAppStore((state) => state.fetchTicketChecklist);
  const setTicketChecklistStepCompleted = useAppStore(
    (state) => state.setTicketChecklistStepCompleted
  );
  const addTicketChecklistStep = useAppStore((state) => state.addTicketChecklistStep);
  const editTicketChecklistStep = useAppStore((state) => state.editTicketChecklistStep);
  const removeTicketChecklistStep = useAppStore(
    (state) => state.removeTicketChecklistStep
  );
  const applySavedNoteToTicket = useAppStore((state) => state.applySavedNoteToTicket);

  const savedRepairNotes = useAppStore((state) => state.savedRepairNotes);
  const fetchSavedRepairNotes = useAppStore((state) => state.fetchSavedRepairNotes);
  const setActiveView = useAppStore((state) => state.setActiveView);

  const checklist = checklistsByTicketId[ticketId];
  const isLoading = isLoadingChecklists[ticketId];
  const isEditable = ticketStatus === 'PROG';

  // Inline Step Editing State
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingStepText, setEditingStepText] = useState('');

  // Add Step Form
  const [newStepText, setNewStepText] = useState('');

  // Apply Guide Modal State
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [guideSearch, setGuideSearch] = useState('');
  const [guideCategoryFilter, setGuideCategoryFilter] = useState<string>('ALL');
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);
  const [confirmReplaceOpen, setConfirmReplaceOpen] = useState(false);
  const [isSubmittingApply, setIsSubmittingApply] = useState(false);

  useEffect(() => {
    fetchTicketChecklist(ticketId);
  }, [ticketId, fetchTicketChecklist]);

  const steps = checklist?.steps ?? [];
  const totalSteps = steps.length;
  const completedSteps = steps.filter((s) => s.completed).length;
  const progressPercent =
    totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  // Toggle step completion
  const handleToggle = async (stepId: string, currentVal: boolean) => {
    if (!isEditable || !checklist) return;
    await setTicketChecklistStepCompleted(
      ticketId,
      stepId,
      !currentVal,
      checklist.revision
    );
  };

  // Add Step
  const handleAddStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditable || !newStepText.trim()) return;
    const txt = newStepText.trim();
    setNewStepText('');
    await addTicketChecklistStep(ticketId, txt, checklist?.revision);
  };

  // Edit Step
  const startEditing = (stepId: string, text: string) => {
    if (!isEditable) return;
    setEditingStepId(stepId);
    setEditingStepText(text);
  };

  const cancelEditing = () => {
    setEditingStepId(null);
    setEditingStepText('');
  };

  const handleSaveStepEdit = async (stepId: string) => {
    if (!isEditable || !checklist || !editingStepText.trim()) return;
    const textToSave = editingStepText.trim();
    cancelEditing();
    await editTicketChecklistStep(ticketId, stepId, textToSave, checklist.revision);
  };

  // Delete Step
  const handleDeleteStep = async (stepId: string) => {
    if (!isEditable || !checklist) return;
    await removeTicketChecklistStep(ticketId, stepId, checklist.revision);
  };

  // Open Apply Guide Modal
  const handleOpenApplyModal = () => {
    if (!isEditable) return;
    setSelectedGuideId(null);
    setConfirmReplaceOpen(false);
    setGuideCategoryFilter(ticketTaskCode);
    setIsApplyModalOpen(true);
    if (savedRepairNotes.length === 0) {
      fetchSavedRepairNotes();
    }
  };

  // Perform Apply Guide
  const handleSelectAndApplyGuide = async (guideId: string) => {
    setSelectedGuideId(guideId);
    const hasExistingContent =
      Boolean(checklist?.guideTitleSnapshot) || (checklist?.steps.length ?? 0) > 0;

    if (hasExistingContent) {
      setConfirmReplaceOpen(true);
    } else {
      await executeApplyGuide(guideId, false);
    }
  };

  const executeApplyGuide = async (guideId: string, replaceExisting: boolean) => {
    const guide = savedRepairNotes.find((g) => g.id === guideId);
    if (!guide) return;
    setIsSubmittingApply(true);
    try {
      await applySavedNoteToTicket(
        ticketId,
        guide.id,
        guide.revision,
        replaceExisting,
        checklist?.revision
      );
      setIsApplyModalOpen(false);
      setConfirmReplaceOpen(false);
      setSelectedGuideId(null);
    } catch {
      // Error toast already raised in store action
    } finally {
      setIsSubmittingApply(false);
    }
  };

  const filteredGuides = savedRepairNotes.filter((g) => {
    if (guideCategoryFilter !== 'ALL' && g.taskCode !== guideCategoryFilter) return false;
    const q = guideSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      g.title.toLowerCase().includes(q) ||
      g.taskName.toLowerCase().includes(q) ||
      g.symptomAndFixNote.toLowerCase().includes(q)
    );
  });

  return (
    <div
      className={`space-y-3.5 bg-canvas border border-line rounded-2xl shadow-2xs ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-line">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0">
            <CheckSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-ink flex items-center gap-2">
              <span>Standard Operating Procedures (SOP) Checklist</span>
              {totalSteps > 0 && (
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
                  {completedSteps}/{totalSteps} ({progressPercent}%)
                </span>
              )}
            </h3>
            <p className="text-[11px] text-ink-subtle">
              Track discrete diagnostic checks and repair benchmarks.
            </p>
          </div>
        </div>

        {isEditable && (
          <button
            type="button"
            onClick={handleOpenApplyModal}
            className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-colors press-fx"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Apply Saved Guide</span>
          </button>
        )}
      </div>

      {/* Non-PROG Status Notice */}
      {!isEditable && (
        <div className="px-3 py-2 rounded-xl bg-zinc-100 border border-zinc-200/80 flex items-center gap-2 text-xs text-zinc-600">
          <ShieldAlert className="w-4 h-4 text-zinc-400 shrink-0" />
          <span>
            Checklist is read-only. Steps can only be checked or modified when ticket is in <strong>PROG</strong> status.
          </span>
        </div>
      )}

      {/* Applied Guide Snapshot Banner */}
      {checklist?.guideTitleSnapshot && (
        <div className="p-3.5 rounded-xl bg-orange-500/5 border border-orange-200/80 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-orange-200 text-orange-700">
                {checklist.guideTaskCodeSnapshot}
              </span>
              <h4 className="text-xs font-bold text-ink">
                {checklist.guideTitleSnapshot}
              </h4>
            </div>
            {checklist.sourceRevision && (
              <span className="text-[10px] font-mono text-zinc-400">
                Guide Rev {checklist.sourceRevision}
              </span>
            )}
          </div>

          {checklist.guideBody && (
            <p className="text-[11px] text-zinc-600 leading-relaxed bg-white/70 p-2.5 rounded-lg border border-orange-100">
              {checklist.guideBody}
            </p>
          )}

          <div className="text-[10px] text-zinc-400 flex items-center justify-between pt-1">
            <span>
              Applied by {checklist.appliedByName ?? 'Technician'}
              {checklist.appliedAt ? ` • ${new Date(checklist.appliedAt).toLocaleDateString()}` : ''}
            </span>
            <span className="italic">Snapshot preserved on ticket</span>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {totalSteps > 0 && (
        <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Steps List */}
      <div className="space-y-1.5">
        {isLoading && steps.length === 0 ? (
          <div className="py-6 text-center text-xs text-zinc-400">
            Loading checklist...
          </div>
        ) : steps.length === 0 ? (
          <div className="py-6 text-center rounded-xl border border-dashed border-line bg-surface p-4 space-y-1 text-zinc-400">
            <CheckSquare className="w-5 h-5 mx-auto text-zinc-300" />
            <p className="text-xs font-medium text-zinc-500">No checklist steps yet</p>
            <p className="text-[11px]">
              Apply a saved guide from the library or add discrete steps below.
            </p>
          </div>
        ) : (
          steps.map((step) => {
            const isEditing = editingStepId === step.id;

            return (
              <div
                key={step.id}
                className={`group flex items-start gap-2.5 p-2.5 rounded-xl border transition-all ${
                  step.completed
                    ? 'bg-emerald-50/40 border-emerald-200/60'
                    : 'bg-surface border-line hover:border-zinc-300'
                }`}
              >
                {/* Checkbox */}
                <button
                  type="button"
                  disabled={!isEditable}
                  onClick={() => handleToggle(step.id, step.completed)}
                  className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                    step.completed
                      ? 'bg-emerald-500 border-emerald-600 text-white'
                      : isEditable
                      ? 'border-zinc-300 hover:border-orange-500 bg-white'
                      : 'border-zinc-200 bg-zinc-100 cursor-not-allowed'
                  }`}
                >
                  {step.completed && <Check className="w-3 h-3 stroke-[3]" />}
                </button>

                {/* Step Text or Inline Edit */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={editingStepText}
                        onChange={(e) => setEditingStepText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveStepEdit(step.id);
                          if (e.key === 'Escape') cancelEditing();
                        }}
                        autoFocus
                        className="flex-1 px-2.5 py-1 text-xs bg-white border border-orange-400 rounded-lg text-ink focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveStepEdit(step.id)}
                        className="p-1 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-xs"
                        title="Save"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="p-1 rounded-md bg-zinc-200 hover:bg-zinc-300 text-zinc-700 text-xs"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <span
                        className={`text-xs block break-words ${
                          step.completed
                            ? 'line-through text-zinc-400'
                            : 'text-ink font-medium'
                        }`}
                      >
                        {step.text}
                      </span>
                      {step.completed && step.completedByName && (
                        <span className="text-[10px] text-emerald-700/80 block mt-0.5">
                          ✓ Completed by {step.completedByName}
                          {step.completedAt
                            ? ` at ${new Date(step.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                            : ''}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Action buttons (only when editable and not editing) */}
                {isEditable && !isEditing && (
                  <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 flex items-center gap-1 shrink-0 transition-opacity">
                    <button
                      type="button"
                      onClick={() => startEditing(step.id, step.text)}
                      className="p-1 rounded hover:bg-zinc-100 text-zinc-400 hover:text-ink"
                      title="Edit step text"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteStep(step.id)}
                      className="p-1 rounded hover:bg-rose-50 text-zinc-400 hover:text-rose-600"
                      title="Delete step"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add New Step Form (PROG tickets only) */}
      {isEditable && (
        <form onSubmit={handleAddStep} className="flex gap-2 pt-1">
          <input
            type="text"
            placeholder="Add a custom troubleshooting step..."
            value={newStepText}
            onChange={(e) => setNewStepText(e.target.value)}
            className="flex-1 px-3 py-1.5 bg-surface border border-line rounded-xl text-xs text-ink placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500"
          />
          <button
            type="submit"
            disabled={!newStepText.trim()}
            className="px-3 py-1.5 rounded-xl bg-surface hover:bg-zinc-100 disabled:opacity-50 text-ink border border-line text-xs font-semibold inline-flex items-center gap-1 transition-colors press-fx"
          >
            <Plus className="w-3.5 h-3.5 text-ink-subtle" />
            <span>Add Step</span>
          </button>
        </form>
      )}

      {/* ===================================================================== */}
      {/* APPLY SAVED GUIDE MODAL */}
      {/* ===================================================================== */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-[#ECEEF2] rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#ECEEF2]">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-orange-500" />
                <h3 className="text-sm font-bold text-ink">
                  Apply Saved Repair Guide to Ticket
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsApplyModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-ink hover:bg-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Bar */}
            <div className="p-4 border-b border-[#ECEEF2] bg-[#F4F6F9] space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search guides by title, category, or symptoms..."
                  value={guideSearch}
                  onChange={(e) => setGuideSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-line rounded-xl text-xs text-ink placeholder:text-zinc-400 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setGuideCategoryFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                    guideCategoryFilter === 'ALL'
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-line'
                  }`}
                >
                  All ({savedRepairNotes.length})
                </button>
                {TASK_CATEGORIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setGuideCategoryFilter(c.code)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                      guideCategoryFilter === c.code
                        ? 'bg-orange-500 text-white'
                        : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-line'
                    }`}
                  >
                    {c.code}
                  </button>
                ))}
              </div>
            </div>

            {/* Guides List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-zinc-100">
              {filteredGuides.length === 0 ? (
                <div className="py-12 text-center text-zinc-400 space-y-2">
                  <BookOpen className="w-8 h-8 mx-auto text-zinc-300" />
                  <p className="text-xs font-semibold text-zinc-600">
                    No matching saved guides found
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsApplyModalOpen(false);
                      setActiveView('notes');
                    }}
                    className="text-xs text-orange-600 hover:underline font-bold inline-flex items-center gap-1"
                  >
                    <span>Create a new guide in Library</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                filteredGuides.map((guide) => (
                  <div
                    key={guide.id}
                    className="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl hover:bg-orange-50/50 border border-transparent hover:border-orange-200 transition-all"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-700">
                          {guide.taskCode}
                        </span>
                        <h4 className="text-xs font-bold text-ink truncate">
                          {guide.title}
                        </h4>
                      </div>
                      <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">
                        {guide.symptomAndFixNote}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-zinc-400">
                        <span>{guide.checklistSteps.length} SOP steps</span>
                        <span>•</span>
                        <span>By {guide.author}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isSubmittingApply}
                      onClick={() => handleSelectAndApplyGuide(guide.id)}
                      className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold shrink-0 inline-flex items-center gap-1 self-start sm:self-center shadow-xs transition-colors press-fx"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Select Guide</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-[#ECEEF2] bg-[#F4F6F9] flex items-center justify-between text-xs">
              <span className="text-[11px] text-zinc-400">
                Applying copies guide snapshots and steps independently.
              </span>
              <button
                type="button"
                onClick={() => setIsApplyModalOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-white border border-line text-xs font-semibold text-ink hover:bg-zinc-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* REPLACEMENT WARNING DIALOG */}
      {/* ===================================================================== */}
      {confirmReplaceOpen && selectedGuideId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border-2 border-rose-500/80 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-ink">
                  Replace Existing Ticket Checklist?
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  This ticket already has an active checklist with{' '}
                  <strong>{checklist?.steps.length ?? 0} steps</strong>
                  {checklist?.guideTitleSnapshot ? (
                    <>
                      {' '}from applied guide &ldquo;
                      <span className="font-semibold">{checklist.guideTitleSnapshot}</span>
                      &rdquo;
                    </>
                  ) : null}
                  .
                </p>
                <p className="text-xs text-rose-600 font-semibold pt-1">
                  Applying a new guide will replace the current checklist steps and reset completed checkboxes.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100">
              <button
                type="button"
                disabled={isSubmittingApply}
                onClick={() => setConfirmReplaceOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-surface border border-line text-xs font-semibold text-ink hover:bg-zinc-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingApply}
                onClick={() => executeApplyGuide(selectedGuideId, true)}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors press-fx"
              >
                {isSubmittingApply ? (
                  <span>Replacing...</span>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Confirm Replace</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
