import type { AppSliceCreator } from '../types';
import type {
  Ticket,
  TicketStatus,
  SupportMode,
  TaskCategoryCode,
  NewTicketInput,
  TicketChatMessage,
} from '../../types/ticket';
import { TASK_CATEGORIES } from '../../constants/domain';
import { ticketsApi } from '../../api/client';
import { normalizeApiError } from '../../utils/errorUtils';

export interface TicketOperationsSlice {
  // Staff Quick Intake modal & mutation
  isQuickIntakeOpen: boolean;
  setQuickIntakeOpen: (open: boolean) => void;
  quickIntakeApi: (input: {
    employeeId: string;
    taskCode: TaskCategoryCode;
    description: string;
    mode: SupportMode;
    companyName?: string;
    locationName?: string;
    departmentName?: string;
    requestorName?: string;
  }) => Promise<Ticket | null>;

  claimTicketApi: (ticketId: string) => Promise<boolean>;
  updateTicketStatusApi: (
    ticketId: string,
    status: TicketStatus,
    mode?: SupportMode
  ) => Promise<boolean>;
  fetchTicketCommentsApi: (ticketId: string) => Promise<void>;
  sendTicketMessageApi: (
    ticketId: string,
    message: string,
    isInternal?: boolean
  ) => Promise<boolean>;

  claimTicket: (ticketId: string, techName?: string, techId?: string) => void;
  updateTicketMode: (ticketId: string, mode: SupportMode) => void;
  updateTicketTask: (ticketId: string, taskCode: TaskCategoryCode) => void;
  updateTicketDescription: (ticketId: string, description: string) => void;
  sendTicketMessage: (
    ticketId: string,
    senderRole: 'employee' | 'it',
    senderName: string,
    message: string,
    isInternal?: boolean
  ) => void;
  resolveTicket: (ticketId: string) => void;
  requestValidation: (ticketId: string) => void;
  confirmClosure: (ticketId: string) => Promise<void>;
  reopenTicket: (ticketId: string) => Promise<void>;
  createTicket: (input: NewTicketInput) => Ticket;
  assignTicket: (ticketId: string, technicianName: string, technicianId: string) => void;
}

