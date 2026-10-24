// frontend/src/store/slices/uiSlice.ts
// @spec BF-01: Normalized toast payload to prevent unrenderable object crashes
// @spec BF-02: URL-Aware Active View Synchronization
import type { StateCreator } from 'zustand';

export type ActiveView =
  | 'overview' // IT Screen 1: Personal Technician KPI Overview
  | 'tickets' // Screen 2: Active Ticket Lists (Table View & 3-Col Kanban Board)
  | 'workbench' // IT Screen 3: My Active Workbench (Active Focus Repair & Live Chat)
  | 'notes' // Screen 4: Saved Repair Notes Library
  | 'joblogs' // Screen 5: 15-Column Master Job Log Spreadsheet & AI Importer
  | 'terminals' // Screen 6: 15 Bus Terminal Hubs Monitor
  | 'team' // Admin Screen: IT Team Roster & Governance
  | 'analytics' // Admin Screen: Executive Analytics Overview
  | 'reports'; // Admin Screen: Dedicated 8 Standardized Reports Suite

export type StaffRole = 'it' | 'admin';
export type QueueFilterTab = 'ALL' | 'OPEN' | 'MY_ACTIVE' | 'RESL' | 'CLSD';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  title: string;
  avatar: string;
}

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'info' | 'warning';
}

export interface UISlice {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  activeOfficeLocationCode: string;
  setActiveOfficeLocationCode: (code: string) => void;
  toasts: ToastItem[];
  addToast: (title: string, description?: any, type?: 'success' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;
}

export const createUISlice: StateCreator<any, [], [], UISlice> = (set, get) => ({
  activeView:
    (typeof window !== 'undefined' &&
      (localStorage.getItem('tiketa_active_view') as ActiveView)) ||
    'overview',
  setActiveView: (view) => {
    localStorage.setItem('tiketa_active_view', view);
    if (typeof window !== 'undefined') {
      const canonical = view === 'overview' ? '/dashboard' : `/${view}`;
      const current = window.location.pathname;
      if (current !== canonical && !(canonical === '/dashboard' && current === '/overview')) {
        window.history.pushState(null, '', canonical);
      }
    }
    set({ activeView: view });
  },

  sidebarCollapsed: false,
  toggleSidebar: () => set((state: any) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  activeOfficeLocationCode: 'CMA',
  setActiveOfficeLocationCode: (code) => set({ activeOfficeLocationCode: code }),

  toasts: [],
  addToast: (title, description, type = 'success') => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    const safeDesc =
      typeof description === 'string'
        ? description
        : description != null
          ? (Array.isArray(description)
              ? description.map((item: any) => item?.msg || JSON.stringify(item)).join('; ')
              : typeof description === 'object' && description.msg
                ? description.msg
                : JSON.stringify(description))
          : undefined;

    set((state: any) => ({
      toasts: [...state.toasts, { id, title, description: safeDesc, type }],
    }));
    setTimeout(() => {
      get().removeToast(id);
    }, 3400);
  },
  removeToast: (id) =>
    set((state: any) => ({
      toasts: state.toasts.filter((t: ToastItem) => t.id !== id),
    })),
});
