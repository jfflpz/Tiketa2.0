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
import { ticketsApi, extractApiErrorMessage } from '../../api/client';
import { mapStaffTicket } from '../../utils/mapStaffTicket';

export interface TicketOperationsSlice {
  // Staff Quick Intake modal & mutation
  isQuickIntakeOpen: boolean;
  setQuickIntakeOpen: (open: boolean) => void;
  quickIntakeApi: (input: {
    employeeId: string;
    taskCode: TaskCategoryCode;
    description: string;
    mode: SupportMode;
  }) => Promise<Ticket | null>;

  claimTicketApi: (ticketId: string) => Promise<boolean>;
  updateTicketStatusApi: (
    ticketId: string,
    status: TicketStatus,
    mode?: SupportMode,
    taskCode?: string
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
  resolveTicket: (ticketId: string) => Promise<void>;
  requestValidation: (ticketId: string) => void;
  confirmClosure: (ticketId: string) => Promise<void>;
  reopenTicket: (ticketId: string, reason?: string) => Promise<void>;
  createTicket: (input: NewTicketInput) => Ticket;
  assignTicket: (
    ticketId: string,
    technicianName: string,
    technicianId: string
  ) => Promise<boolean>;
}

const formatTimeAmPm = (date: Date) =>
  date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const updateTicketInState = (
  state: any,
  ticketId: string,
  updater: (t: Ticket) => Ticket
) => ({
  tickets: state.tickets.map((t: Ticket) => (t.id === ticketId ? updater(t) : t)),
  inspectedTicket:
    state.inspectedTicket?.id === ticketId
      ? updater(state.inspectedTicket)
      : state.inspectedTicket,
  workbenchTicket:
    state.workbenchTicket?.id === ticketId
      ? updater(state.workbenchTicket)
      : state.workbenchTicket,
});

const findTargetTicket = (state: any, ticketId: string): Ticket | undefined =>
  state.tickets.find((t: Ticket) => t.id === ticketId) ??
  (state.inspectedTicket?.id === ticketId ? state.inspectedTicket : undefined) ??
  (state.workbenchTicket?.id === ticketId ? state.workbenchTicket : undefined);

export const createTicketOperationsSlice: AppSliceCreator<TicketOperationsSlice> = (set, get) => ({
  isQuickIntakeOpen: false,
  setQuickIntakeOpen: (open) => set({ isQuickIntakeOpen: open }),

  quickIntakeApi: async (input) => {
    try {
      const res = await ticketsApi.quickIntake({
        employee_id: input.employeeId,
        task_code: input.taskCode,
        description: input.description,
        mode: input.mode,
      });

      const newTicket: Ticket = {
        ...mapStaffTicket(res, get().serverDictionaries),
        employeeId: input.employeeId,
        intakeSource: 'Walk-in / Viber',
      };

      set((state) => ({
        tickets: [newTicket, ...state.tickets.filter((ticket) => ticket.id !== newTicket.id)],
      }));

      get().addToast(
        `Ticket ${newTicket.ticketCode} Created!`,
        'Saved to the support queue.',
        'success'
      );
      get().invalidateHubSummaries();

      return newTicket;
    } catch (err: unknown) {
      const msg = extractApiErrorMessage(err, 'Failed to submit quick intake ticket to server');
      get().addToast('Quick Intake Error', msg, 'warning');
      return null;
    }
  },

  claimTicketApi: async (ticketId: string) => {
    const sessionAtStart = get().authSessionId;
    const sessionUser = get().currentUser;
    if (!sessionUser) return false;

    const target = findTargetTicket(get(), ticketId);
    if (!target) return false;

    try {
      const res = await ticketsApi.claimTicket(ticketId);
      // Invalidate if session changed or logged out while request was in-flight
      if (get().authSessionId !== sessionAtStart || !get().currentUser) return false;

      const techName = res?.technician_name || sessionUser.name;
      const techId = res?.assigned_tech_id || sessionUser.id;

      set((state) =>
        updateTicketInState(state, ticketId, (t) => ({
          ...t,
          status: 'PROG',
          workedBy: techName,
          workedById: techId,
          assigned_tech_id: techId,
        }))
      );

      get().addToast(
        `Claimed ${target.ticketCode || 'Ticket'}`,
        `Assigned to ${techName} • In Progress`,
        'success'
      );

      try {
        const queueRefreshed = await get().fetchQueueApi();
        if (queueRefreshed === false) {
          get().addToast(
            'Stale Preview',
            'Ticket was claimed successfully, but background queue sync timed out.',
            'warning'
          );
        }
        get().invalidateHubSummaries();
      } catch {
        get().addToast(
          'Stale Preview',
          'Ticket was claimed successfully, but background queue sync timed out.',
          'warning'
        );
      }
      return true;
    } catch (err: unknown) {
      if (get().authSessionId !== sessionAtStart || !get().currentUser) return false;
      const msg = extractApiErrorMessage(err, 'Ticket could not be claimed (already assigned)');
      get().addToast('Claim Conflict', msg, 'warning');
      return false;
    }
  },

  updateTicketStatusApi: async (ticketId: string, status: TicketStatus, mode?: SupportMode, taskCode?: string) => {
    const sessionAtStart = get().authSessionId;
    const sessionUser = get().currentUser;
    if (!sessionUser) return false;

    const target = findTargetTicket(get(), ticketId);
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

    const prevStatus = target.status;
    const prevMode = target.mode;

    // Narrow optimistic update for this ticket only
    set((state) =>
      updateTicketInState(state, ticketId, (t) => ({
        ...t,
        status,
        mode: mode || t.mode,
        taskCode: (taskCode as TaskCategoryCode) || t.taskCode,
      }))
    );

    try {
      const res = await ticketsApi.updateStatus(ticketId, {
        status: status as any,
        mode: mode || (target.mode as any),
        task_code: taskCode || (target.taskCode as any),
      });

      if (get().authSessionId !== sessionAtStart || !get().currentUser) return false;

      get().addToast('Status Updated', `${target.ticketCode} is now ${status}`, 'info');

      // Development / Test: Backend returns closure_url when transitioning to RESL
      const closureUrl = (res as any)?.closure_url;
      if (closureUrl) {
        set((state) =>
          updateTicketInState(state, ticketId, (t) => ({
            ...t,
            closureUrl,
          }))
        );
        let copied = false;
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(closureUrl);
            copied = true;
          }
        } catch {
          // Fallback if clipboard API restricted
        }
        if (copied) {
          get().addToast(
            'Viber Closure Link Copied!',
            `Direct resolution link copied: ${closureUrl}`,
            'success'
          );
        } else {
          get().addToast(
            'Verification Link Generated',
            `Share link with employee: ${closureUrl}`,
            'info'
          );
        }
      } else if (status === 'RESL') {
        get().addToast(
          'Verification Email Sent',
          'A secure closure verification email has been delivered to the employee.',
          'info'
        );
      }

      try {
        const queueRefreshed = await get().fetchQueueApi();
        if (queueRefreshed === false) {
          get().addToast(
            'Stale Preview',
            'Ticket was claimed successfully, but background queue sync timed out.',
            'warning'
          );
        }
        get().invalidateHubSummaries();
      } catch {
        get().addToast(
          'Stale Preview',
          'Ticket was claimed successfully, but background queue sync timed out.',
          'warning'
        );
      }
      return true;
    } catch (err: unknown) {
      if (get().authSessionId !== sessionAtStart || !get().currentUser) return false;

      // Narrow rollback ONLY on this ticket
      set((state) =>
        updateTicketInState(state, ticketId, (t) => ({
          ...t,
          status: prevStatus,
          mode: prevMode,
        }))
      );
      const msg = extractApiErrorMessage(err, 'Failed to update ticket status');
      get().addToast('Error', msg, 'warning');
      return false;
    }
  },

