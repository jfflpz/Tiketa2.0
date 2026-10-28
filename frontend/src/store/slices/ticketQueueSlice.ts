import type { AppSliceCreator } from '../types';
import type { QueueFilterTab } from './uiSlice';
import type { Ticket } from '../../types/ticket';
import { mapStaffTicket } from '../../utils/mapStaffTicket';
import { ticketsApi } from '../../api/client';

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
        const mapped = data.map((row) => mapStaffTicket(
          row,
          dicts,
          itMembers.find((member) => member.id === row.assigned_tech_id)?.name,
        ));
        set({ tickets: mapped, isFetchingQueue: false });
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
