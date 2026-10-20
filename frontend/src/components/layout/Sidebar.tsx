// @spec UI-LAYOUT-01: Nexora Categorized Dark Sidebar (#111315) with Role Isolation, Saved Repair Notes & Clean Logo
import React, { useState } from 'react';
import {
  Home,
  ChevronDown,
  ChevronRight,
  Wrench,
  BookOpen,
  FileSpreadsheet,
  Building2,
  LineChart,
  Users,
  ShieldCheck,
  LogOut,
  Box,
} from 'lucide-react';
import { useAppStore, ActiveView } from '../../store/useAppStore';

export const Sidebar: React.FC = () => {
  const {
    currentUser,
    logoutToKiosk,
    activeView,
    setActiveView,
    sidebarCollapsed,
    addToast,
  } = useAppStore();

  const [mainOpen, setMainOpen] = useState(true);
  const isAdmin = currentUser?.role === 'admin';

  return (
    <aside
      className={`${
        sidebarCollapsed ? 'w-[76px]' : 'w-[254px]'
      } shrink-0 bg-[#111315] text-zinc-300 flex flex-col justify-between transition-all duration-200 select-none z-20 border-r border-zinc-800/80`}
    >
      {/* Top Brand & Categorized Navigation */}
      <div className="p-4 space-y-6 overflow-y-auto flex-1">
        {/* Nexora-Style Brand Header (Clean TIKETA logo without 2.0 or IT Support text) */}
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
            {/* CATEGORY 1: MAIN (Personal KPI & Dispatch Dashboard) */}
            <div className="space-y-2">
              {!sidebarCollapsed && (
                <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  MAIN
                </div>
              )}

              <div>
                <button
                  onClick={() => {
                    if (sidebarCollapsed) {
                      setActiveView('overview');
                    } else {
                      setMainOpen((prev) => !prev);
                      setActiveView('overview');
                    }
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold text-xs shadow-md shadow-orange-950/40 transition-all press-fx"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Home className="w-4 h-4 shrink-0" />
                    {!sidebarCollapsed && (
                      <span className="truncate">My Dashboard</span>
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
                  <div className="mt-2 ml-2 pl-2 border-l border-zinc-800 space-y-1">
                    <button
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
                        <span className="truncate">My KPI &amp; Ticket Queue</span>
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

              <button
                onClick={() => setActiveView('workbench')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors press-fx ${
                  activeView === 'workbench'
                    ? 'bg-white/10 text-white font-semibold border border-orange-500/40'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5 font-medium'
                }`}
                title="My Active Workbench (Kanban, Checklist & Live Chat)"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Wrench className="w-4 h-4 text-orange-400 shrink-0" />
                  {!sidebarCollapsed && (
                    <span className="truncate">My Active Workbench</span>
                  )}
                </div>
                {!sidebarCollapsed && (
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
                )}
              </button>

              <button
                onClick={() => setActiveView('terminals')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors press-fx ${
                  activeView === 'terminals'
                    ? 'bg-white/10 text-white font-semibold border border-orange-500/40'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5 font-medium'
                }`}
                title="Terminal Hubs & PMS Tracker"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Building2 className="w-4 h-4 text-sky-400 shrink-0" />
                  {!sidebarCollapsed && (
                    <span className="truncate">Terminal Hubs &amp; PMS</span>
                  )}
                </div>
                {!sidebarCollapsed && (
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
                )}
              </button>
            </div>

            {/* CATEGORY 3: KNOWLEDGE & JOB LOGS */}
            <div className="space-y-1.5">
              {!sidebarCollapsed && (
                <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  KNOWLEDGE &amp; JOB LOGS
                </div>
              )}

              <button
                onClick={() => setActiveView('notes')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors press-fx ${
                  activeView === 'notes'
                    ? 'bg-white/10 text-white font-semibold border border-orange-500/40'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5 font-medium'
                }`}
                title="Saved Repair Notes & Troubleshooting Checklists"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
                  {!sidebarCollapsed && (
                    <span className="truncate">Saved Repair Notes</span>
                  )}
                </div>
                {!sidebarCollapsed && (
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
                )}
              </button>

              <button
                onClick={() => setActiveView('joblogs')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors press-fx ${
                  activeView === 'joblogs'
                    ? 'bg-white/10 text-white font-semibold border border-orange-500/40'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5 font-medium'
                }`}
                title="My Personal Job Logs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                  {!sidebarCollapsed && (
                    <span className="truncate">My Job Logs</span>
                  )}
                </div>
                {!sidebarCollapsed && (
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
                )}
              </button>
            </div>
          </>
        )}

        {/* ============================================================
            ADMIN CATEGORIZED NAVIGATION (When role === 'admin')
           ============================================================ */}
        {isAdmin && (
          <>
            {/* ADMIN CATEGORY 1: REPORTS & GOVERNANCE */}
            <div className="space-y-1.5">
              {!sidebarCollapsed && (
                <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  REPORTS &amp; GOVERNANCE
                </div>
              )}

              {(
                [
                  {
                    id: 'analytics' as ActiveView,
                    label: 'Executive Analytics',
                    icon: <LineChart className="w-4 h-4 text-orange-400" />,
                  },
                  {
                    id: 'team' as ActiveView,
                    label: 'IT Team Roster',
                    icon: <Users className="w-4 h-4 text-emerald-400" />,
                  },
                ] as const
              ).map((item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors press-fx ${
                      isActive
                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-md'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {item.icon}
                      {!sidebarCollapsed && <span>{item.label}</span>}
                    </div>
                    {!sidebarCollapsed && (
                      <ChevronRight className="w-3.5 h-3.5 text-white/70" />
                    )}
                  </button>
                );
              })}

              <button
                onClick={() =>
                  addToast(
                    '2-Tier RBAC Security Active',
                    'Argon2id + AES-256-GCM verified for Five Star Bus Co.',
                    'info'
                  )
                }
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-white/5 font-medium transition-colors press-fx"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-zinc-400 shrink-0" />
                  {!sidebarCollapsed && <span>Security &amp; Audit</span>}
                </div>
              </button>
            </div>

            {/* ADMIN CATEGORY 2: OPERATIONS & AUDIT LEDGERS */}
            <div className="space-y-1.5">
              {!sidebarCollapsed && (
                <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  OPERATIONS &amp; AUDIT LEDGERS
                </div>
              )}

              <button
                onClick={() => setActiveView('joblogs')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors press-fx ${
                  activeView === 'joblogs'
                    ? 'bg-white/10 text-white font-semibold'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                  {!sidebarCollapsed && <span>15-Col Master Sheet</span>}
                </div>
              </button>

              <button
                onClick={() => setActiveView('terminals')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors press-fx ${
                  activeView === 'terminals'
                    ? 'bg-white/10 text-white font-semibold'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-sky-400 shrink-0" />
                  {!sidebarCollapsed && <span>Terminal Hubs &amp; PMS</span>}
                </div>
              </button>

              <button
                onClick={() => setActiveView('notes')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors press-fx ${
                  activeView === 'notes'
                    ? 'bg-white/10 text-white font-semibold'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
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