  fetchTicketCommentsApi: async (ticketId: string) => {
    const sessionAtStart = get().authSessionId;
    try {
      const comments = await ticketsApi.getComments(ticketId);
      // Guard against late responses and logged-out session
      if (get().authSessionId !== sessionAtStart || !get().currentUser) return;
      if (
        get().selectedTicketId !== ticketId &&
        get().activeWorkbenchTicketId !== ticketId &&
        !get().tickets.some((t) => t.id === ticketId)
      ) {
        return;
      }

      if (Array.isArray(comments)) {
        const serverMessages: TicketChatMessage[] = comments.map((c) => ({
          id: c.id,
          senderRole: c.is_internal ? 'it' : (c.sender_role || 'it'),
          senderName: c.sender_name || (c.is_internal ? '🔒 Internal IT Note' : 'IT Support'),
          message: c.body,
          isInternal: Boolean(c.is_internal),
          timestamp: c.created_at
            ? new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '',
        }));

        set((state) =>
          updateTicketInState(state, ticketId, (t) => {
            const currentMsgs = t.messages ?? [];
            const serverIdSet = new Set(serverMessages.map((m) => m.id));
            // Keep pending or local optimistic messages that are not yet in server comments
            const pendingOrLocal = currentMsgs.filter(
              (m) => m.id.startsWith('temp-msg-') || !serverIdSet.has(m.id)
            );
            // Deduplicate: avoid duplicating messages whose exact text is already in server comments
            const remainingLocal = pendingOrLocal.filter(
              (p) => !serverMessages.some((s) => s.message === p.message && s.isInternal === p.isInternal)
            );
            return {
              ...t,
              messages: [...serverMessages, ...remainingLocal],
            };
          })
        );
      }
    } catch {
      // silent catch for polling
    }
  },

