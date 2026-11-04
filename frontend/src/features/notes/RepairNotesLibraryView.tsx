// @spec FR-KNOW-01: Saved Repair Notes & Troubleshooting Checklists Library for IT Support
import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  CheckSquare,
  Edit3,
  Trash2,
  Save,
  X,
  Clock,
  User,
  AlertTriangle,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { TASK_CATEGORIES } from '../../constants/domain';
import type { TaskCategoryCode, SavedRepairNote } from '../../types/ticket';

export const RepairNotesLibraryView: React.FC = () => {
  const currentUser = useAppStore((state) => state.currentUser);
  const savedRepairNotes = useAppStore((state) => state.savedRepairNotes);
  const isLoadingNotes = useAppStore((state) => state.isLoadingNotes);
  const fetchSavedRepairNotes = useAppStore((state) => state.fetchSavedRepairNotes);
  const createSavedRepairNote = useAppStore((state) => state.createSavedRepairNote);
  const updateSavedRepairNote = useAppStore((state) => state.updateSavedRepairNote);
  const deleteSavedRepairNote = useAppStore((state) => state.deleteSavedRepairNote);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | TaskCategoryCode>('ALL');

  // Create / Edit Modal or Inline Form State
  const [isCreating, setIsCreating] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Dedicated custom delete confirmation modal state
  const [noteToDelete, setNoteToDelete] = useState<SavedRepairNote | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [titleDraft, setTitleDraft] = useState('');
  const [taskCodeDraft, setTaskCodeDraft] = useState<TaskCategoryCode>('PRN-TS');
  const [noteDraft, setNoteDraft] = useState('');
  const [stepsDraft, setStepsDraft] = useState<string[]>([
    'Verify terminal booth equipment and power connections',
    'Run diagnostic test and apply configuration fix',
  ]);
  const [newStepInput, setNewStepInput] = useState('');

  const isIntern = currentUser?.role === 'intern';

  // Fetch guides from API on initial load
  useEffect(() => {
    fetchSavedRepairNotes();
  }, [fetchSavedRepairNotes]);

  const filteredNotes = savedRepairNotes.filter((n) => {
    if (categoryFilter !== 'ALL' && n.taskCode !== categoryFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      n.title.toLowerCase().includes(q) ||
      n.taskName.toLowerCase().includes(q) ||
      n.symptomAndFixNote.toLowerCase().includes(q) ||
      n.checklistSteps.some((s) => s.toLowerCase().includes(q))
    );
  });

  const startCreateNew = () => {
    if (isIntern) return;
    setEditingNoteId(null);
    setTitleDraft('');
    setTaskCodeDraft('PRN-TS');
    setNoteDraft('');
    setStepsDraft([
      'Inspect physical hardware & booth power supply',
      'Apply troubleshooting fix and test operation',
    ]);
    setNewStepInput('');
    setIsCreating(true);
  };

  const startEditNote = (note: SavedRepairNote) => {
    setIsCreating(false);
    setEditingNoteId(note.id);
    setTitleDraft(note.title);
    setTaskCodeDraft(note.taskCode);
    setNoteDraft(note.symptomAndFixNote);
    setStepsDraft([...note.checklistSteps]);
    setNewStepInput('');
  };

  const cancelForm = () => {
    setIsCreating(false);
    setEditingNoteId(null);
  };

  const handleAddDraftStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStepInput.trim()) return;
    setStepsDraft((prev) => [...prev, newStepInput.trim()]);
    setNewStepInput('');
  };

  const handleRemoveDraftStep = (idx: number) => {
    setStepsDraft((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateDraftStepText = (idx: number, val: string) => {
    setStepsDraft((prev) => prev.map((s, i) => (i === idx ? val : s)));
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleDraft.trim() || !noteDraft.trim()) return;
    const cleanedSteps = stepsDraft.map((s) => s.trim()).filter(Boolean);

    setIsSaving(true);
    try {
      if (editingNoteId) {
        const currentNote = savedRepairNotes.find((n) => n.id === editingNoteId);
        await updateSavedRepairNote(editingNoteId, {
          expectedRevision: currentNote?.revision ?? 1,
          title: titleDraft.trim(),
          taskCode: taskCodeDraft,
          symptomAndFixNote: noteDraft.trim(),
          checklistSteps: cleanedSteps,
        });
      } else {
        await createSavedRepairNote({
          title: titleDraft.trim(),
          taskCode: taskCodeDraft,
          symptomAndFixNote: noteDraft.trim(),
          checklistSteps: cleanedSteps,
        });
      }
      cancelForm();
    } catch {
      // Failed writes retain drafts in the form fields!
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteNote = async () => {
    if (!noteToDelete) return;
    setIsDeleting(true);
    try {
      await deleteSavedRepairNote(noteToDelete.id, noteToDelete.revision);
      setNoteToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink tracking-tight">
            Saved Repair Notes &amp; Troubleshooting Checklists
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Browse stored repair guides, past fixes, and step-by-step troubleshooting checklists whenever you need a quick refresher.
          </p>
        </div>

        {!isIntern && (
          <button
            type="button"
            onClick={startCreateNew}
            className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors press-fx self-start"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Repair Note &amp; Checklist</span>
          </button>
        )}
      </div>

      {/* Create / Edit Saved Repair Note & Checklist Form */}
      {(isCreating || editingNoteId) && !isIntern && (
        <form
          onSubmit={handleSaveForm}
          className="bg-white border-2 border-orange-400 rounded-2xl p-5 shadow-md space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[#ECEEF2]">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-orange-500" />
              <h2 className="text-sm font-bold text-ink">
                {editingNoteId
                  ? 'Edit Saved Repair Note & Troubleshooting Checklist'
                  : 'Create New Repair Note & Troubleshooting Checklist'}
              </h2>
            </div>
            <button
              type="button"
              onClick={cancelForm}
              className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-ink"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left Column: Title, Category & Repair Note */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-ink mb-1">
                    Guide Title
                  </label>
                  <input
                    type="text"
                    required
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    placeholder="e.g. Epson TM-T82 Cutter Jam Reset"
                    className="w-full px-3 py-2 bg-[#F4F6F9] border border-[#ECEEF2] rounded-xl text-xs text-ink placeholder:text-zinc-400 focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Task Category
                  </label>
                  <select
                    value={taskCodeDraft}
                    onChange={(e) => setTaskCodeDraft(e.target.value as TaskCategoryCode)}
                    className="w-full px-3 py-2 bg-[#F4F6F9] border border-[#ECEEF2] rounded-xl text-xs font-semibold text-ink focus:outline-none focus:border-orange-500 focus:bg-white"
                  >
                    {TASK_CATEGORIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Symptom, Root Cause &amp; Technical Fix Note
                </label>
                <textarea
                  rows={5}
                  required
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Detail the exact troubleshooting symptoms, root cause, and how to verify the repair..."
                  className="w-full px-3 py-2 bg-[#F4F6F9] border border-[#ECEEF2] rounded-xl text-xs text-ink placeholder:text-zinc-400 focus:outline-none focus:border-orange-500 focus:bg-white leading-relaxed resize-none"
                />
              </div>
            </div>

            {/* Right Column: Step-by-Step SOP Checklist */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Standard Operating Procedures (SOP) Checklist Steps
                </label>
                <p className="text-[11px] text-zinc-500 mb-2">
                  Discrete procedural steps copied to tickets when this repair note is applied.
                </p>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {stepsDraft.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-[#F4F6F9] border border-[#ECEEF2] rounded-xl px-2.5 py-1.5"
                    >
                      <span className="font-mono text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={step}
                        onChange={(e) => handleUpdateDraftStepText(idx, e.target.value)}
                        className="flex-1 bg-transparent text-xs text-ink focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveDraftStep(idx)}
                        className="p-1 rounded text-zinc-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Remove step"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Step Input */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newStepInput}
                  onChange={(e) => setNewStepInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newStepInput.trim()) {
                        setStepsDraft((prev) => [...prev, newStepInput.trim()]);
                        setNewStepInput('');
                      }
                    }
                  }}
                  placeholder="Type next checklist step and press Enter..."
                  className="flex-1 px-3 py-1.5 bg-[#F4F6F9] border border-[#ECEEF2] rounded-xl text-xs text-ink placeholder:text-zinc-400 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddDraftStep}
                  disabled={!newStepInput.trim()}
                  className="px-3 py-1.5 rounded-xl bg-[#F4F6F9] hover:bg-zinc-200 text-ink border border-[#ECEEF2] text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Step</span>
                </button>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-[#ECEEF2] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={cancelForm}
              className="px-4 py-2 rounded-xl bg-white border border-[#ECEEF2] text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !titleDraft.trim() || !noteDraft.trim()}
              className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors press-fx"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : editingNoteId ? 'Update Guide' : 'Save Guide'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Search & Category Filter Bar */}
      <div className="bg-white border border-[#ECEEF2] rounded-2xl p-4 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved repair notes, symptoms, or checklist steps..."
            className="w-full pl-9 pr-4 py-2 bg-[#F4F6F9] border border-[#ECEEF2] rounded-xl text-xs text-ink placeholder:text-zinc-400 focus:outline-none focus:border-orange-400 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { code: 'ALL', label: `All Guides (${savedRepairNotes.length})` },
              { code: 'PRN-TS', label: 'Printer' },
              { code: 'SW-ASST', label: 'POS / Software' },
              { code: 'NET-CFG', label: 'Network' },
              { code: 'PC-HW-REP', label: 'PC Hardware' },
              { code: 'SRV-ASSESS', label: 'Server / UPS' },
            ] as const
          ).map((cat) => (
            <button
              key={cat.code}
              type="button"
              onClick={() => setCategoryFilter(cat.code)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all press-fx ${
                categoryFilter === cat.code
                  ? 'bg-[#111315] text-white shadow-xs'
                  : 'bg-[#F4F6F9] text-zinc-600 hover:text-ink border border-[#ECEEF2]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Saved Repair Notes & Checklists Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredNotes.map((note) => {
          const canManage =
            note.canEdit ??
            (currentUser?.role === 'admin' || (currentUser && note.authorId === currentUser.id));

          return (
            <div
              key={note.id}
              className="bg-white border border-[#ECEEF2] rounded-2xl p-5 shadow-card flex flex-col justify-between space-y-4 hover:border-orange-300 transition-all"
            >
              <div className="space-y-3">
                {/* Top Meta & Edit/Delete Actions */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-orange-50 text-orange-600 border border-orange-200/70">
                        {note.taskCode}
                      </span>
                      <span className="text-xs font-semibold text-zinc-500">
                        {note.taskName}
                      </span>
                      {note.revision && (
                        <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-[#F4F6F9] text-zinc-500 border border-[#ECEEF2]">
                          Rev {note.revision}
                        </span>
                      )}
                      {note.sourceTicketCode && (
                        <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-[#F4F6F9] text-zinc-500 border border-[#ECEEF2]">
                          From {note.sourceTicketCode}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-ink mt-1.5">
                      {note.title}
                    </h3>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEditNote(note)}
                        className="p-1.5 rounded-lg bg-[#F4F6F9] hover:bg-orange-50 text-zinc-500 hover:text-orange-600 border border-[#ECEEF2] transition-colors press-fx"
                        title="Edit Repair Note & Checklist"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setNoteToDelete(note)}
                        className="p-1.5 rounded-lg bg-[#F4F6F9] hover:bg-rose-50 text-zinc-500 hover:text-rose-600 border border-[#ECEEF2] transition-colors press-fx"
                        title="Delete Repair Note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Saved Repair Summary Note */}
                <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/70 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                    Saved Repair Note &amp; Root Cause Fix
                  </span>
                  <p className="text-xs text-ink leading-relaxed">
                    {note.symptomAndFixNote}
                  </p>
                </div>

                {/* Stored Troubleshooting Checklist */}
                <div className="bg-[#F4F6F9] border border-[#ECEEF2] rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-orange-500" />
                      <span>
                        Troubleshooting Checklist ({note.checklistSteps.length}{' '}
                        Steps)
                      </span>
                    </span>
                  </div>

                  <ol className="space-y-1.5 text-xs text-ink">
                    {note.checklistSteps.map((step, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 bg-white border border-[#ECEEF2] rounded-lg px-2.5 py-1.5"
                      >
                        <span className="font-mono text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded shrink-0">
                          {i + 1}
                        </span>
                        <span className="font-medium leading-snug">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* Card Footer: Author & Timestamp */}
              <div className="pt-3 border-t border-[#ECEEF2] flex items-center justify-between gap-2 text-[11px] text-zinc-400">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1 text-zinc-600 font-medium">
                    <User className="w-3.5 h-3.5 text-orange-500" />
                    {note.author}
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(note.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!isLoadingNotes && filteredNotes.length === 0 && (
        <div className="bg-white border border-[#ECEEF2] rounded-2xl p-8 text-center space-y-2">
          <BookOpen className="w-7 h-7 text-zinc-400 mx-auto" />
          <h3 className="text-sm font-bold text-ink">
            No Matching Saved Repair Notes Found
          </h3>
          <p className="text-xs text-zinc-500">
            Try clearing your search filter or click &ldquo;New Repair Note &amp; Checklist&rdquo; above.
          </p>
        </div>
      )}

      {/* Dedicated Custom Delete Confirmation Modal */}
      {noteToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-note-title"
        >
          <div
            className="fixed inset-0"
            onClick={() => !isDeleting && setNoteToDelete(null)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-md bg-white border border-[#ECEEF2] rounded-3xl p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 id="delete-note-title" className="text-sm font-bold text-ink truncate">
                  Delete Repair Note?
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  This action cannot be undone.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !isDeleting && setNoteToDelete(null)}
                className="p-1.5 rounded-xl hover:bg-zinc-100 text-zinc-400 hover:text-ink"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#ECEEF2] text-xs text-zinc-600 space-y-1.5 leading-relaxed">
              <p>
                Are you sure you want to permanently delete{' '}
                <strong className="text-ink font-bold">&ldquo;{noteToDelete.title}&rdquo;</strong>?
              </p>
              <p className="text-[11px] text-zinc-500">
                Any active or resolved tickets that have already copied this troubleshooting checklist will preserve their existing checklist steps.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setNoteToDelete(null)}
                className="px-4 py-2 rounded-xl bg-white border border-[#ECEEF2] text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors press-fx disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteNote}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all press-fx disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Note'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
