// @spec UI-LAYOUT-01: Nexora Categorized Dark Sidebar (#111315) with Separated Staff & Knowledge Governance & Active Orange Highlights
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

export const Sidebar: React.FC = () => {
  const {
    currentUser,
    logoutToKiosk,
    activeView,
    setActiveView,
    sidebarCollapsed,
    tickets,
  } = useAppStore();

  const [mainOpen, setMainOpen] = useState(true);
  const [adminAnalyticsOpen, setAdminAnalyticsOpen] = useState(true);
  const isAdmin = currentUser?.role === 'admin';

  // Badge count for active tickets
  const activeTicketsCount = tickets.filter((t) => t.status !== 'CLSD').length;

  const isOverviewGroupActive = activeView === 'overview' || activeView === 'joblogs';
  const isAnalyticsGroupActive =
    activeView === 'analytics' || activeView === 'reports' || activeView === 'joblogs';

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
          onClick={() => setActiveView(isAdmin ? 'analytics' : 'overview')}
          className="flex items-center gap-3 px-2 pt-1 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/40 text-orange-500 flex items-center justify-center shadow-sm shrink-0 group-hover:bg-orange-500 group-hover:text-white transition-colors">
            <Box className="w-4 h-4 stroke-[2.4]" />
          </div>
          {!sidebarCollapsed && (
            <span className="font-extrabold text-base tracking-wider text-white uppercase">
              TIKETA
            </span>
          )}
        </div>

        {/* ============================================================
            IT SUPPORT CATEGORIZED NAVIGATION (When role === 'it')
            Each screen appears in ONLY ONE category (Zero Duplicates!)
           ============================================================ */}
        {!isAdmin && (
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
                      setMainOpen((prev) => !prev);
                      setActiveView('overview');
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold text-xs transition-all press-fx ${
                    (mainOpen ? activeView === 'overview' : isOverviewGroupActive)
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-950/40'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Home className="w-4 h-4 shrink-0" />
                    {!sidebarCollapsed && (
                      <span className="truncate">KPI Overview</span>
                    )}
                  </div>
                  {!sidebarCollapsed && (
                    <div className="flex items-center gap-1.5">
                      {mainOpen ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </div>
                  )}
                </button>

                {!sidebarCollapsed && mainOpen && (
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

                    {/* Job Logs is under MY DASHBOARD */}
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

              {/* 1. Dedicated Active Ticket Lists Screen Button */}
              <button
                type="button"
                onClick={() => setActiveView('tickets')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all press-fx ${
                  activeView === 'tickets'
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-md shadow-orange-950/40'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5 font-medium'
                }`}
                title="Active Ticket Lists (Table & 3-Col Kanban)"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Inbox
                    className={`w-4 h-4 shrink-0 ${
                      activeView === 'tickets' ? 'text-white' : 'text-sky-400'
                    }`}
                  />
                  {!sidebarCollapsed && (
                    <span className="truncate">Active Ticket Lists</span>
                  )}
                </div>
                {!sidebarCollapsed && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      activeView === 'tickets'
                        ? 'bg-black/25 text-white'
                        : 'bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    {activeTicketsCount}
                  </span>
                )}
              </button>

              {/* 2. My Active Workbench Screen Button */}
              <button
                type="button"
                onClick={() => setActiveView('workbench')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all press-fx ${
                  activeView === 'workbench'
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-md shadow-orange-950/40'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5 font-medium'
                }`}
                title="My Active Workbench (Focused Ticket & Live Chat)"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Wrench
                    className={`w-4 h-4 shrink-0 ${
                      activeView === 'workbench' ? 'text-white' : 'text-orange-400'
                    }`}
                  />
                  {!sidebarCollapsed && (
                    <span className="truncate">My Active Workbench</span>
                  )}
                </div>
              </button>

              {/* 3. Terminal Hubs Screen Button */}
              <button
                type="button"
                onClick={() => setActiveView('terminals')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all press-fx ${
                  activeView === 'terminals'
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-md shadow-orange-950/40'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5 font-medium'
                }`}
                title="15 Bus Terminal Hubs Monitor"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Building2
                    className={`w-4 h-4 shrink-0 ${
                      activeView === 'terminals' ? 'text-white' : 'text-teal-400'
                    }`}
                  />
                  {!sidebarCollapsed && (
                    <span className="truncate">Terminal Hubs</span>
                  )}
                </div>
              </button>
            </div>

            {/* CATEGORY 3: KNOWLEDGE BASE */}
            <div className="space-y-1.5">
              {!sidebarCollapsed && (
                <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  KNOWLEDGE BASE
                </div>
              )}

              {/* Saved Repair Notes */}
              <button
                type="button"
                onClick={() => setActiveView('notes')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all press-fx ${
                  activeView === 'notes'
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-md shadow-orange-950/40'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5 font-medium'
                }`}
                title="Saved Repair Notes & Troubleshooting Guides"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <BookOpen
                    className={`w-4 h-4 shrink-0 ${
                      activeView === 'notes' ? 'text-white' : 'text-amber-400'
                    }`}
                  />
                  {!sidebarCollapsed && (
                    <span className="truncate">Saved Repair Notes</span>
                  )}
                </div>
              </button>
            </div>
          </>
        )}

        {/* ============================================================
            ADMIN CATEGORIZED NAVIGATION (When role === 'admin')
           ============================================================ */}
        {isAdmin && (
          <>
            {/* ADMIN CATEGORY 1: EXECUTIVE ANALYTICS (With Dropdown Accordion) */}
            <div className="space-y-2">
              {!sidebarCollapsed && (
                <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  EXECUTIVE ANALYTICS
                </div>
              )}

              <div>
                {/* Primary Orange Header with Dropdown Accordion */}
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
                    {!sidebarCollapsed && (
                      <span className="truncate">Executive Analytics</span>
                    )}
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
                    {/* Sub-item 1: Overview & KPIs */}
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

                    {/* Sub-item 2: 8 Standardized Reports Suite */}
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

                    {/* Sub-item 3: 15-Col Master Sheet (Included in analytics category) */}
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

              {/* Active Ticket Lists & Triage */}
              <button
                type="button"
                onClick={() => setActiveView('tickets')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all press-fx ${
                  activeView === 'tickets'
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-md shadow-orange-950/40'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Layers
                    className={`w-4 h-4 shrink-0 ${
                      activeView === 'tickets' ? 'text-white' : 'text-sky-400'
                    }`}
                  />
                  {!sidebarCollapsed && <span>Active Ticket Lists</span>}
                </div>
                {!sidebarCollapsed && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      activeView === 'tickets'
                        ? 'bg-black/25 text-white'
                        : 'bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    {activeTicketsCount}
                  </span>
                )}
              </button>

              {/* Terminal Hubs Monitor */}
              <button
                type="button"
                onClick={() => setActiveView('terminals')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all press-fx ${
                  activeView === 'terminals'
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-md shadow-orange-950/40'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Building2
                    className={`w-4 h-4 shrink-0 ${
                      activeView === 'terminals' ? 'text-white' : 'text-teal-400'
                    }`}
                  />
                  {!sidebarCollapsed && <span>Terminal Hubs Monitor</span>}
                </div>
              </button>
            </div>

            {/* ADMIN CATEGORY 3: STAFF GOVERNANCE */}
            <div className="space-y-1.5">
              {!sidebarCollapsed && (
                <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  STAFF GOVERNANCE
                </div>
              )}

              {/* IT Team & Accounts */}
              <button
                type="button"
                onClick={() => setActiveView('team')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all press-fx ${
                  activeView === 'team'
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-md shadow-orange-950/40'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users
                    className={`w-4 h-4 shrink-0 ${
                      activeView === 'team' ? 'text-white' : 'text-emerald-400'
                    }`}
                  />
                  {!sidebarCollapsed && <span>IT Team &amp; Accounts</span>}
                </div>
              </button>
            </div>

            {/* ADMIN CATEGORY 4: KNOWLEDGE BASE */}
            <div className="space-y-1.5">
              {!sidebarCollapsed && (
                <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  KNOWLEDGE BASE
                </div>
              )}

              {/* Saved Repair Notes */}
              <button
                type="button"
                onClick={() => setActiveView('notes')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all press-fx ${
                  activeView === 'notes'
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-md shadow-orange-950/40'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen
                    className={`w-4 h-4 shrink-0 ${
                      activeView === 'notes' ? 'text-white' : 'text-amber-400'
                    }`}
                  />
                  {!sidebarCollapsed && <span>Saved Repair Notes</span>}
                </div>
              </button>
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
                  {currentUser?.name ?? 'Nathaniel D. Esguerra'}
                </p>
                <p className="text-[11px] text-zinc-400 truncate">
                  {currentUser?.title ?? 'IT Support Specialist'}
                </p>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <button
              type="button"
              onClick={logoutToKiosk}
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
