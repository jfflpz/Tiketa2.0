import type { AppSliceCreator } from '../types';
import type { QueueFilterTab } from './uiSlice';
import type { Ticket, TicketStatus, SupportMode, TaskCategoryCode } from '../../types/ticket';
import { TASK_CATEGORIES } from '../../constants/domain';
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

export const createTicketQueueSlice: AppSliceCreator<TicketQueueSlice> = (set) => ({
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
      const data = await ticketsApi.getQueue();
      if (Array.isArray(data)) {
        const mapped: Ticket[] = data.map((row: any) => {
          const taskMeta = TASK_CATEGORIES.find((t) => t.code === row.task_code);
          const techId = row.assigned_tech_id || row.technician_id || undefined;
          return {
            id: row.id,
            ticketCode: row.ticket_code,
            company: row.company_name || 'Five Star Bus Co.',
            companyCode: 'FS',
            mode: (row.mode as SupportMode) || 'SITE',
            department: row.department_name || 'Operations',
            departmentCode: 'OPS',
            requestor: row.requester_name || 'Terminal Staff',
            employeeId: row.employee_code || undefined,
            task: taskMeta ? taskMeta.name : row.task_code,
            taskCode: row.task_code as TaskCategoryCode,
            description: row.description,
            month: row.created_at
              ? new Date(row.created_at).toLocaleString('default', { month: 'long', year: 'numeric' })
              : 'October 2026',
            dateStarted: row.created_at
              ? row.created_at.split('T')[0]
              : new Date().toISOString().split('T')[0],
            timeStarted: row.created_at
              ? row.created_at.split('T')[1].slice(0, 8)
              : '08:00:00',
            status: row.status as TicketStatus,
            location: row.location_name || 'Pasay',
            locationCode: 'PSY',
            workedBy: row.technician_name || row.assigned_tech || undefined,
            workedById: techId,
            assigned_tech_id: techId,
            priority: taskMeta ? taskMeta.defaultPriority : 'Medium',
            createdAt: row.created_at || new Date().toISOString(),
            messages: [],
          };
        });
        set({ tickets: mapped, isFetchingQueue: false });
      }
    } catch {
      set({ isFetchingQueue: false });
    }
  },
});
