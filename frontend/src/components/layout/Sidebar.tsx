// @spec UI-LAYOUT-01: Nexora Categorized Dark Sidebar (#111315) with 4-Tier Role Layouts & Mobile Drawer
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Home,
  Inbox,
  Wrench,
  BookOpen,
  FileSpreadsheet,
  Building2,
  Users,
  BarChart3,
  X,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { StaffRole, ActiveView } from '../../store/slices/uiSlice';
import { getAllowedViewsForUser } from '../../utils/permissions';

export const Sidebar: React.FC = () => {
  const currentUser = useAppStore((state) => state.currentUser);
  const activeView = useAppStore((state) => state.activeView);
  const setActiveView = useAppStore((state) => state.setActiveView);
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed);
  const mobileSidebarOpen = useAppStore((state) => state.mobileSidebarOpen);
  const setMobileSidebarOpen = useAppStore((state) => state.setMobileSidebarOpen);
  const tickets = useAppStore((state) => state.tickets);

  const role: StaffRole = currentUser?.role ?? 'it';
  const allowedViews = getAllowedViewsForUser(currentUser);
  const isAdmin = role === 'admin';
  const isSupervisor = role === 'supervisor';
  const isIntern = role === 'intern';
  const isIT = role === 'it';

  // Badge count for active tickets
  const activeTicketsCount = tickets.filter((t) => t.status !== 'CLSD').length;

  // Close mobile drawer on Escape key or when window is resized to desktop
  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileSidebarOpen(false);
      }
    };
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [mobileSidebarOpen, setMobileSidebarOpen]);

  const handleBrandClick = () => {
    if (isAdmin || isSupervisor) {
      setActiveView('reports');
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
    isDrawer: boolean = false,
    badge?: number | string
  ) => {
    if (!allowedViews.includes(view)) return null;
    const isActive = activeView === view || (view === 'reports' && activeView === 'analytics');
    const showText = isDrawer || !sidebarCollapsed;

    return (
      <button
        type="button"
        onClick={() => {
          setActiveView(view);
          if (isDrawer) {
            setMobileSidebarOpen(false);
          }
        }}
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
          {showText && <span className="truncate">{label}</span>}
        </div>
        {showText && badge !== undefined && (
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

  const renderNavSections = (isDrawer: boolean) => (
    <>
      {/* TIER 1: INTERN NAVIGATION LAYOUT */}
      {isIntern && (
        <>
          <div className="space-y-1.5">
            {(isDrawer || !sidebarCollapsed) && (
              <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                MY DASHBOARD
              </div>
            )}
            {renderNavButton('overview', 'Personal KPIs', Home, 'text-orange-400', isDrawer)}
          </div>

          <div className="space-y-1.5">
            {(isDrawer || !sidebarCollapsed) && (
              <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                ACTIVE WORKBENCH
              </div>
            )}
            {renderNavButton('workbench', 'My Assigned Workbench', Wrench, 'text-orange-400', isDrawer)}
          </div>

          <div className="space-y-1.5">
            {(isDrawer || !sidebarCollapsed) && (
              <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                KNOWLEDGE &amp; LOGS
              </div>
            )}
            {renderNavButton('notes', 'Saved Repair Notes', BookOpen, 'text-amber-400', isDrawer)}
            {renderNavButton('joblogs', 'My Job Logs', FileSpreadsheet, 'text-emerald-400', isDrawer)}
          </div>
        </>
      )}

      {/* TIER 2: IT SUPPORT SPECIALIST */}
      {isIT && (
        <>
          <div className="space-y-1.5">
            {(isDrawer || !sidebarCollapsed) && (
              <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                MY DASHBOARD
              </div>
            )}
            {renderNavButton('overview', 'Personal KPIs', Home, 'text-orange-400', isDrawer)}
            {renderNavButton('joblogs', 'Job Logs', FileSpreadsheet, 'text-emerald-400', isDrawer)}
          </div>

          <div className="space-y-1.5">
            {(isDrawer || !sidebarCollapsed) && (
              <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                REPAIR OPERATIONS
              </div>
            )}
            {renderNavButton('tickets', 'Active Tickets', Inbox, 'text-sky-400', isDrawer, activeTicketsCount)}
            {renderNavButton('workbench', 'My Active Workbench', Wrench, 'text-orange-400', isDrawer)}
            {renderNavButton('terminals', 'Locations', Building2, 'text-teal-400', isDrawer)}
          </div>

          <div className="space-y-1.5">
            {(isDrawer || !sidebarCollapsed) && (
              <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                KNOWLEDGE BASE
              </div>
            )}
            {renderNavButton('notes', 'Saved Repair Notes', BookOpen, 'text-amber-400', isDrawer)}
          </div>
        </>
      )}

      {/* TIER 3: SUPERVISOR NAVIGATION */}
      {isSupervisor && (
        <>
          <div className="space-y-1.5">
            {(isDrawer || !sidebarCollapsed) && (
              <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                OPERATIONAL REPORTS
              </div>
            )}
            {renderNavButton('reports', 'Standard Reports', BarChart3, 'text-amber-400', isDrawer)}
          </div>

          <div className="space-y-1.5">
            {(isDrawer || !sidebarCollapsed) && (
              <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                GOVERNANCE &amp; AUDIT
              </div>
            )}
            {renderNavButton('terminals', 'Locations', Building2, 'text-teal-400', isDrawer)}
            {renderNavButton('team', 'IT Team & Accounts', Users, 'text-emerald-400', isDrawer)}
            {renderNavButton('joblogs', 'Job Logs', FileSpreadsheet, 'text-emerald-400', isDrawer)}
          </div>
        </>
      )}

      {/* TIER 4: SYSTEM ADMINISTRATOR */}
      {isAdmin && (
        <>
          <div className="space-y-1.5">
            {(isDrawer || !sidebarCollapsed) && (
              <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                MY DASHBOARD
              </div>
            )}
            {renderNavButton('overview', 'Personal KPIs', Home, 'text-orange-400', isDrawer)}
          </div>

          <div className="space-y-1.5">
            {(isDrawer || !sidebarCollapsed) && (
              <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                EXECUTIVE REPORTS
              </div>
            )}
            {renderNavButton('reports', 'Standard Reports', BarChart3, 'text-amber-400', isDrawer)}
            {renderNavButton('joblogs', 'Job Logs', FileSpreadsheet, 'text-emerald-400', isDrawer)}
          </div>

          <div className="space-y-1.5">
            {(isDrawer || !sidebarCollapsed) && (
              <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                OPERATIONS &amp; QUEUE TRIAGE
              </div>
            )}
            {renderNavButton('tickets', 'Active Tickets', Inbox, 'text-sky-400', isDrawer, activeTicketsCount)}
            {renderNavButton('workbench', 'My Active Workbench', Wrench, 'text-orange-400', isDrawer)}
            {renderNavButton('terminals', 'Locations', Building2, 'text-teal-400', isDrawer)}
          </div>

          <div className="space-y-1.5">
            {(isDrawer || !sidebarCollapsed) && (
              <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                STAFF GOVERNANCE
              </div>
            )}
            {renderNavButton('team', 'IT Team & Accounts', Users, 'text-emerald-400', isDrawer)}
          </div>

          <div className="space-y-1.5">
            {(isDrawer || !sidebarCollapsed) && (
              <div className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                KNOWLEDGE BASE
              </div>
            )}
            {renderNavButton('notes', 'Saved Repair Notes', BookOpen, 'text-amber-400', isDrawer)}
          </div>
        </>
      )}
    </>
  );

  return (
    <>
      {/* 1. Desktop & Tablet Static Sidebar (Hidden on mobile < md) */}
      <aside
        className={`hidden md:flex ${
          sidebarCollapsed ? 'w-[76px]' : 'w-[254px]'
        } shrink-0 bg-[#111315] text-zinc-300 flex-col justify-between transition-all duration-200 select-none z-20 border-r border-zinc-800/80`}
      >
        <div className="p-4 space-y-6 overflow-y-auto flex-1">
          {/* Nexora-Style Brand Header */}
          <div
            onClick={handleBrandClick}
            className="flex items-center gap-3 px-2 pt-1 cursor-pointer group"
          >
            {sidebarCollapsed ? (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 hover:scale-105 transition-transform">
                <img src="/logo-mark.svg" alt="Tiketa" className="w-8 h-8 object-contain drop-shadow" />
              </div>
            ) : (
              <div className="flex items-center gap-2.5 min-w-0 py-0.5">
                <img src="/logo-dark.svg" alt="Tiketa" className="h-7 w-auto object-contain object-left drop-shadow shrink-0" />
                <span className="text-[10px] font-mono font-bold text-orange-400 uppercase tracking-wider px-2 py-0.5 rounded-md bg-orange-500/15 border border-orange-500/30 whitespace-nowrap">
                  {getRoleBadgeLabel(role)}
                </span>
              </div>
            )}
          </div>

          {renderNavSections(false)}
        </div>
      </aside>

      {/* 2. Mobile Responsive Slide-Over Drawer (Only rendered on mobile when open) */}
      {mobileSidebarOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="md:hidden fixed inset-0 z-[100] flex">
            {/* Dimmed Backdrop Overlay */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200"
              onClick={(e) => {
                e.stopPropagation();
                setMobileSidebarOpen(false);
              }}
              aria-hidden="true"
            />

            {/* Slide-In Dark Drawer */}
            <aside
              className="relative w-[280px] max-w-[85vw] h-full bg-[#111315] text-zinc-300 flex flex-col justify-between shadow-2xl border-r border-zinc-800/80 select-none z-[101]"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile Navigation Drawer"
            >
              {/* Header with Logo, Role Badge, and Close Button */}
              <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between shrink-0">
                <div
                  onClick={() => {
                    handleBrandClick();
                    setMobileSidebarOpen(false);
                  }}
                  className="flex items-center gap-2.5 cursor-pointer group"
                >
                  <img src="/logo-dark.svg" alt="Tiketa" className="h-7 w-auto object-contain object-left drop-shadow shrink-0" />
                  <span className="text-[10px] font-mono font-bold text-orange-400 uppercase tracking-wider px-2 py-0.5 rounded-md bg-orange-500/15 border border-orange-500/30 whitespace-nowrap">
                    {getRoleBadgeLabel(role)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="w-8 h-8 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-all active:scale-95"
                  aria-label="Close Navigation"
                  title="Close Navigation"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Categorized Navigation List */}
              <div className="p-4 space-y-6 overflow-y-auto flex-1">
                {renderNavSections(true)}
              </div>
            </aside>
          </div>,
          document.body
        )}
    </>
  );
};
