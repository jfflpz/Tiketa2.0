import type { AppSliceCreator } from '../types';
import type { QueueFilterTab } from './uiSlice';
import type { Ticket } from '../../types/ticket';
import { mapStaffTicket } from '../../utils/mapStaffTicket';
import { ticketsApi } from '../../api/client';

export const PRIORITY_ORDER: Record<string, number> = {
  CRIT: 4,
  Critical: 4,
  HIGH: 3,
  High: 3,
  NORM: 2,
  Medium: 2,
  LOW: 1,
  Low: 1,
};

export function sortTicketsSprint5(tickets: Ticket[]): Ticket[] {
  const parseTime = (val: unknown): number => {
    if (!val) return 0;
    const t = new Date(val as any).getTime();
    return Number.isNaN(t) ? 0 : t;
  };

  return [...tickets].sort((a, b) => {
    // 1. Priority Descending
    const pDiff = (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0);
    if (pDiff !== 0) return pDiff;
    // 2. Created At Ascending (Oldest First)
    const tA = parseTime((a as any).created_at || a.createdAt);
    const tB = parseTime((b as any).created_at || b.createdAt);
    const tDiff = tA - tB;
    if (tDiff !== 0) return tDiff;
    // 3. Deterministic Tie-Breaker: UUID Lexicographical
    return a.id.localeCompare(b.id);
  });
}

export interface TicketQueueSlice {
  tickets: Ticket[];
  selectedTicketId: string | null;
  setSelectedTicketId: (id: string | null) => void;
  inspectedTicket: Ticket | null;
  isInspectingTicket: boolean;
  inspectTicketError: string | null;
  fetchInspectedTicketApi: (id: string) => Promise<Ticket | null>;
  activeWorkbenchTicketId: string | null;
  workbenchTicket: Ticket | null;
  isWorkbenchLoading: boolean;
  workbenchError: string | null;
  setActiveWorkbenchTicketId: (id: string | null) => void;
  fetchWorkbenchTicketApi: (id: string) => Promise<Ticket | null>;

  queueFilter: QueueFilterTab;
  setQueueFilter: (filter: QueueFilterTab) => void;
  locationFilter: string;
  setLocationFilter: (loc: string) => void;

  searchQuery: string;
  setSearchQuery: (q: string) => void;

  isFetchingQueue: boolean;
  fetchQueueApi: () => Promise<boolean>;

  hubSummariesVersion: number;
  invalidateHubSummaries: () => void;
}

