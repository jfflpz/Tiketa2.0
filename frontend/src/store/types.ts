import type { StateCreator } from 'zustand';
import type { UISlice } from './slices/uiSlice';
import type { AuthSlice } from './slices/authSlice';
import type { TicketQueueSlice } from './slices/ticketQueueSlice';
import type { TicketOperationsSlice } from './slices/ticketOperationsSlice';
import type { PublicIntakeSlice } from './slices/publicIntakeSlice';
import type { NotesSlice } from './slices/notesSlice';
import type { ReportsSlice } from './slices/reportsSlice';
import type { TeamSlice } from './slices/teamSlice';
import type { TicketVerificationSlice } from './slices/ticketVerificationSlice';

export type AppState = UISlice &
  AuthSlice &
  TicketQueueSlice &
  TicketOperationsSlice &
  PublicIntakeSlice &
  NotesSlice &
  ReportsSlice &
  TeamSlice &
  TicketVerificationSlice;

export type AppSliceCreator<T> = StateCreator<AppState, [], [], T>;