  sendTicketMessageApi: async (ticketId: string, message: string, isInternal = false) => {
    const trimmed = message.trim();
    if (!trimmed) return false;

    const sessionAtStart = get().authSessionId;
    const sessionUser = get().currentUser;
    if (!sessionUser) return false;

    const target = findTargetTicket(get(), ticketId);
    if (!target) return false;

    const currentSenderName = isInternal
      ? '🔒 Internal Note'
      : (sessionUser.name || 'IT Support');

    const tempId = 'temp-msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    const optimisticMsg: TicketChatMessage = {
      id: tempId,
      senderRole: 'it',
      senderName: currentSenderName,
      message: trimmed,
      timestamp: formatTimeAmPm(new Date()),
      isInternal,
    };

    // Optimistically add message
    set((state) =>
      updateTicketInState(state, ticketId, (t) => ({
        ...t,
        messages: [...(t.messages ?? []), optimisticMsg],
      }))
    );

    try {
      const serverComment = await ticketsApi.addComment(ticketId, {
        body: trimmed,
        is_internal: isInternal,
      });

      if (get().authSessionId !== sessionAtStart || !get().currentUser) return false;

      // Reconcile with canonical server comment ID and timestamp
      const canonicalId = serverComment?.id || tempId;
      const canonicalTime = serverComment?.created_at
        ? new Date(serverComment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : optimisticMsg.timestamp;

      set((state) =>
        updateTicketInState(state, ticketId, (t) => ({
          ...t,
          messages: (t.messages ?? []).map((m) =>
            m.id === tempId
              ? { ...m, id: canonicalId, timestamp: canonicalTime }
              : m
          ),
        }))
      );
      return true;
    } catch (err: unknown) {
      if (get().authSessionId !== sessionAtStart || !get().currentUser) return false;

      // Failed! Remove optimistic message so it does not falsely appear delivered
      set((state) =>
        updateTicketInState(state, ticketId, (t) => ({
          ...t,
          messages: (t.messages ?? []).filter((m) => m.id !== tempId),
        }))
      );
      const msg = extractApiErrorMessage(err, 'Message failed to send to server');
      get().addToast('Chat Error', msg, 'warning');
      return false;
    }
  },

  claimTicket: (ticketId, techName, techId) => {
    const activeTechName = techName ?? get().currentUser?.name ?? 'Nathaniel D. Esguerra';
    const activeTechId = techId ?? get().currentUser?.id ?? 'tm-2';
    const target = findTargetTicket(get(), ticketId);

    const claimMsg: TicketChatMessage = {
      id: 'msg-' + Date.now(),
      senderRole: 'it',
      senderName: `${activeTechName} (IT Support)`,
      message: `Hi! I have claimed your ticket (${target?.ticketCode ?? ''}) and started working on it. Feel free to message me here if you have any questions.`,
      timestamp: formatTimeAmPm(new Date()),
      isInternal: false,
    };

    set((state) =>
      updateTicketInState(state, ticketId, (t) => ({
        ...t,
        status: 'PROG',
        workedBy: activeTechName,
        workedById: activeTechId,
        assigned_tech_id: activeTechId,
        messages: [...(t.messages ?? []), claimMsg],
      }))
    );
    get().addToast(
      `Claimed ${target?.ticketCode ?? 'Ticket'}`,
      `Assigned to ${activeTechName} • Status → In Progress`,
      'success'
    );
  },