export const createTicketQueueSlice: AppSliceCreator<TicketQueueSlice> = (set, get) => ({
  tickets: [],
  selectedTicketId: null,
  inspectedTicket: null,
  isInspectingTicket: false,
  inspectTicketError: null,
  hubSummariesVersion: 0,
  invalidateHubSummaries: () =>
    set((state) => ({ hubSummariesVersion: state.hubSummariesVersion + 1 })),

  setSelectedTicketId: (id) => {
    if (!id) {
      set({
        selectedTicketId: null,
        inspectedTicket: null,
        inspectTicketError: null,
        isInspectingTicket: false,
      });
      return;
    }
    const existing = get().tickets.find((t) => t.id === id);
    if (existing) {
      set({
        selectedTicketId: id,
        inspectedTicket: existing,
        inspectTicketError: null,
        isInspectingTicket: false,
      });
    } else {
      set({
        selectedTicketId: id,
        inspectedTicket: null,
        isInspectingTicket: true,
        inspectTicketError: null,
      });
      get().fetchInspectedTicketApi(id);
    }
  },

  fetchInspectedTicketApi: async (id: string) => {
    if (!get().currentUser) return null;
    const sessionAtStart = get().authSessionId;
    set({ isInspectingTicket: true, inspectTicketError: null });
    try {
      if (!get().serverDictionaries) await get().fetchDictionaries();
      const row = await ticketsApi.getTicket(id);
      if (get().authSessionId !== sessionAtStart || !get().currentUser) return null;
      const itMembers = get().itTeamMembers;
      const dicts = get().serverDictionaries;
      const mapped = mapStaffTicket(
        row,
        dicts,
        itMembers.find((member) => member.id === row.assigned_tech_id)?.name,
      );
      mapped.technicianDiagnosis = (row as any).technician_diagnosis || (row as any).diagnosis || (row as any).technicianDiagnosis || mapped.technicianDiagnosis;
      // @spec F-03: Retain existing loaded messages for this ticket
      const existingMsgs = get().inspectedTicket?.id === id
        ? get().inspectedTicket?.messages
        : get().tickets.find((t) => t.id === id)?.messages;
      if (existingMsgs && existingMsgs.length > 0) {
        mapped.messages = existingMsgs;
      }
      if (get().selectedTicketId === id) {
        set({
          inspectedTicket: mapped,
          isInspectingTicket: false,
          inspectTicketError: null,
        });
      }
      return mapped;
    } catch (err: unknown) {
      if (get().authSessionId !== sessionAtStart || !get().currentUser) return null;
      const msg = err instanceof Error ? err.message : 'Failed to load ticket details';
      if (get().selectedTicketId === id) {
        set({
          isInspectingTicket: false,
          inspectTicketError: msg,
        });
      }
      return null;
    }
  },

  activeWorkbenchTicketId: null,
  workbenchTicket: null,
  isWorkbenchLoading: false,
  workbenchError: null,

  setActiveWorkbenchTicketId: (id) => {
    if (!id) {
      set({
        activeWorkbenchTicketId: null,
        workbenchTicket: null,
        workbenchError: null,
        isWorkbenchLoading: false,
      });
      return;
    }
    const existing = get().tickets.find((t) => t.id === id);
    if (existing) {
      set({
        activeWorkbenchTicketId: id,
        workbenchTicket: existing,
        workbenchError: null,
        isWorkbenchLoading: false,
      });
    } else {
      set({
        activeWorkbenchTicketId: id,
        workbenchTicket: null,
        isWorkbenchLoading: true,
        workbenchError: null,
      });
      get().fetchWorkbenchTicketApi(id);
    }
  },

  fetchWorkbenchTicketApi: async (id: string) => {
    const sessionAtStart = get().authSessionId;
    set({ isWorkbenchLoading: true, workbenchError: null });
    try {
      if (!get().serverDictionaries) await get().fetchDictionaries();
      const row = await ticketsApi.getTicket(id);
      if (get().authSessionId !== sessionAtStart || !get().currentUser) return null;
      const itMembers = get().itTeamMembers;
      const dicts = get().serverDictionaries;
      const mapped = mapStaffTicket(
        row,
        dicts,
        itMembers.find((member) => member.id === row.assigned_tech_id)?.name,
      );
      mapped.technicianDiagnosis = (row as any).technician_diagnosis || (row as any).diagnosis || (row as any).technicianDiagnosis || mapped.technicianDiagnosis;
      // @spec F-03: Retain existing loaded messages for this ticket
      const existingWorkbenchMsgs = get().workbenchTicket?.id === id
        ? get().workbenchTicket?.messages
        : get().tickets.find((t) => t.id === id)?.messages;
      if (existingWorkbenchMsgs && existingWorkbenchMsgs.length > 0) {
        mapped.messages = existingWorkbenchMsgs;
      }
      if (get().activeWorkbenchTicketId === id) {
        set({
          workbenchTicket: mapped,
          isWorkbenchLoading: false,
          workbenchError: null,
        });
      }
      return mapped;
    } catch (err: unknown) {
      if (get().authSessionId !== sessionAtStart || !get().currentUser) return null;
      const msg = err instanceof Error ? err.message : 'Failed to load ticket for workbench';
      if (get().activeWorkbenchTicketId === id) {
        set({
          isWorkbenchLoading: false,
          workbenchError: msg,
        });
      }
      return null;
    }
  },

  queueFilter: 'ALL',
  setQueueFilter: (filter) => set({ queueFilter: filter }),

  locationFilter: 'ALL',
  setLocationFilter: (loc) => set({ locationFilter: loc }),

  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),

  isFetchingQueue: false,

  fetchQueueApi: async (): Promise<boolean> => {
    if (get().currentUser?.role === 'supervisor') {
      return true;
    }
    const sessionAtStart = get().authSessionId;
    set({ isFetchingQueue: true });
    try {
      if (!get().serverDictionaries) await get().fetchDictionaries();
      const data = await ticketsApi.getQueue();
      if (get().authSessionId !== sessionAtStart || !get().currentUser) {
        set({ isFetchingQueue: false });
        return false;
      }
      if (Array.isArray(data)) {
        const itMembers = get().itTeamMembers;
        const dicts = get().serverDictionaries;
        const currentTickets = get().tickets;
        const currentInspected = get().inspectedTicket;
        const currentWorkbench = get().workbenchTicket;

        // @spec F-03: Preserve loaded conversation messages across queue polling refreshes
        const messagesMap = new Map<string, NonNullable<Ticket['messages']>>();
        for (const t of currentTickets) {
          if (t.messages && t.messages.length > 0) {
            messagesMap.set(t.id, t.messages);
          }
        }
        if (currentInspected?.id && currentInspected.messages && currentInspected.messages.length > 0) {
          const prev = messagesMap.get(currentInspected.id) || [];
          if (currentInspected.messages.length >= prev.length) {
            messagesMap.set(currentInspected.id, currentInspected.messages);
          }
        }
        if (currentWorkbench?.id && currentWorkbench.messages && currentWorkbench.messages.length > 0) {
          const prev = messagesMap.get(currentWorkbench.id) || [];
          if (currentWorkbench.messages.length >= prev.length) {
            messagesMap.set(currentWorkbench.id, currentWorkbench.messages);
          }
        }

        const mapped = data.map((row) => {
          const t = mapStaffTicket(
            row,
            dicts,
            itMembers.find((member) => member.id === row.assigned_tech_id)?.name,
          );
          t.technicianDiagnosis = (row as any).technician_diagnosis || (row as any).diagnosis || (row as any).technicianDiagnosis || t.technicianDiagnosis;
          const savedMsgs = messagesMap.get(t.id);
          if (savedMsgs && savedMsgs.length > 0) {
            t.messages = savedMsgs;
          }
          return t;
        });

        const sortedTickets = sortTicketsSprint5(mapped);

        // Also synchronize inspectedTicket and workbenchTicket metadata without clearing messages
        let updatedInspected = currentInspected;
        if (currentInspected) {
          const matchingInQueue = sortedTickets.find((t) => t.id === currentInspected.id);
          if (matchingInQueue) {
            updatedInspected = { ...matchingInQueue, messages: currentInspected.messages || matchingInQueue.messages };
          }
        }

        let updatedWorkbench = currentWorkbench;
        if (currentWorkbench) {
          const matchingInQueue = sortedTickets.find((t) => t.id === currentWorkbench.id);
          if (matchingInQueue) {
            updatedWorkbench = { ...matchingInQueue, messages: currentWorkbench.messages || matchingInQueue.messages };
          }
        }

        set({
          tickets: sortedTickets,
          inspectedTicket: updatedInspected,
          workbenchTicket: updatedWorkbench,
          isFetchingQueue: false,
        });
        return true;
      }
      set({ isFetchingQueue: false });
      return false;
    } catch {
      set({ isFetchingQueue: false });
      return false;
    }
  },
});
