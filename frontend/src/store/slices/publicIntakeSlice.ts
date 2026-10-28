// @spec BF-01: Reliable Ticket Intake & Safe Error Handling
// @spec BF-03: Remove Fabricated Initial Chat Message
// @spec BF-04: Authoritative Fresh Ticket Tracking
import type { AppSliceCreator } from '../types';
import type { Ticket, TaskCategoryCode } from '../../types/ticket';
import { TASK_CATEGORIES } from '../../constants/domain';
import {
  ticketsApi,
  directoryApi,
  locationApi,
  setMatchToken,
  type EmployeeLookupResult,
  type EmployeeMatchOut,
  type LocationObservationInput,
  type LocationObservationOut,
} from '../../api/client';
import {
  getOrCreateKioskSessionId,
  getPersistedEmployeeTickets,
  persistEmployeeTickets,
  getPersistedMatchToken,
  persistMatchToken,
  getPersistedEmployeeProfile,
  persistEmployeeProfile,
} from '../../utils/session';
import { normalizeApiError } from '../../utils/errorUtils';

export interface PublicIntakeSlice {
  trackedTicket: Ticket | null;
  publicReceipt: Ticket | null;
  employeeMatchToken: string | null;
  employeeProfile: {
    fullName: string;
    company: string;
    location: string;
    department: string;
  } | null;
  setTrackedTicket: (ticket: Ticket | null) => void;
  setPublicReceipt: (ticket: Ticket | null) => void;
  setEmployeeMatch: (
    token: string | null,
    profile: PublicIntakeSlice['employeeProfile']
  ) => void;
  clearPublicIntake: () => void;
  lookupEmployeeApi: (query: string) => Promise<EmployeeLookupResult | null>;
  matchEmployeeApi: (employeeId: string, email: string) => Promise<EmployeeMatchOut>;
  recordLocationObservationApi: (input: LocationObservationInput) => Promise<LocationObservationOut | null>;
  submitTicketApi: (input: {
    employeeId: string;
    taskCode: TaskCategoryCode;
    description: string;
    taskTitle?: string;
    matchToken: string;
    observationId?: string | null;
    companyName?: string;
    locationName?: string;
    departmentName?: string;
    requestorName?: string;
  }) => Promise<Ticket | null>;
  trackTicketApi: (code: string) => Promise<Ticket | null>;
  hydrateKioskEmployeeTickets: () => Promise<void>;
}

