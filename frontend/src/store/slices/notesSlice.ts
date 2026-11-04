import type { AppSliceCreator } from '../types';
import type {
  SavedRepairNote,
  TicketChecklist,
  TaskCategoryCode,
} from '../../types/ticket';
import {
  getRepairNotesApi,
  createRepairNoteApi,
  updateRepairNoteApi,
  deleteRepairNoteApi,
  getTicketChecklistApi,
  applyRepairNoteToTicketApi,
  addTicketChecklistStepApi,
  updateTicketChecklistStepApi,
  deleteTicketChecklistStepApi,
} from '../../api/repairNotes';

export interface NotesSlice {
  savedRepairNotes: SavedRepairNote[];
  savedRepairNotesTotal: number;
  isLoadingNotes: boolean;
  notesError: string | null;
  checklistsByTicketId: Record<string, TicketChecklist>;
  isLoadingChecklists: Record<string, boolean>;
  notesQuerySequence: number;

  // Library Actions
  fetchSavedRepairNotes: (params?: {
    offset?: number;
    limit?: number;
    task_code?: string;
    q?: string;
  }) => Promise<void>;
  createSavedRepairNote: (note: {
    title: string;
    taskCode: TaskCategoryCode;
    symptomAndFixNote: string;
    checklistSteps: string[];
    sourceTicketId?: string;
  }) => Promise<SavedRepairNote>;
  saveRepairNoteAndChecklist: (note: {
    title: string;
    taskCode: TaskCategoryCode;
    symptomAndFixNote: string;
    checklistSteps: string[];
    sourceTicketId?: string;
  }) => Promise<SavedRepairNote>;
  updateSavedRepairNote: (
    id: string,
    updates: {
      expectedRevision: number;
      title?: string;
      taskCode?: TaskCategoryCode;
      symptomAndFixNote?: string;
      checklistSteps?: string[];
    }
  ) => Promise<SavedRepairNote>;
  deleteSavedRepairNote: (id: string, expectedRevision: number) => Promise<void>;

  // Ticket Checklist Actions
  fetchTicketChecklist: (ticketId: string) => Promise<TicketChecklist | null>;
  applySavedNoteToTicket: (
    ticketId: string,
    noteId: string,
    expectedNoteRevision: number,
    replaceExisting?: boolean,
    expectedChecklistRevision?: number
  ) => Promise<TicketChecklist>;
  getTicketChecklist: (ticketId: string) => TicketChecklist | undefined;
  setTicketChecklistStepCompleted: (
    ticketId: string,
    stepId: string,
    completed: boolean,
    expectedChecklistRevision: number
  ) => Promise<void>;
  addTicketChecklistStep: (
    ticketId: string,
    text: string,
    expectedChecklistRevision?: number
  ) => Promise<void>;
  editTicketChecklistStep: (
    ticketId: string,
    stepId: string,
    newText: string,
    expectedChecklistRevision: number
  ) => Promise<void>;
  removeTicketChecklistStep: (
    ticketId: string,
    stepId: string,
    expectedChecklistRevision: number
  ) => Promise<void>;

  // Session & Boundary Controls
  resetNotesState: () => void;
}