const formatTimeAmPm = (date: Date) =>
  date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const createTicketOperationsSlice: AppSliceCreator<TicketOperationsSlice> = (set, get) => ({
  isQuickIntakeOpen: false,
  setQuickIntakeOpen: (open) => set({ isQuickIntakeOpen: open }),

  quickIntakeApi: async (input) => {
    const taskMeta = TASK_CATEGORIES.find((c) => c.code === input.taskCode);
    const now = new Date();

    try {
      const res = await ticketsApi.quickIntake({
        employee_id: input.employeeId,
        task_code: input.taskCode,
        description: input.description,
      });

      const newTicket: Ticket = {
        id: res.id,
        ticketCode: res.ticket_code,
        company: input.companyName ?? 'Five Star Bus Co.',
        companyCode: 'FS',
        mode: input.mode,
        department: input.departmentName ?? 'Operations',
        departmentCode: 'OPS',
        requestor: res.requester_name || input.requestorName || 'Terminal Staff',
        employeeId: input.employeeId,
        task: taskMeta ? taskMeta.name : input.taskCode,
        taskCode: input.taskCode,
        description: input.description,
        month: res.month || now.toLocaleString('default', { month: 'long', year: 'numeric' }),
        dateStarted: res.date_started || now.toISOString().split('T')[0],
        timeStarted: res.time_started ? String(res.time_started) : now.toTimeString().split(' ')[0],
        status: (res.status as TicketStatus) || 'OPEN',
        location: input.locationName ?? 'Pasay Terminal',
        locationCode: 'PSY',
        priority: taskMeta ? taskMeta.defaultPriority : 'Medium',
        intakeSource: 'Walk-in / Viber',
        createdAt: res.created_at || now.toISOString(),
        messages: [
          {
            id: 'msg-init-' + Date.now(),
            senderRole: 'employee',
            senderName: res.requester_name || input.requestorName || 'Terminal Staff',
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
        `Ticket ${newTicket.ticketCode} Created!`,
        `Walk-in / Viber ticket registered (${newTicket.location})`,
        'success'
      );

      return newTicket;
    } catch (err: any) {
      const msg = normalizeApiError(err, 'Failed to submit quick intake ticket to server');
      get().addToast('Quick Intake Error', msg, 'warning');
      return null;
    }
  },

  claimTicketApi: async (ticketId: string) => {
    const previousTickets = get().tickets;
    const target = previousTickets.find((t) => t.id === ticketId);
    const techName = get().currentUser?.name || 'IT Specialist';

    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId ? { ...t, status: 'PROG', workedBy: techName } : t
      ),
    }));
    get().addToast(
      `Claimed ${target?.ticketCode || 'Ticket'}`,
      `Assigned to ${techName} • In Progress`,
      'success'
    );

    try {
      await ticketsApi.claimTicket(ticketId);
      return true;
    } catch (err: any) {
      set({ tickets: previousTickets });
      const msg = normalizeApiError(err, 'Ticket could not be claimed (already assigned)');
      get().addToast('Claim Conflict', msg, 'warning');
      return false;
    }
  },

  updateTicketStatusApi: async (ticketId: string, status: TicketStatus, mode?: SupportMode) => {
    const target = get().tickets.find((t) => t.id === ticketId);
    if (!target) return false;

    if (target.status === 'CLSD' && status === 'PROG') {
      const closedTime = target.dateFinished
        ? new Date(`${target.dateFinished}T${target.timeFinished || '00:00:00'}`).getTime()
        : 0;
      const hoursSinceClose = (Date.now() - closedTime) / (1000 * 60 * 60);
      if (hoursSinceClose > 72) {
        get().addToast(
          'Reopen Window Expired',
          'Tickets closed over 72 hours ago cannot be reopened. Please create a new linked ticket.',
          'warning'
        );
        return false;
      }
    }

    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId ? { ...t, status, mode: mode || t.mode } : t
      ),
    }));

    try {
      const res = await ticketsApi.updateStatus(ticketId, {
        status: status as any,
        mode: mode || (target.mode as any),
      });
      get().addToast('Status Updated', `${target.ticketCode} is now ${status}`, 'info');

      // Development / Test: Backend returns closure_url when transitioning to RESL
      const closureUrl = (res as any)?.closure_url;
      if (closureUrl) {
        set((state) => ({
          tickets: state.tickets.map((t) =>
            t.id === ticketId ? { ...t, closureUrl } : t
          ),
        }));
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(closureUrl);
          }
        } catch {
          // Fallback if clipboard API restricted
        }
        get().addToast(
          'Viber Closure Link Copied!',
          `Direct resolution link copied: ${closureUrl}`,
          'success'
        );
      }

      return true;
    } catch (err: any) {
      const msg = normalizeApiError(err, 'Failed to update ticket status');
      get().addToast('Error', msg, 'warning');
      get().fetchQueueApi();
      return false;
    }
  },

  fetchTicketCommentsApi: async (ticketId: string) => {
    try {
      const comments = await ticketsApi.getComments(ticketId);
      if (Array.isArray(comments)) {
        set((state) => ({
          tickets: state.tickets.map((t) =>
            t.id === ticketId
              ? {
                  ...t,
                  messages: comments.map((c) => ({
                    id: c.id,
                    senderRole: c.is_internal ? 'it' : (c.sender_role || 'it'),
                    senderName: c.sender_name || (c.is_internal ? '🔒 Internal IT Note' : 'IT Support'),
                    message: c.body,
                    isInternal: Boolean(c.is_internal), // Preserved from backend API contract
                    timestamp: c.created_at
                      ? new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '',
                  })),
                }
              : t
          ),
        }));
      }
    } catch {
      // silent catch for polling
    }
  },

  sendTicketMessageApi: async (ticketId: string, message: string, isInternal = false) => {
    const trimmed = message.trim();
    if (!trimmed) return false;

    get().sendTicketMessage(
      ticketId,
      'it',
      isInternal ? '🔒 Internal Note' : (get().currentUser?.name || 'IT Support'),
      trimmed,
      isInternal
    );

    try {
      await ticketsApi.addComment(ticketId, { body: trimmed, is_internal: isInternal });
      return true;
    } catch {
      get().addToast('Chat Error', 'Message failed to send to server', 'warning');
      return false;
    }
  },

  claimTicket: (ticketId, techName, techId) => {
    const activeTechName = techName ?? get().currentUser?.name ?? 'Nathaniel D. Esguerra';
    const activeTechId = techId ?? get().currentUser?.id ?? 'tm-2';
    const target = get().tickets.find((t) => t.id === ticketId);

    const claimMsg: TicketChatMessage = {
      id: 'msg-' + Date.now(),
      senderRole: 'it',
      senderName: `${activeTechName} (IT Support)`,
      message: `Hi! I have claimed your ticket (${target?.ticketCode ?? ''}) and started working on it. Feel free to message me here if you have any questions.`,
      timestamp: formatTimeAmPm(new Date()),
      isInternal: false,
    };

    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              status: 'PROG',
              workedBy: activeTechName,
              workedById: activeTechId,
              messages: [...(t.messages ?? []), claimMsg],
            }
          : t
      ),
    }));
    get().addToast(
      `Claimed ${target?.ticketCode ?? 'Ticket'}`,
      `Assigned to ${activeTechName} • Status → In Progress`,
      'success'
    );
  },

  updateTicketMode: (ticketId, mode) => {
    const target = get().tickets.find((t) => t.id === ticketId);
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId ? { ...t, mode } : t
      ),
    }));
    get().addToast(
      'Support Mode Updated',
      `${target?.ticketCode ?? 'Ticket'} set to ${mode === 'SITE' ? 'On-Site (SITE)' : 'Remote (REM)'}`,
      'info'
    );
  },

  updateTicketTask: (ticketId, taskCode) => {
    const category = TASK_CATEGORIES.find((c) => c.code === taskCode);
    const target = get().tickets.find((t) => t.id === ticketId);
    if (!target) return;
    const taskName = category?.name ?? target.task;
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId ? { ...t, taskCode, task: taskName } : t
      ),
    }));
    get().addToast(
      'Diagnosed Task Updated',
      `Reclassified to ${taskName} (${taskCode})`,
      'success'
    );
  },

  updateTicketDescription: (ticketId, description) => {
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId ? { ...t, description } : t
      ),
    }));
    get().addToast(
      'Job Log Notes Saved',
      'Technical symptoms & repair summary updated',
      'success'
    );
  },

  sendTicketMessage: (ticketId, senderRole, senderName, message, isInternal = false) => {
    const trimmed = message.trim();
    if (!trimmed) return;
    const newMsg: TicketChatMessage = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
      senderRole,
      senderName,
      message: trimmed,
      timestamp: formatTimeAmPm(new Date()),
      isInternal,
    };

    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId
          ? { ...t, messages: [...(t.messages ?? []), newMsg] }
          : t
      ),
    }));
  },

  resolveTicket: (ticketId) => {
    const now = new Date();
    const timeFinished = now.toTimeString().split(' ')[0];
    const dateFinished = now.toISOString().split('T')[0];
    const target = get().tickets.find((t) => t.id === ticketId);
    const activeTechName =
      target?.workedBy ?? get().currentUser?.name ?? 'Nathaniel D. Esguerra';

    const resolveMsg: TicketChatMessage = {
      id: 'msg-val-' + Date.now(),
      senderRole: 'it',
      senderName: `${activeTechName} (IT Support)`,
      message:
        '🔔 VALIDATION REQUEST: Repair marked completed by IT Support. Please test your equipment and click "Yes, Confirm Closure" to validate and close this ticket.',
      timestamp: formatTimeAmPm(now),
      isInternal: false,
    };

    set((state) => ({
      tickets: state.tickets.map((t) => {
        if (t.id !== ticketId) return t;
        return {
          ...t,
          status: 'RESL',
          validationRequested: true,
          validationRequestedAt: now.toISOString(),
          timeFinished,
          dateFinished,
          duration: t.duration ?? 0.65,
          closureTokenHash: 'sha256:' + Math.random().toString(16).substring(2, 18),
          messages: [...(t.messages ?? []), resolveMsg],
        };
      }),
    }));
    get().addToast(
      `Validation Request Sent for ${target?.ticketCode ?? 'Ticket'}`,
      `Sent to ${target?.requestor ?? 'requestor'} for closure validation.`,
      'info'
    );
  },

  requestValidation: (ticketId) => {
    const now = new Date();
    const target = get().tickets.find((t) => t.id === ticketId);
    const activeTechName =
      target?.workedBy ?? get().currentUser?.name ?? 'Nathaniel D. Esguerra';

    const valMsg: TicketChatMessage = {
      id: 'msg-val-req-' + Date.now(),
      senderRole: 'it',
      senderName: `${activeTechName} (IT Support)`,
      message:
        '🔔 VALIDATION REMINDER: IT Support is requesting your validation. Please test your equipment and confirm closure if working properly.',
      timestamp: formatTimeAmPm(now),
      isInternal: false,
    };

    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              validationRequested: true,
              validationRequestedAt: now.toISOString(),
              messages: [...(t.messages ?? []), valMsg],
            }
          : t
      ),
    }));
    get().addToast(
      'Validation Request Sent',
      `Sent closure reminder to ${target?.requestor ?? 'requestor'}.`,
      'info'
    );
  },

  confirmClosure: async (ticketId) => {
    const target = get().tickets.find((t) => t.id === ticketId);
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              status: 'CLSD',
              userConfirmedAt: new Date().toISOString(),
            }
          : t
      ),
    }));
    get().addToast(
      `Verified & Closed ${target?.ticketCode ?? 'Ticket'}`,
      'Ticket closure confirmed and archived in 15-column Job Log.',
      'success'
    );
    if (target && !target.id.startsWith('t-') && !target.id.startsWith('tracked-')) {
      try {
        await ticketsApi.updateStatus(ticketId, { status: 'CLSD' });
      } catch {
        // Keep optimistic sign-off
      }
    }
  },

  reopenTicket: async (ticketId) => {
    const target = get().tickets.find((t) => t.id === ticketId);
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              status: 'PROG',
              timeFinished: undefined,
              dateFinished: undefined,
            }
          : t
      ),
    }));
    get().addToast(
      `Reopened ${target?.ticketCode ?? 'Ticket'}`,
      'Returned to IT Support active repairs',
      'warning'
    );
    if (target && !target.id.startsWith('t-') && !target.id.startsWith('tracked-')) {
      try {
        await ticketsApi.updateStatus(ticketId, { status: 'PROG' });
      } catch {
        // Keep optimistic reopen
      }
    }
  },

  createTicket: (input) => {
    const now = new Date();
    const randomNum = Math.floor(261050 + Math.random() * 900);
    const taskMeta = TASK_CATEGORIES.find((c) => c.code === input.taskCode);
    const newTicket: Ticket = {
      id: 't-' + Date.now(),
      ticketCode: `T-${randomNum}`,
      company: input.company,
      companyCode: input.companyCode,
      mode: input.mode,
      department: input.department,
      departmentCode: input.departmentCode,
      requestor: input.requestor,
      employeeId: input.employeeId,
      task: taskMeta ? taskMeta.name : input.taskCode,
      taskCode: input.taskCode,
      description: input.description,
      month: 'October 2026',
      dateStarted: now.toISOString().split('T')[0],
      timeStarted: now.toTimeString().split(' ')[0],
      status: 'OPEN',
      location: input.location,
      locationCode: input.locationCode,
      priority: taskMeta ? taskMeta.defaultPriority : 'Medium',
      intakeSource: input.intakeSource ?? 'PC Kiosk',
      createdAt: now.toISOString(),
      messages: [
        {
          id: 'msg-init-' + Date.now(),
          senderRole: 'employee',
          senderName: input.requestor,
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
      `IT Support has been notified (${newTicket.location})`,
      'success'
    );

    return newTicket;
  },

  assignTicket: (ticketId, technicianName, technicianId) => {
    const target = get().tickets.find((t) => t.id === ticketId);
    const assignMsg: TicketChatMessage = {
      id: 'msg-' + Date.now(),
      senderRole: 'it',
      senderName: 'Dispatch Admin',
      message: `Ticket (${target?.ticketCode ?? ''}) has been assigned to ${technicianName} by Administrator.`,
      timestamp: formatTimeAmPm(new Date()),
      isInternal: true,
    };
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              status: t.status === 'OPEN' ? 'PROG' : t.status,
              workedBy: technicianName,
              workedById: technicianId,
              messages: [...(t.messages ?? []), assignMsg],
            }
          : t
      ),
    }));
    get().addToast(
      `Assigned ${target?.ticketCode ?? 'Ticket'} to ${technicianName}`,
      'Dispatch assignment updated successfully.',
      'success'
    );
  },
});
