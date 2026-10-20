// @spec UI-LAYOUT-02: Nexora White Top Header with Orange Sidebar Toggle, Search, Badges & Profile
import React from 'react';
import {
  Menu,
  Search,
  Bell,
  Mail,
  Maximize2,
  LogOut,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const TopHeader: React.FC = () => {
  const {
    currentUser,
    toggleSidebar,
    searchQuery,
    setSearchQuery,
    tickets,
    logoutToKiosk,
    addToast,
  } = useAppStore();

  const openCount = tickets.filter((t) => t.status === 'OPEN').length;
  const pendingVerifyCount = tickets.filter((t) => t.status === 'RESL').length;

  return (
    <header className="h-16 bg-white border-b border-[#ECEEF2] px-6 flex items-center justify-between gap-4 shrink-0 z-10">
      {/* Left: Signature Nexora Orange Square Hamburger Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="w-9 h-9 rounded-lg bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center shadow-sm transition-colors press-fx"
          aria-label="Toggle Sidebar"
          title="Toggle Sidebar"
        >
          <Menu className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Right: Search Input, Status Pill, Notification Icons, User Profile & Sign Out */}
      <div className="flex items-center gap-3.5">
        {/* Global Search Input matching Nexora Top Bar */}
        <div className="relative hidden sm:block">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search anything..."
            className="pl-9 pr-4 py-1.5 bg-[#F4F6F9] border border-transparent focus:border-orange-400 focus:bg-white rounded-lg text-xs text-ink placeholder:text-zinc-400 focus:outline-none w-56 transition-all"
          />
        </div>

        {/* Language / Hub Pill matching Nexora "EN" badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F4F6F9] text-xs font-semibold text-ink">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>PH • 15 Hubs</span>
        </div>

        {/* Notification Bell with Orange Count Badge */}
        <button
          onClick={() =>
            addToast(
              'Pending Closure Verification',
              `${pendingVerifyCount} repaired ticket(s) waiting for terminal sign-off`,
              'info'
            )
          }
          className="relative p-2 rounded-lg hover:bg-zinc-100 text-zinc-600 transition-colors press-fx"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="px-1 min-w-[16px] h-4 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center absolute -top-0.5 -right-0.5">
            {pendingVerifyCount}
          </span>
        </button>

        {/* Unassigned Dispatches Badge Icon */}
        <button
          onClick={() =>
            addToast(
              'Unassigned Ticket Pool',
              `${openCount} open ticket(s) ready to be claimed`,
              'info'
            )
          }
          className="relative p-2 rounded-lg hover:bg-zinc-100 text-zinc-600 transition-colors press-fx"
          title="Unassigned Dispatches"
        >
          <Mail className="w-4 h-4" />
          <span className="px-1 min-w-[16px] h-4 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center absolute -top-0.5 -right-0.5">
            {openCount}
          </span>
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={() => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(() => {});
            } else {
              document.exitFullscreen().catch(() => {});
            }
          }}
          className="hidden lg:flex p-2 rounded-lg hover:bg-zinc-100 text-zinc-600 transition-colors press-fx"
          title="Toggle Fullscreen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <div className="h-6 w-[1px] bg-zinc-200 hidden sm:block" />

        {/* Staff Avatar + Name + Role matching "Json Taylor / Web Designer" */}
        <div className="flex items-center gap-2.5">
          <img
            src={
              currentUser?.avatar ??
              'https://api.dicebear.com/7.x/avataaars/svg?seed=Edward&backgroundColor=fed7aa'
            }
            alt={currentUser?.name ?? 'Staff'}
            className="w-8 h-8 rounded-full border border-orange-200 bg-orange-50 shrink-0"
          />
          <div className="hidden sm:block text-left leading-tight">
            <p className="text-xs font-bold text-ink">
              {currentUser?.name ?? 'Nathaniel Esguerra'}
            </p>
            <p className="text-[11px] text-zinc-500">
              {currentUser?.title ?? 'IT Support Specialist'}
            </p>
          </div>
        </div>

        {/* Return to Employee Ticket Screen Button */}
        <button
          onClick={logoutToKiosk}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F4F6F9] hover:bg-rose-50 hover:text-rose-600 text-zinc-600 border border-zinc-200/80 text-xs font-semibold transition-colors press-fx"
          title="Sign Out to Employee Ticket Screen"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Employee Screen</span>
        </button>
      </div>
    </header>
  );
};