  updateTicketMode: (ticketId, mode) => {
    const target = findTargetTicket(get(), ticketId);
    set((state) =>
      updateTicketInState(state, ticketId, (t) => ({
        ...t,
        mode,
      }))
    );
    get().addToast(
      'Support Mode Updated',
      `${target?.ticketCode ?? 'Ticket'} set to ${mode === 'SITE' ? 'On-Site (SITE)' : 'Remote (REM)'}`,
      'info'
    );
  },

  updateTicketTask: (ticketId, taskCode) => {
    const category = TASK_CATEGORIES.find((c) => c.code === taskCode);
    const target = findTargetTicket(get(), ticketId);
    if (!target) return;
    const taskName = category?.name ?? target.task;
    set((state) =>
      updateTicketInState(state, ticketId, (t) => ({
        ...t,
        taskCode,
        task: taskName,
      }))
    );
    get().addToast(
      'Diagnosed Task Updated',
      `Reclassified to ${taskName} (${taskCode})`,
      'success'
    );
    get().updateTicketStatusApi(ticketId, target.status, target.mode, taskCode);
  },

  updateTicketDescription: (ticketId, description) => {
    set((state) =>
      updateTicketInState(state, ticketId, (t) => ({
        ...t,
        description,
      }))
    );
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

    set((state) =>
      updateTicketInState(state, ticketId, (t) => ({
        ...t,
        messages: [...(t.messages ?? []), newMsg],
      }))
    );
  },

  resolveTicket: async (ticketId) => {
    const target = findTargetTicket(get(), ticketId);
    if (!target) return;
    const mode = target.mode || 'SITE';
    const taskCode = target.taskCode;
    await get().updateTicketStatusApi(ticketId, 'RESL', mode, taskCode);
  },

  requestValidation: (ticketId) => {
    const now = new Date();
    const target = findTargetTicket(get(), ticketId);
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

    set((state) =>
      updateTicketInState(state, ticketId, (t) => ({
        ...t,
        validationRequested: true,
        validationRequestedAt: now.toISOString(),
        messages: [...(t.messages ?? []), valMsg],
      }))
    );
    get().addToast(
      'Validation Request Sent',
      `Sent closure reminder to ${target?.requestor ?? 'requestor'}.`,
      'info'
    );
  },

  confirmClosure: async (ticketId) => {
    const sessionAtStart = get().authSessionId;
    const target = findTargetTicket(get(), ticketId);
    if (!target) return;
    try {
      if (!target.id.startsWith('t-') && !target.id.startsWith('tracked-')) {
        await ticketsApi.confirmClosure(ticketId);
      }
      if (get().authSessionId !== sessionAtStart || !get().currentUser) return;
      set((state) =>
        updateTicketInState(state, ticketId, (t) => ({
          ...t,
          status: 'CLSD',
          userConfirmedAt: new Date().toISOString(),
        }))
      );
      get().addToast(
        `Verified & Closed ${target.ticketCode}`,
        'Ticket closure confirmed and archived in central records.',
        'success'
      );
      try {
        const queueRefreshed = await get().fetchQueueApi();
        if (queueRefreshed === false) {
          get().addToast(
            'Stale Preview',
            'Ticket was claimed successfully, but background queue sync timed out.',
            'warning'
          );
        }
        get().invalidateHubSummaries();
      } catch {
        get().addToast(
          'Stale Preview',
          'Ticket was claimed successfully, but background queue sync timed out.',
          'warning'
        );
      }
    } catch (err: unknown) {
      if (get().authSessionId !== sessionAtStart || !get().currentUser) return;
      const msg = extractApiErrorMessage(err, 'Failed to confirm ticket closure');
      get().addToast('Closure Failed', msg, 'warning');
    }
  },