export const createPublicIntakeSlice: AppSliceCreator<PublicIntakeSlice> = (set, get) => ({
  trackedTicket: null,
  publicReceipt: null,
  employeeMatchToken: getPersistedMatchToken(),
  employeeProfile: getPersistedEmployeeProfile(),

  setTrackedTicket: (ticket) => set({ trackedTicket: ticket }),
  setPublicReceipt: (ticket) => set({ publicReceipt: ticket }),
  setEmployeeMatch: (token, profile) => {
    setMatchToken(token);
    persistMatchToken(token);
    persistEmployeeProfile(profile);
    set({
      employeeMatchToken: token,
      employeeProfile: profile,
    });
  },
  clearPublicIntake: () => {
    setMatchToken(null);
    persistMatchToken(null);
    persistEmployeeProfile(null);
    set({
      trackedTicket: null,
      publicReceipt: null,
      employeeMatchToken: null,
      employeeProfile: null,
    });
  },

  lookupEmployeeApi: async (query: string) => {
    try {
      return await directoryApi.lookupEmployee(query);
    } catch {
      return null;
    }
  },

  matchEmployeeApi: async (employeeId: string, email: string) => {
    const sessionId = getOrCreateKioskSessionId();
    const res = await directoryApi.matchEmployee(
      { employee_id: employeeId, email },
      sessionId
    );
    if (res && res.match_token) {
      setMatchToken(res.match_token);
      const profile = {
        fullName: res.employee.full_name,
        company: res.employee.company_name,
        location: res.employee.location_name,
        department: res.employee.department_name,
      };
      persistMatchToken(res.match_token);
      persistEmployeeProfile(profile);
      set({
        employeeMatchToken: res.match_token,
        employeeProfile: profile,
      });
      // Automatically refresh employee tickets in background with new match token
      get().fetchMyEmployeeTickets();
    }
    return res;
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
          reported_issue_code: input.taskCode,
          description: input.description,
          match_token: input.matchToken,
          observation_id: input.observationId ?? null,
        },
        sessionId
      );

      const newTicket: Ticket = {
        id: (res as any).id || 't-' + Date.now(),
        ticketCode: res.ticket_code,
        company: input.companyName ?? 'Pangasinan Five Star Bus Co.',
        companyCode: 'FS',
        mode: 'SITE',
        department: input.departmentName ?? 'Operations',
        departmentCode: 'OPS',
        requestor: input.requestorName ?? 'Terminal Staff',
        employeeId: input.employeeId,
        task: input.taskTitle || (taskMeta ? taskMeta.name : input.taskCode),
        taskCode: input.taskCode,
        description: input.description,
        month: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
        dateStarted: now.toISOString().split('T')[0],
        timeStarted: now.toTimeString().split(' ')[0],
        status: (res.status as any) || 'OPEN',
        location: input.locationName ?? 'Pasay Terminal',
        locationCode: 'PSY',
        priority: taskMeta ? taskMeta.defaultPriority : 'Medium',
        intakeSource: 'PC Kiosk',
        createdAt: res.created_at || now.toISOString(),
        messages: [],
      };

      const nextEmployeeTickets = [
        newTicket,
        ...get().employeeTickets.filter((t) => t.ticketCode !== newTicket.ticketCode),
      ];
      persistEmployeeTickets(nextEmployeeTickets);

      set({
        publicReceipt: newTicket,
        employeeTickets: nextEmployeeTickets,
      });

      get().addToast(
        `Ticket ${newTicket.ticketCode} Submitted!`,
        `Saved to central IT database (${newTicket.location})`,
        'success'
      );

      return newTicket;
    } catch (err: unknown) {
      const msg = normalizeApiError(err, 'Failed to submit ticket to server');
      get().addToast('Submission Error', msg, 'warning');
      return null;
    }
  },

  trackTicketApi: async (code: string) => {
    const cleanCode = code.trim().toUpperCase();

    // Query server first for authoritative ticket status
    try {
      const res = await ticketsApi.trackTicket(cleanCode);
      if (res && res.ticket_code) {
        const existing = get().employeeTickets.find(
          (t) => t.ticketCode.toUpperCase() === cleanCode
        );

        const taskMeta = TASK_CATEGORIES.find((c) => c.code === (res as any).task_code);
        const createdAt = res.created_at || new Date().toISOString();
        const dateObj = new Date(createdAt);

        const trackedTicket: Ticket = {
          id: (res as any).id || existing?.id || 'tracked-' + res.ticket_code,
          ticketCode: res.ticket_code,
          company: (res as any).company_name || existing?.company || 'Pangasinan Five Star Bus Co.',
          companyCode: existing?.companyCode || 'FS',
          location: (res as any).location_name || existing?.location || 'Terminal Station',
          locationCode: existing?.locationCode || 'TERM',
          department: (res as any).department_name || existing?.department || 'Operations',
          departmentCode: existing?.departmentCode || 'OPS',
          requestor: (res as any).requester_name || existing?.requestor || 'Terminal Employee',
          task:
            (res as any).task_name ||
            (taskMeta ? taskMeta.name : (res as any).task_code) ||
            existing?.task ||
            'IT Support Request',
          taskCode: ((res as any).task_code as TaskCategoryCode) || existing?.taskCode || 'NET-CFG',
          description:
            (res as any).description ||
            existing?.description ||
            `Ticket ${res.ticket_code} status: ${res.status}`,
          month: dateObj.toLocaleString('default', {
            month: 'long',
            year: 'numeric',
          }),
          dateStarted: createdAt.includes('T')
            ? createdAt.split('T')[0]
            : new Date().toISOString().split('T')[0],
          timeStarted: createdAt.includes('T')
            ? new Date(createdAt).toLocaleTimeString([], { hour12: false })
            : '00:00:00',
          status: (res.status as any) || existing?.status || 'OPEN',
          priority: existing?.priority || (taskMeta ? taskMeta.defaultPriority : 'Medium'),
          createdAt: createdAt,
          mode: existing?.mode || 'SITE',
          intakeSource: 'PC Kiosk',
          messages: existing?.messages || [],
        };

        // Note: Store dedicated trackedTicket / publicReceipt.
        // DO NOT mutate state.tickets (reserved for authenticated staff queue).
        set({
          trackedTicket,
          publicReceipt: trackedTicket,
        });

        return trackedTicket;
      }
    } catch (err) {
      // Fall back to existing cached ticket if network fails
      const cached =
        get().employeeTickets.find((t) => t.ticketCode.toUpperCase() === cleanCode) ||
        (get().trackedTicket?.ticketCode.toUpperCase() === cleanCode ? get().trackedTicket : null);
      if (cached) {
        set({ trackedTicket: cached, publicReceipt: cached });
        return cached;
      }
    }

    return null;
  },

  hydrateKioskEmployeeTickets: async () => {
    // 1. Restore match token and profile from localStorage if not already in memory
    const persistedToken = getPersistedMatchToken();
    const persistedProfile = getPersistedEmployeeProfile();
    if (persistedToken && !get().employeeMatchToken) {
      setMatchToken(persistedToken);
      set({
        employeeMatchToken: persistedToken,
        employeeProfile: persistedProfile,
      });
    }

    // 2. Restore recent employee tickets from localStorage
    const persistedTickets = getPersistedEmployeeTickets();
    if (persistedTickets && persistedTickets.length > 0) {
      const current = get().employeeTickets || [];
      const currentCodes = new Set(current.map((t) => t.ticketCode?.toUpperCase()));
      const toAdd = persistedTickets.filter(
        (t) => t && t.ticketCode && !currentCodes.has(t.ticketCode.toUpperCase())
      );
      if (toAdd.length > 0) {
        set({ employeeTickets: [...toAdd, ...current] });
      }
    }

    // 3. For each recent employee ticket, refresh live status via ticketsApi.trackTicket
    const allTickets = get().employeeTickets || [];
    if (allTickets.length > 0) {
      const updatedTickets = [...allTickets];
      let hasUpdates = false;

      await Promise.allSettled(
        allTickets.map(async (t) => {
          if (!t.ticketCode) return;
          try {
            const live = await ticketsApi.trackTicket(t.ticketCode);
            if (live && live.status && live.status !== t.status) {
              const idx = updatedTickets.findIndex(
                (item) => item.ticketCode?.toUpperCase() === t.ticketCode.toUpperCase()
              );
              if (idx !== -1) {
                updatedTickets[idx] = {
                  ...updatedTickets[idx],
                  status: live.status as any,
                };
                hasUpdates = true;
              }
            }
          } catch {
            // Track fallback
          }
        })
      );

      if (hasUpdates) {
        set({ employeeTickets: updatedTickets });
        persistEmployeeTickets(updatedTickets);
      }
    }

    // 4. If we have a match token, also pull server tickets for this employee
    if (get().employeeMatchToken) {
      get().fetchMyEmployeeTickets().catch(() => {});
    }
  },
});
