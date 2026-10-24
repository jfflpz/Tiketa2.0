import type { AppSliceCreator } from '../types';
import type { QueueFilterTab } from './uiSlice';
import type { Ticket } from '../../types/ticket';
import { mapStaffTicket } from '../../utils/mapStaffTicket';
import { ticketsApi } from '../../api/client';

export interface TicketQueueSlice {
  tickets: Ticket[];
  selectedTicketId: string | null;
  setSelectedTicketId: (id: string | null) => void;
  activeWorkbenchTicketId: string | null;
  setActiveWorkbenchTicketId: (id: string | null) => void;

  queueFilter: QueueFilterTab;
  setQueueFilter: (filter: QueueFilterTab) => void;
  locationFilter: string;
  setLocationFilter: (loc: string) => void;

  searchQuery: string;
  setSearchQuery: (q: string) => void;

  isFetchingQueue: boolean;
  fetchQueueApi: () => Promise<void>;
}

export const createTicketQueueSlice: AppSliceCreator<TicketQueueSlice> = (set, get) => ({
  tickets: [],
  selectedTicketId: null,
  setSelectedTicketId: (id) => set({ selectedTicketId: id }),
  activeWorkbenchTicketId: null,
  setActiveWorkbenchTicketId: (id) => set({ activeWorkbenchTicketId: id }),

  queueFilter: 'ALL',
  setQueueFilter: (filter) => set({ queueFilter: filter }),

  locationFilter: 'ALL',
  setLocationFilter: (loc) => set({ locationFilter: loc }),

  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),

  isFetchingQueue: false,

  fetchQueueApi: async () => {
    set({ isFetchingQueue: true });
    try {
      if (!get().serverDictionaries) await get().fetchDictionaries();
      const data = await ticketsApi.getQueue();
      if (Array.isArray(data)) {
        const itMembers = get().itTeamMembers;
        const dicts = get().serverDictionaries;
        const mapped = data.map((row) => mapStaffTicket(
          row,
          dicts,
          itMembers.find((member) => member.id === row.assigned_tech_id)?.name,
        ));
        set({ tickets: mapped, isFetchingQueue: false });
      }
    } catch {
      set({ isFetchingQueue: false });
    }
  },
});