  reopenTicket: async (ticketId, reason = 'Reopened via verification modal') => {
    const sessionAtStart = get().authSessionId;
    const target = findTargetTicket(get(), ticketId);
    if (!target) return;
    try {
      if (!target.id.startsWith('t-') && !target.id.startsWith('tracked-')) {
        await ticketsApi.reopenTicket(ticketId, { reason });
      }
      if (get().authSessionId !== sessionAtStart || !get().currentUser) return;
      set((state) =>
        updateTicketInState(state, ticketId, (t) => ({
          ...t,
          status: 'PROG',
          timeFinished: undefined,
          dateFinished: undefined,
        }))
      );
      get().addToast(
        `Reopened ${target.ticketCode}`,
        'Returned to IT Support active repairs.',
        'info'
      );
      try {
        const queueRefreshed = await get().fetchQueueApi();
        if (queueRefreshed === false) {
          get().addToast(
            'Stale Preview',
            'Ticket was claimed successfully, but background queue sync timed out.',
            'warning'
          );
        }
        get().invalidateHubSummaries();
      } catch {
        get().addToast(
          'Stale Preview',
          'Ticket was claimed successfully, but background queue sync timed out.',
          'warning'
        );
      }
    } catch (err: unknown) {
      if (get().authSessionId !== sessionAtStart || !get().currentUser) return;
      const msg = extractApiErrorMessage(err, 'Failed to reopen ticket');
      get().addToast('Reopen Failed', msg, 'warning');
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

  assignTicket: async (ticketId, technicianName, technicianId) => {
    const sessionAtStart = get().authSessionId;
    const target = findTargetTicket(get(), ticketId);
    if (!target) return false;

    const prevWorkedBy = target.workedBy;
    const prevWorkedById = target.workedById;
    const prevStatus = target.status;

    const assignMsg: TicketChatMessage = {
      id: 'msg-' + Date.now(),
      senderRole: 'it',
      senderName: 'Dispatch Admin',
      message: `Ticket (${target.ticketCode}) has been assigned to ${technicianName} by Administrator.`,
      timestamp: formatTimeAmPm(new Date()),
      isInternal: true,
    };

    // Narrow optimistic update for this ticket only
    set((state) =>
      updateTicketInState(state, ticketId, (t) => ({
        ...t,
        status: t.status === 'OPEN' ? 'PROG' : t.status,
        workedBy: technicianName,
        workedById: technicianId,
        assigned_tech_id: technicianId,
        messages: [...(t.messages ?? []), assignMsg],
      }))
    );

    if (!target.id.startsWith('t-') && !target.id.startsWith('tracked-')) {
      try {
        await ticketsApi.assignTicket(ticketId, technicianId);
        if (get().authSessionId !== sessionAtStart || !get().currentUser) return false;

        get().addToast(
          `Assigned ${target.ticketCode} to ${technicianName}`,
          'Dispatch assignment synchronized to database.',
          'success'
        );

        try {
          const queueRefreshed = await get().fetchQueueApi();
          if (queueRefreshed === false) {
            get().addToast(
              'Stale Preview',
              'Assigned successfully, but background ticket queue sync timed out.',
              'warning'
            );
          }
          get().invalidateHubSummaries();
        } catch {
          get().addToast(
            'Stale Preview',
            'Assigned successfully, but background ticket queue sync timed out.',
            'warning'
          );
        }
        return true;
      } catch (err: unknown) {
        if (get().authSessionId !== sessionAtStart || !get().currentUser) return false;

        // Narrow rollback for this ticket only
        set((state) =>
          updateTicketInState(state, ticketId, (t) => ({
            ...t,
            status: prevStatus,
            workedBy: prevWorkedBy,
            workedById: prevWorkedById,
            assigned_tech_id: prevWorkedById,
            messages: (t.messages ?? []).filter((m) => m.id !== assignMsg.id),
          }))
        );
        const msg = extractApiErrorMessage(err, 'Failed to assign technician on server');
        get().addToast('Assignment Failed', msg, 'warning');
        return false;
      }
    } else {
      get().addToast(
        `Assigned ${target.ticketCode} to ${technicianName}`,
        'Local mock ticket updated.',
        'success'
      );
      return true;
    }
  },
});
