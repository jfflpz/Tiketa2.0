import type { AppSliceCreator } from '../types';
import type { Ticket, TaskCategoryCode } from '../../types/ticket';
import { TASK_CATEGORIES } from '../../constants/domain';
import { ticketsApi, directoryApi, type EmployeeLookupResult } from '../../api/client';

export interface PublicIntakeSlice {
  lookupEmployeeApi: (query: string) => Promise<EmployeeLookupResult | null>;
  submitTicketApi: (input: {
    employeeId: string;
    taskCode: TaskCategoryCode;
    description: string;
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

  submitTicketApi: async (input) => {
    const taskMeta = TASK_CATEGORIES.find((c) => c.code === input.taskCode);
    const now = new Date();

    try {
      const res = await ticketsApi.submitPublicTicket({
        employee_id: input.employeeId,
        task_code: input.taskCode,
        description: input.description,
      });

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
          location: 'Terminal Depot',
          locationCode: 'FS',
          department: 'Operations',
          departmentCode: 'OPS',
          requestor: 'Terminal Staff',
          task: 'IT Support Service',
          taskCode: 'PRN-TS',
          description: `Ticket ${res.ticket_code} tracked from server. Status: ${res.status}`,
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
