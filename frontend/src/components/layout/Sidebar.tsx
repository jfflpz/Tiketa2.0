// @spec UI-LAYOUT-01: Nexora Categorized Dark Sidebar (#111315) with 4-Tier Role Layouts
import React, { useState } from 'react';
import {
  Home,
  ChevronDown,
  ChevronRight,
  Inbox,
  Wrench,
  BookOpen,
  FileSpreadsheet,
  Building2,
  LineChart,
  Users,
  BarChart3,
  Layers,
  LogOut,
  Box,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { StaffRole, ActiveView } from '../../store/slices/uiSlice';

export const Sidebar: React.FC = () => {
  const currentUser = useAppStore((state) => state.currentUser);
  const openLogoutModal = useAppStore((state) => state.openLogoutModal);
  const activeView = useAppStore((state) => state.activeView);
  const setActiveView = useAppStore((state) => state.setActiveView);
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed);
  const tickets = useAppStore((state) => state.tickets);

  const [itDashboardOpen, setItDashboardOpen] = useState(true);
  const [adminAnalyticsOpen, setAdminAnalyticsOpen] = useState(true);

  const role: StaffRole = currentUser?.role ?? 'it';
  const isAdmin = role === 'admin';
  const isSupervisorOrAnalyst = role === 'supervisor' || role === 'analyst';
  const isIntern = role === 'intern';
  const isIT = role === 'it';

  // Badge count for active tickets
  const activeTicketsCount = tickets.filter((t) => t.status !== 'CLSD').length;

  const isOverviewGroupActive = activeView === 'overview' || activeView === 'joblogs';
  const isAnalyticsGroupActive =
    activeView === 'analytics' || activeView === 'reports' || activeView === 'joblogs';

  const handleBrandClick = () => {
    if (isAdmin || isSupervisorOrAnalyst) {
      setActiveView('analytics');
    } else {
      setActiveView('overview');
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
                {role.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* ============================================================
            TIER 1: INTERN NAVIGATION LAYOUT (role === 'intern')
            Restricted to assigned tickets, overview, personal notes & logs
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
              {renderNavButton('overview', 'KPI Overview', Home, 'text-orange-400')}
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
            Full operational fleet triage, workbench, and terminal hubs
           ============================================================ */}
        {isIT && (
          <>
            {/* CATEGORY 1: MY DASHBOARD */}
            <div className="space-y-2">
              {!sidebarCollapsed && (
                <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  MY DASHBOARD
                </div>
              )}

              <div>
                <button
                  type="button"
                  onClick={() => {
                    if (sidebarCollapsed) {
                      setActiveView('overview');
                    } else {
                      setItDashboardOpen((prev) => !prev);
                      setActiveView('overview');
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold text-xs transition-all press-fx ${
                    (itDashboardOpen ? activeView === 'overview' : isOverviewGroupActive)
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-950/40'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Home className="w-4 h-4 shrink-0" />
                    {!sidebarCollapsed && <span className="truncate">KPI Overview</span>}
                  </div>
                  {!sidebarCollapsed && (
                    <div className="flex items-center gap-1.5">
                      {itDashboardOpen ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </div>
                  )}
                </button>

                {!sidebarCollapsed && itDashboardOpen && (
                  <div className="mt-1 ml-2 pl-2 border-l border-zinc-800 space-y-1">
                    <button
                      type="button"
                      onClick={() => setActiveView('overview')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all press-fx ${
                        activeView === 'overview'
                          ? 'text-white font-semibold bg-white/10'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            activeView === 'overview'
                              ? 'bg-orange-500 ring-4 ring-orange-500/20'
                              : 'bg-zinc-600'
                          }`}
                        />
                        <span className="truncate">Personal KPIs</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveView('joblogs')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all press-fx ${
                        activeView === 'joblogs'
                          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-md shadow-orange-950/40'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileSpreadsheet
                          className={`w-3.5 h-3.5 shrink-0 ${
                            activeView === 'joblogs' ? 'text-white' : 'text-emerald-400'
                          }`}
                        />
                        <span className="truncate">15-Col Job Logs</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
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
            Executive analytics, standardized reporting, governance & triage
           ============================================================ */}
        {isSupervisorOrAnalyst && (
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

            {/* CATEGORY 3: OPERATIONS & FLEET MONITOR */}
            <div className="space-y-1.5">
              {!sidebarCollapsed && (
                <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  {role === 'supervisor' ? 'OPERATIONS & FLEET TRIAGE' : 'FLEET MONITOR'}
                </div>
              )}
              {role === 'supervisor' && (
                <>
                  {renderNavButton(
                    'tickets',
                    'Active Ticket Lists',
                    Layers,
                    'text-sky-400',
                    activeTicketsCount
                  )}
                  {renderNavButton('terminals', 'Terminal Hubs Monitor', Building2, 'text-teal-400')}
                  {renderNavButton('notes', 'Saved Repair Notes', BookOpen, 'text-amber-400')}
                </>
              )}
              {role === 'analyst' && (
                <>
                  {renderNavButton('overview', 'Fleet Overview', Home, 'text-orange-400')}
                  {renderNavButton('terminals', 'Terminal Hubs Monitor', Building2, 'text-teal-400')}
                </>
              )}
            </div>
          </>
        )}

        {/* ============================================================
            TIER 4: SYSTEM ADMINISTRATOR (role === 'admin')
            Full suite across all categories with zero screen duplicates
           ============================================================ */}
        {isAdmin && (
          <>
            {/* ADMIN CATEGORY 1: EXECUTIVE ANALYTICS */}
            <div className="space-y-2">
              {!sidebarCollapsed && (
                <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  EXECUTIVE ANALYTICS
                </div>
              )}

              <div>
                <button
                  type="button"
                  onClick={() => {
                    if (sidebarCollapsed) {
                      setActiveView('analytics');
                    } else {
                      setAdminAnalyticsOpen((prev) => !prev);
                      setActiveView('analytics');
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold text-xs transition-all press-fx ${
                    (adminAnalyticsOpen ? activeView === 'analytics' : isAnalyticsGroupActive)
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-950/40'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <LineChart className="w-4 h-4 shrink-0" />
                    {!sidebarCollapsed && <span className="truncate">Executive Analytics</span>}
                  </div>
                  {!sidebarCollapsed && (
                    <div className="flex items-center gap-1.5">
                      {adminAnalyticsOpen ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </div>
                  )}
                </button>

                {!sidebarCollapsed && adminAnalyticsOpen && (
                  <div className="mt-1 ml-2 pl-2 border-l border-zinc-800 space-y-1">
                    <button
                      type="button"
                      onClick={() => setActiveView('analytics')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all press-fx ${
                        activeView === 'analytics'
                          ? 'text-white font-semibold bg-white/10'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            activeView === 'analytics'
                              ? 'bg-orange-500 ring-4 ring-orange-500/20'
                              : 'bg-zinc-600'
                          }`}
                        />
                        <span className="truncate">Overview &amp; KPIs</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveView('reports')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all press-fx ${
                        activeView === 'reports'
                          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-md shadow-orange-950/40'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <BarChart3
                          className={`w-3.5 h-3.5 shrink-0 ${
                            activeView === 'reports' ? 'text-white' : 'text-amber-400'
                          }`}
                        />
                        <span className="truncate">8 Standard Reports</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveView('joblogs')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all press-fx ${
                        activeView === 'joblogs'
                          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-md shadow-orange-950/40'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileSpreadsheet
                          className={`w-3.5 h-3.5 shrink-0 ${
                            activeView === 'joblogs' ? 'text-white' : 'text-emerald-400'
                          }`}
                        />
                        <span className="truncate">15-Col Master Sheet</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ADMIN CATEGORY 2: OPERATIONS & FLEET TRIAGE */}
            <div className="space-y-1.5">
              {!sidebarCollapsed && (
                <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  OPERATIONS &amp; FLEET TRIAGE
                </div>
              )}
              {renderNavButton(
                'tickets',
                'Active Ticket Lists',
                Layers,
                'text-sky-400',
                activeTicketsCount
              )}
              {renderNavButton('workbench', 'My Active Workbench', Wrench, 'text-orange-400')}
              {renderNavButton('terminals', 'Terminal Hubs Monitor', Building2, 'text-teal-400')}
            </div>

            {/* ADMIN CATEGORY 3: STAFF GOVERNANCE */}
            <div className="space-y-1.5">
              {!sidebarCollapsed && (
                <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  STAFF GOVERNANCE
                </div>
              )}
              {renderNavButton('team', 'IT Team & Accounts', Users, 'text-emerald-400')}
            </div>

            {/* ADMIN CATEGORY 4: KNOWLEDGE BASE */}
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

      {/* Bottom User Session Footer */}
      <div className="p-3.5 border-t border-zinc-800/80 bg-[#0D0F11]">
        <div className="flex items-center justify-between px-1.5 py-1 rounded-xl">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={
                currentUser?.avatar ??
                'https://api.dicebear.com/7.x/avataaars/svg?seed=Edward&backgroundColor=fed7aa'
              }
              alt={currentUser?.name ?? 'Staff'}
              className="w-8 h-8 rounded-full border border-zinc-700 bg-zinc-800 shrink-0"
            />
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {currentUser?.name ?? 'Staff User'}
                </p>
                <p className="text-[11px] text-zinc-400 truncate">
                  {currentUser?.title ?? role.toUpperCase()}
                </p>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <button
              type="button"
              onClick={openLogoutModal}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-orange-400 hover:bg-white/5 transition-colors press-fx"
              title="Sign Out to Employee Ticket Screen"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
