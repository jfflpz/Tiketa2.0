// @spec UI-LAYOUT-01: Nexora Categorized Dark Sidebar (#111315) with 4-Tier Role Layouts
import React from 'react';
import {
  Home,
  Inbox,
  Wrench,
  BookOpen,
  FileSpreadsheet,
  Building2,
  LineChart,
  Users,
  BarChart3,
  Box,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { StaffRole, ActiveView } from '../../store/slices/uiSlice';

export const Sidebar: React.FC = () => {
  const currentUser = useAppStore((state) => state.currentUser);
  const activeView = useAppStore((state) => state.activeView);
  const setActiveView = useAppStore((state) => state.setActiveView);
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed);
  const tickets = useAppStore((state) => state.tickets);

  const role: StaffRole = currentUser?.role ?? 'it';
  const isAdmin = role === 'admin';
  const isSupervisor = role === 'supervisor';
  const isIntern = role === 'intern';
  const isIT = role === 'it';
  const isAnalyst = role === 'analyst';

  // Badge count for active tickets
  const activeTicketsCount = tickets.filter((t) => t.status !== 'CLSD').length;

  const handleBrandClick = () => {
    if (isAdmin || isSupervisor || isAnalyst) {
      setActiveView('analytics');
    } else if (isIntern) {
      setActiveView('workbench');
    } else {
      setActiveView('overview');
    }
  };

  const getRoleBadgeLabel = (r: StaffRole): string => {
    switch (r) {
      case 'admin':
        return 'ADMIN';
      case 'supervisor':
        return 'SUPERVISOR';
      case 'analyst':
        return 'ANALYST';
      case 'intern':
        return 'INTERN';
      case 'it':
      default:
        return 'IT SUPPORT';
    }
  };

  const renderNavButton = (
    view: ActiveView,
    label: string,
    Icon: React.ElementType,
    iconColor: string,
    badge?: number | string
  ) => {
    const isActive = activeView === view;
    return (
      <button
        type="button"
        onClick={() => setActiveView(view)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all press-fx ${
          isActive
            ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-md shadow-orange-950/40'
            : 'text-zinc-400 hover:text-white hover:bg-white/5 font-medium'
        }`}
        title={label}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon
            className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : iconColor}`}
          />
          {!sidebarCollapsed && <span className="truncate">{label}</span>}
        </div>
        {!sidebarCollapsed && badge !== undefined && (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isActive ? 'bg-black/25 text-white' : 'bg-zinc-800 text-zinc-300'
            }`}
          >
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside
      className={`${
        sidebarCollapsed ? 'w-[76px]' : 'w-[254px]'
      } shrink-0 bg-[#111315] text-zinc-300 flex flex-col justify-between transition-all duration-200 select-none z-20 border-r border-zinc-800/80`}
    >
      {/* Top Brand & Categorized Navigation */}
      <div className="p-4 space-y-6 overflow-y-auto flex-1">
        {/* Nexora-Style Brand Header */}
        <div
          onClick={handleBrandClick}
          className="flex items-center gap-3 px-2 pt-1 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/40 text-orange-500 flex items-center justify-center shadow-sm shrink-0 group-hover:bg-orange-500 group-hover:text-white transition-colors">
            <Box className="w-4 h-4 stroke-[2.4]" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-base tracking-wider text-white uppercase leading-none">
                TIKETA
              </span>
              <span className="text-[10px] font-mono text-orange-400 uppercase tracking-widest mt-0.5">
                {getRoleBadgeLabel(role)}
              </span>
            </div>
          )}
        </div>

        {/* ============================================================
            TIER 1: INTERN NAVIGATION LAYOUT (role === 'intern')
            Restricted ONLY to: Personal KPIs, Workbench, Notes, Job Logs
           ============================================================ */}
        {isIntern && (
          <>
            {/* CATEGORY 1: MY DASHBOARD */}
            <div className="space-y-1.5">
              {!sidebarCollapsed && (
                <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  MY DASHBOARD
                </div>
              )}
              {renderNavButton('overview', 'Personal KPIs', Home, 'text-orange-400')}
            </div>

            {/* CATEGORY 2: ACTIVE WORKBENCH */}
            <div className="space-y-1.5">
              {!sidebarCollapsed && (
                <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  ACTIVE WORKBENCH
                </div>
              )}
              {renderNavButton('workbench', 'My Assigned Workbench', Wrench, 'text-orange-400')}
            </div>

            {/* CATEGORY 3: KNOWLEDGE & LOGS */}
            <div className="space-y-1.5">
              {!sidebarCollapsed && (
                <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  KNOWLEDGE &amp; LOGS
                </div>
              )}
              {renderNavButton('notes', 'Saved Repair Notes', BookOpen, 'text-amber-400')}
              {renderNavButton('joblogs', 'My Job Logs', FileSpreadsheet, 'text-emerald-400')}
            </div>
          </>
        )}

        {/* ============================================================
            TIER 2: IT SUPPORT SPECIALIST (role === 'it')
            Personal KPIs at top of MY DASHBOARD, followed by Job Logs
           ============================================================ */}
        {isIT && (
          <>
            {/* CATEGORY 1: MY DASHBOARD */}
            <div className="space-y-1.5">
              {!sidebarCollapsed && (
                <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  MY DASHBOARD
                </div>
              )}
              {renderNavButton('overview', 'Personal KPIs', Home, 'text-orange-400')}
              {renderNavButton('joblogs', '15-Col Job Logs', FileSpreadsheet, 'text-emerald-400')}
            </div>

            {/* CATEGORY 2: REPAIR OPERATIONS */}
            <div className="space-y-1.5">
              {!sidebarCollapsed && (
                <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  REPAIR OPERATIONS
                </div>
              )}
              {renderNavButton(
                'tickets',
                'Active Ticket Lists',
                Inbox,
                'text-sky-400',
                activeTicketsCount
              )}
              {renderNavButton('workbench', 'My Active Workbench', Wrench, 'text-orange-400')}
              {renderNavButton('terminals', 'Terminal Hubs', Building2, 'text-teal-400')}
            </div>

            {/* CATEGORY 3: KNOWLEDGE BASE */}
            <div className="space-y-1.5">
              {!sidebarCollapsed && (
                <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  KNOWLEDGE BASE
                </div>
              )}
              {renderNavButton('notes', 'Saved Repair Notes', BookOpen, 'text-amber-400')}
            </div>
          </>
        )}

        {/* ============================================================
            TIER 3: SUPERVISOR & ANALYST NAVIGATION (role === 'supervisor' | 'analyst')
            Executive analytics, 8 standard reports, IT team & fleet logs
           ============================================================ */}
        {(isSupervisor || isAnalyst) && (
          <>
            {/* CATEGORY 1: OPERATIONAL ANALYTICS */}
            <div className="space-y-1.5">
              {!sidebarCollapsed && (
                <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  OPERATIONAL ANALYTICS
                </div>
              )}
              {renderNavButton('analytics', 'Executive Analytics', LineChart, 'text-orange-400')}
              {renderNavButton('reports', '8 Standard Reports', BarChart3, 'text-amber-400')}
            </div>

            {/* CATEGORY 2: GOVERNANCE & AUDIT */}
            <div className="space-y-1.5">
              {!sidebarCollapsed && (
                <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  GOVERNANCE &amp; AUDIT
                </div>
              )}
              {renderNavButton('team', 'IT Team & Accounts', Users, 'text-emerald-400')}
              {renderNavButton('joblogs', 'Fleet Master Job Logs', FileSpreadsheet, 'text-emerald-400')}
            </div>
          </>
        )}

        {/* ============================================================
            TIER 4: SYSTEM ADMINISTRATOR (role === 'admin')
            Personal KPIs at top under MY DASHBOARD, followed by Executive Analytics
           ============================================================ */}
        {isAdmin && (
          <>
            {/* ADMIN CATEGORY 1: MY DASHBOARD */}
            <div className="space-y-1.5">
              {!sidebarCollapsed && (
                <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  MY DASHBOARD
                </div>
              )}
              {renderNavButton('overview', 'Personal KPIs', Home, 'text-orange-400')}
            </div>

            {/* ADMIN CATEGORY 2: EXECUTIVE ANALYTICS */}
            <div className="space-y-1.5">
              {!sidebarCollapsed && (
                <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  EXECUTIVE ANALYTICS
                </div>
              )}
              {renderNavButton('analytics', 'Executive Analytics', LineChart, 'text-orange-400')}
              {renderNavButton('reports', '8 Standard Reports', BarChart3, 'text-amber-400')}
              {renderNavButton('joblogs', '15-Col Master Sheet', FileSpreadsheet, 'text-emerald-400')}
            </div>

            {/* ADMIN CATEGORY 3: OPERATIONS & FLEET TRIAGE */}
            <div className="space-y-1.5">
              {!sidebarCollapsed && (
                <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  OPERATIONS &amp; FLEET TRIAGE
                </div>
              )}
              {renderNavButton(
                'tickets',
                'Active Ticket Lists',
                Inbox,
                'text-sky-400',
                activeTicketsCount
              )}
              {renderNavButton('workbench', 'My Active Workbench', Wrench, 'text-orange-400')}
              {renderNavButton('terminals', 'Terminal Hubs Monitor', Building2, 'text-teal-400')}
            </div>

            {/* ADMIN CATEGORY 4: STAFF GOVERNANCE */}
            <div className="space-y-1.5">
              {!sidebarCollapsed && (
                <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  STAFF GOVERNANCE
                </div>
              )}
              {renderNavButton('team', 'IT Team & Accounts', Users, 'text-emerald-400')}
            </div>

            {/* ADMIN CATEGORY 5: KNOWLEDGE BASE */}
            <div className="space-y-1.5">
              {!sidebarCollapsed && (
                <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  KNOWLEDGE BASE
                </div>
              )}
              {renderNavButton('notes', 'Saved Repair Notes', BookOpen, 'text-amber-400')}
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
