import { create } from 'zustand';
import type { AppState } from './types';
import { createUISlice, type UISlice, type ActiveView, type StaffRole, type QueueFilterTab, type AuthenticatedUser, type ToastItem } from './slices/uiSlice';
import { createAuthSlice, type AuthSlice } from './slices/authSlice';
import { createTicketQueueSlice, type TicketQueueSlice } from './slices/ticketQueueSlice';
import { createTicketOperationsSlice, type TicketOperationsSlice } from './slices/ticketOperationsSlice';
import { createPublicIntakeSlice, type PublicIntakeSlice } from './slices/publicIntakeSlice';
import { createNotesSlice, type NotesSlice } from './slices/notesSlice';
import { createReportsSlice, type ReportsSlice } from './slices/reportsSlice';
import { createTeamSlice, type TeamSlice } from './slices/teamSlice';
import { createTicketVerificationSlice, type TicketVerificationSlice } from './slices/ticketVerificationSlice';

export const useAppStore = create<AppState>()((...a) => ({
  ...createUISlice(...a),
  ...createAuthSlice(...a),
  ...createTicketQueueSlice(...a),
  ...createTicketOperationsSlice(...a),
  ...createPublicIntakeSlice(...a),
  ...createNotesSlice(...a),
  ...createReportsSlice(...a),
  ...createTeamSlice(...a),
  ...createTicketVerificationSlice(...a),
}));

// Re-export public types to preserve 100% backward compatibility for existing consumers
export type {
  AppState,
  UISlice,
  ActiveView,
  StaffRole,
  QueueFilterTab,
  AuthenticatedUser,
  ToastItem,
  AuthSlice,
  TicketQueueSlice,
  TicketOperationsSlice,
  PublicIntakeSlice,
  NotesSlice,
  ReportsSlice,
  TeamSlice,
  TicketVerificationSlice,
};