export const createNotesSlice: AppSliceCreator<NotesSlice> = (set, get) => ({
  savedRepairNotes: [],
  savedRepairNotesTotal: 0,
  isLoadingNotes: false,
  notesError: null,
  checklistsByTicketId: {},
  isLoadingChecklists: {},
  notesQuerySequence: 0,

  resetNotesState: () => {
    set((state) => ({
      savedRepairNotes: [],
      savedRepairNotesTotal: 0,
      isLoadingNotes: false,
      notesError: null,
      checklistsByTicketId: {},
      isLoadingChecklists: {},
      notesQuerySequence: state.notesQuerySequence + 1,
    }));
  },

  fetchSavedRepairNotes: async (params) => {
    const seq = get().notesQuerySequence + 1;
    set({ isLoadingNotes: true, notesError: null, notesQuerySequence: seq });
    try {
      const data = await getRepairNotesApi(params);
      if (get().notesQuerySequence !== seq) {
        // Stale response from a previous query or after session reset
        return;
      }
      set({
        savedRepairNotes: data.items,
        savedRepairNotesTotal: data.total,
        isLoadingNotes: false,
      });
    } catch (err: unknown) {
      if (get().notesQuerySequence !== seq) return;
      const msg = err instanceof Error ? err.message : 'Failed to fetch repair notes library';
      set({ isLoadingNotes: false, notesError: msg });
      get().addToast('Library Load Error', msg, 'warning');
    }
  },

  createSavedRepairNote: async (note) => {
    try {
      const created = await createRepairNoteApi({
        title: note.title,
        task_code: note.taskCode,
        symptom_and_fix: note.symptomAndFixNote,
        steps: note.checklistSteps,
        source_ticket_id: note.sourceTicketId,
      });
      set((state) => ({
        savedRepairNotes: [created, ...state.savedRepairNotes],
        savedRepairNotesTotal: state.savedRepairNotesTotal + 1,
      }));
      get().addToast(
        'Saved to Repair Notes Library',
        `"${created.title}" stored with ${created.checklistSteps.length} checklist steps.`,
        'success'
      );
      return created;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save repair note';
      get().addToast('Save Failed', msg, 'warning');
      throw err;
    }
  },

  saveRepairNoteAndChecklist: async (note) => {
    return get().createSavedRepairNote(note);
  },

  updateSavedRepairNote: async (id, updates) => {
    try {
      const updated = await updateRepairNoteApi(id, {
        expected_revision: updates.expectedRevision,
        title: updates.title,
        task_code: updates.taskCode,
        symptom_and_fix: updates.symptomAndFixNote,
        steps: updates.checklistSteps,
      });
      set((state) => ({
        savedRepairNotes: state.savedRepairNotes.map((n) =>
          n.id === id ? updated : n
        ),
      }));
      get().addToast(
        'Repair Note Updated',
        `"${updated.title}" updated successfully (Rev ${updated.revision}).`,
        'success'
      );
      return updated;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update repair note';
      get().addToast('Update Failed', msg, 'warning');
      throw err;
    }
  },

  deleteSavedRepairNote: async (id, expectedRevision) => {
    try {
      await deleteRepairNoteApi(id, expectedRevision);
      set((state) => ({
        savedRepairNotes: state.savedRepairNotes.filter((n) => n.id !== id),
        savedRepairNotesTotal: Math.max(0, state.savedRepairNotesTotal - 1),
      }));
      get().addToast('Repair Note Removed', 'Guide deleted from library.', 'info');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete repair note';
      get().addToast('Delete Failed', msg, 'warning');
      throw err;
    }
  },

  fetchTicketChecklist: async (ticketId) => {
    set((state) => ({
      isLoadingChecklists: { ...state.isLoadingChecklists, [ticketId]: true },
    }));
    try {
      const checklist = await getTicketChecklistApi(ticketId);
      set((state) => ({
        checklistsByTicketId: {
          ...state.checklistsByTicketId,
          [ticketId]: checklist,
        },
        isLoadingChecklists: {
          ...state.isLoadingChecklists,
          [ticketId]: false,
        },
      }));
      return checklist;
    } catch (err: unknown) {
      set((state) => ({
        isLoadingChecklists: {
          ...state.isLoadingChecklists,
          [ticketId]: false,
        },
      }));
      return null;
    }
  },

  getTicketChecklist: (ticketId) => {
    return get().checklistsByTicketId[ticketId];
  },

  applySavedNoteToTicket: async (
    ticketId,
    noteId,
    expectedNoteRevision,
    replaceExisting = false,
    expectedChecklistRevision
  ) => {
    try {
      const checklist = await applyRepairNoteToTicketApi(ticketId, {
        repair_note_id: noteId,
        expected_note_revision: expectedNoteRevision,
        replace_existing: replaceExisting,
        expected_checklist_revision: expectedChecklistRevision,
      });
      set((state) => ({
        checklistsByTicketId: {
          ...state.checklistsByTicketId,
          [ticketId]: checklist,
        },
      }));
      get().addToast(
        'Applied Repair Guide',
        `Applied "${checklist.guideTitleSnapshot ?? 'Guide'}" with ${checklist.steps.length} steps to active ticket.`,
        'success'
      );
      return checklist;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to apply repair guide to ticket';
      get().addToast('Apply Guide Failed', msg, 'warning');
      // Refresh checklist in case of conflict
      get().fetchTicketChecklist(ticketId);
      throw err;
    }
  },

  setTicketChecklistStepCompleted: async (
    ticketId,
    stepId,
    completed,
    expectedChecklistRevision
  ) => {
    try {
      const updated = await updateTicketChecklistStepApi(ticketId, stepId, {
        expected_checklist_revision: expectedChecklistRevision,
        completed,
      });
      set((state) => ({
        checklistsByTicketId: {
          ...state.checklistsByTicketId,
          [ticketId]: updated,
        },
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update step completion';
      get().addToast('Step Update Failed', msg, 'warning');
      get().fetchTicketChecklist(ticketId);
      throw err;
    }
  },

  addTicketChecklistStep: async (
    ticketId,
    text,
    expectedChecklistRevision
  ) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      const updated = await addTicketChecklistStepApi(ticketId, {
        expected_checklist_revision: expectedChecklistRevision,
        text: trimmed,
      });
      set((state) => ({
        checklistsByTicketId: {
          ...state.checklistsByTicketId,
          [ticketId]: updated,
        },
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add checklist step';
      get().addToast('Add Step Failed', msg, 'warning');
      get().fetchTicketChecklist(ticketId);
      throw err;
    }
  },

  editTicketChecklistStep: async (
    ticketId,
    stepId,
    newText,
    expectedChecklistRevision
  ) => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    try {
      const updated = await updateTicketChecklistStepApi(ticketId, stepId, {
        expected_checklist_revision: expectedChecklistRevision,
        text: trimmed,
      });
      set((state) => ({
        checklistsByTicketId: {
          ...state.checklistsByTicketId,
          [ticketId]: updated,
        },
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to edit checklist step';
      get().addToast('Edit Step Failed', msg, 'warning');
      get().fetchTicketChecklist(ticketId);
      throw err;
    }
  },

  removeTicketChecklistStep: async (
    ticketId,
    stepId,
    expectedChecklistRevision
  ) => {
    try {
      const updated = await deleteTicketChecklistStepApi(
        ticketId,
        stepId,
        expectedChecklistRevision
      );
      set((state) => ({
        checklistsByTicketId: {
          ...state.checklistsByTicketId,
          [ticketId]: updated,
        },
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete checklist step';
      get().addToast('Delete Step Failed', msg, 'warning');
      get().fetchTicketChecklist(ticketId);
      throw err;
    }
  },
});
