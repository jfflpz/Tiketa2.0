import type { AppSliceCreator } from '../types';
import type { Ticket, TaskCategoryCode } from '../../types/ticket';
import { TASK_CATEGORIES } from '../../constants/domain';
import {
  ticketsApi,
  directoryApi,
  locationApi,
  type EmployeeLookupResult,
  type EmployeeMatchOut,
  type LocationObservationInput,
  type LocationObservationOut,
} from '../../api/client';
import { getOrCreateKioskSessionId } from '../../utils/session';

export interface PublicIntakeSlice {
  lookupEmployeeApi: (query: string) => Promise<EmployeeLookupResult | null>;
  matchEmployeeApi: (employeeId: string, email: string) => Promise<EmployeeMatchOut>;
  recordLocationObservationApi: (input: LocationObservationInput) => Promise<LocationObservationOut | null>;
  submitTicketApi: (input: {
    employeeId: string;
    taskCode: TaskCategoryCode;
    description: string;
    matchToken: string;
    observationId?: string | null;
    companyName?: string;
    locationName?: string;
    departmentName?: string;
    requestorName?: string;
  }) => Promise<Ticket | null>;
  trackTicketApi: (code: string) => Promise<Ticket | null>;
}

const formatTimeAmPm = (date: Date) =>
  date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const createPublicIntakeSlice: AppSliceCreator<PublicIntakeSlice> = (set, get) => ({
  lookupEmployeeApi: async (query: string) => {
    try {
      return await directoryApi.lookupEmployee(query);
    } catch {
      return null;
    }
  },

  matchEmployeeApi: async (employeeId: string, email: string) => {
    const sessionId = getOrCreateKioskSessionId();
    return await directoryApi.matchEmployee(
      { employee_id: employeeId, email },
      sessionId
    );
  },

  recordLocationObservationApi: async (input: LocationObservationInput) => {
    const sessionId = getOrCreateKioskSessionId();
    try {
      return await locationApi.recordObservation(
        { ...input, session_id: sessionId },
        sessionId
      );
    } catch {
      return null;
    }
  },

  submitTicketApi: async (input) => {
    const taskMeta = TASK_CATEGORIES.find((c) => c.code === input.taskCode);
    const now = new Date();
    const sessionId = getOrCreateKioskSessionId();

    try {
      const res = await ticketsApi.submitPublicTicket(
        {
          employee_id: input.employeeId,
          task_code: input.taskCode,
          description: input.description,
          match_token: input.matchToken,
          observation_id: input.observationId ?? null,
        },
        sessionId
      );

      const newTicket: Ticket = {
        id: 't-' + Date.now(),
        ticketCode: res.ticket_code,
        company: input.companyName ?? 'Five Star Bus Co.',
        companyCode: 'FS',
        mode: 'SITE',
        department: input.departmentName ?? 'Operations',
        departmentCode: 'OPS',
        requestor: input.requestorName ?? 'Terminal Staff',
        employeeId: input.employeeId,
        task: taskMeta ? taskMeta.name : input.taskCode,
        taskCode: input.taskCode,
        description: input.description,
        month: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
        dateStarted: now.toISOString().split('T')[0],
        timeStarted: now.toTimeString().split(' ')[0],
        status: 'OPEN',
        location: input.locationName ?? 'Pasay Terminal',
        locationCode: 'PSY',
        priority: taskMeta ? taskMeta.defaultPriority : 'Medium',
        intakeSource: 'PC Kiosk',
        createdAt: res.created_at || now.toISOString(),
        messages: [
          {
            id: 'msg-init-' + Date.now(),
            senderRole: 'employee',
            senderName: input.requestorName ?? 'Terminal Staff',
            message: input.description,
            timestamp: formatTimeAmPm(now),
            isInternal: false,
          },
        ],
      };

      set((state) => ({
        tickets: [newTicket, ...state.tickets],
      }));

      get().addToast(
        `Ticket ${newTicket.ticketCode} Submitted!`,
        `Saved to central IT database (${newTicket.location})`,
        'success'
      );

      return newTicket;
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to submit ticket to server';
      get().addToast('Submission Error', msg, 'warning');
      return null;
    }
  },

  trackTicketApi: async (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    const existing = get().tickets.find(
      (t) => t.ticketCode.toUpperCase() === cleanCode
    );
    if (existing) return existing;

    try {
      const res = await ticketsApi.trackTicket(cleanCode);
      if (res && res.ticket_code) {
        const trackedTicket: Ticket = {
          id: 'tracked-' + res.ticket_code,
          ticketCode: res.ticket_code,
          company: 'Five Star Bus Co.',
          companyCode: 'FS',
          location: 'Terminal (Tracked)',
          locationCode: 'TERM',
          department: 'Department',
          departmentCode: 'DEPT',
          requestor: 'Requestor',
          task: 'IT Support Request',
          taskCode: 'NET-CFG',
          description: `Ticket ${res.ticket_code} status: ${res.status}`,
          month: new Date(res.created_at).toLocaleString('default', {
            month: 'long',
            year: 'numeric',
          }),
          dateStarted: res.created_at
            ? res.created_at.split('T')[0]
            : new Date().toISOString().split('T')[0],
          timeStarted: res.created_at
            ? new Date(res.created_at).toLocaleTimeString([], { hour12: false })
            : '00:00:00',
          status: res.status as any,
          priority: 'Medium',
          createdAt: res.created_at,
          mode: 'SITE',
          intakeSource: 'PC Kiosk',
        };
        set((state) => ({
          tickets: [trackedTicket, ...state.tickets],
        }));
        return trackedTicket;
      }
      return null;
    } catch {
      return null;
    }
  },
});
