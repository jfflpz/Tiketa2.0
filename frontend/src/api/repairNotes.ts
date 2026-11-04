import { apiClient } from './client';
import type {
  SavedRepairNote,
  TicketChecklist,
  TicketChecklistStep,
  TaskCategoryCode,
} from '../types/ticket';

export interface BackendRepairNoteStepOut {
  id: string;
  position: number;
  text: string;
}

export interface BackendRepairNoteOut {
  id: string;
  title: string;
  task_code: string;
  task_name: string;
  symptom_and_fix: string;
  author_id: string;
  author_name: string;
  updated_by_id: string;
  updated_by_name: string;
  source_ticket_id: string | null;
  source_ticket_code: string | null;
  revision: number;
  created_at: string;
  updated_at: string;
  steps: BackendRepairNoteStepOut[];
  can_edit: boolean;
}

export interface BackendRepairNoteListResponse {
  items: BackendRepairNoteOut[];
  total: number;
  offset: number;
  limit: number;
}

export interface BackendTicketChecklistStepOut {
  id: string;
  checklist_id: string;
  position: number;
  text: string;
  completed: boolean;
  completed_at: string | null;
  completed_by_id: string | null;
  completed_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackendTicketChecklistOut {
  id: string | null;
  ticket_id: string;
  source_repair_note_id: string | null;
  source_revision: number | null;
  guide_title_snapshot: string | null;
  guide_task_code_snapshot: string | null;
  guide_task_name_snapshot: string | null;
  guide_body: string | null;
  applied_by_id: string | null;
  applied_by_name: string | null;
  applied_at: string | null;
  created_by_id: string | null;
  updated_by_id: string | null;
  revision: number;
  created_at: string | null;
  updated_at: string | null;
  steps: BackendTicketChecklistStepOut[];
}

export const mapBackendRepairNote = (b: BackendRepairNoteOut): SavedRepairNote => ({
  id: b.id,
  title: b.title,
  taskCode: b.task_code as TaskCategoryCode,
  taskName: b.task_name,
  symptomAndFixNote: b.symptom_and_fix,
  checklistSteps: b.steps.map((s) => s.text),
  author: b.author_name,
  authorId: b.author_id,
  updatedBy: b.updated_by_name,
  updatedById: b.updated_by_id,
  sourceTicketId: b.source_ticket_id ?? undefined,
  sourceTicketCode: b.source_ticket_code ?? undefined,
  revision: b.revision,
  createdAt: b.created_at,
  updatedAt: b.updated_at,
  canEdit: b.can_edit,
});

export const mapBackendChecklistStep = (s: BackendTicketChecklistStepOut): TicketChecklistStep => ({
  id: s.id,
  checklistId: s.checklist_id,
  position: s.position,
  text: s.text,
  completed: s.completed,
  completedAt: s.completed_at,
  completedById: s.completed_by_id,
  completedByName: s.completed_by_name,
  createdAt: s.created_at,
  updatedAt: s.updated_at,
});

export const mapBackendChecklist = (b: BackendTicketChecklistOut): TicketChecklist => ({
  id: b.id ?? undefined,
  ticketId: b.ticket_id,
  sourceRepairNoteId: b.source_repair_note_id,
  sourceRevision: b.source_revision,
  guideTitleSnapshot: b.guide_title_snapshot,
  guideTaskCodeSnapshot: b.guide_task_code_snapshot,
  guideTaskNameSnapshot: b.guide_task_name_snapshot,
  guideBody: b.guide_body,
  appliedById: b.applied_by_id,
  appliedByName: b.applied_by_name,
  appliedAt: b.applied_at,
  createdById: b.created_by_id,
  updatedById: b.updated_by_id,
  revision: b.revision,
  createdAt: b.created_at,
  updatedAt: b.updated_at,
  steps: (b.steps || []).map(mapBackendChecklistStep),
});

export const getRepairNotesApi = async (params?: {
  offset?: number;
  limit?: number;
  task_code?: string;
  q?: string;
}): Promise<{ items: SavedRepairNote[]; total: number; offset: number; limit: number }> => {
  const res = await apiClient.get<BackendRepairNoteListResponse>('/repair-notes', { params });
  return {
    items: res.data.items.map(mapBackendRepairNote),
    total: res.data.total,
    offset: res.data.offset,
    limit: res.data.limit,
  };
};

export const getRepairNoteApi = async (id: string): Promise<SavedRepairNote> => {
  const res = await apiClient.get<BackendRepairNoteOut>(`/repair-notes/${id}`);
  return mapBackendRepairNote(res.data);
};

export const createRepairNoteApi = async (payload: {
  title: string;
  task_code: string;
  symptom_and_fix: string;
  steps: string[];
  source_ticket_id?: string;
}): Promise<SavedRepairNote> => {
  const res = await apiClient.post<BackendRepairNoteOut>('/repair-notes', payload);
  return mapBackendRepairNote(res.data);
};

export const updateRepairNoteApi = async (
  id: string,
  payload: {
    expected_revision: number;
    title?: string;
    task_code?: string;
    symptom_and_fix?: string;
    steps?: string[];
  }
): Promise<SavedRepairNote> => {
  const res = await apiClient.patch<BackendRepairNoteOut>(`/repair-notes/${id}`, payload);
  return mapBackendRepairNote(res.data);
};

export const deleteRepairNoteApi = async (id: string, expectedRevision: number): Promise<void> => {
  await apiClient.delete(`/repair-notes/${id}`, {
    params: { expected_revision: expectedRevision },
  });
};

export const getTicketChecklistApi = async (ticketId: string): Promise<TicketChecklist> => {
  const res = await apiClient.get<BackendTicketChecklistOut>(`/tickets/${ticketId}/checklist`);
  return mapBackendChecklist(res.data);
};

export const applyRepairNoteToTicketApi = async (
  ticketId: string,
  payload: {
    repair_note_id: string;
    expected_note_revision: number;
    expected_checklist_revision?: number;
    replace_existing?: boolean;
  }
): Promise<TicketChecklist> => {
  const res = await apiClient.post<BackendTicketChecklistOut>(
    `/tickets/${ticketId}/checklist/apply`,
    payload
  );
  return mapBackendChecklist(res.data);
};

export const addTicketChecklistStepApi = async (
  ticketId: string,
  payload: {
    expected_checklist_revision?: number;
    text: string;
  }
): Promise<TicketChecklist> => {
  const res = await apiClient.post<BackendTicketChecklistOut>(
    `/tickets/${ticketId}/checklist/steps`,
    payload
  );
  return mapBackendChecklist(res.data);
};

export const updateTicketChecklistStepApi = async (
  ticketId: string,
  stepId: string,
  payload: {
    expected_checklist_revision: number;
    text?: string;
    completed?: boolean;
  }
): Promise<TicketChecklist> => {
  const res = await apiClient.patch<BackendTicketChecklistOut>(
    `/tickets/${ticketId}/checklist/steps/${stepId}`,
    payload
  );
  return mapBackendChecklist(res.data);
};

export const deleteTicketChecklistStepApi = async (
  ticketId: string,
  stepId: string,
  expectedChecklistRevision: number
): Promise<TicketChecklist> => {
  const res = await apiClient.delete<BackendTicketChecklistOut>(
    `/tickets/${ticketId}/checklist/steps/${stepId}`,
    {
      params: { expected_checklist_revision: expectedChecklistRevision },
    }
  );
  return mapBackendChecklist(res.data);
};
