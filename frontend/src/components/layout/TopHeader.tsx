// @spec UI-LAYOUT-02: Nexora White Top Header with Functional Search, Notifications, Messages & Profile
import React, { useState, useEffect } from 'react';
import { Menu, Maximize2, Minimize2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { Ticket } from '../../types/ticket';
import { HeaderGlobalSearch } from './header/HeaderGlobalSearch';
import { HeaderNotificationsPopover } from './header/HeaderNotificationsPopover';
import { HeaderMessagesPopover } from './header/HeaderMessagesPopover';
import { HeaderProfilePopover } from './header/HeaderProfilePopover';

export const TopHeader: React.FC = () => {
  const currentUser = useAppStore((state) => state.currentUser);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  const searchQuery = useAppStore((state) => state.searchQuery);
  const setSearchQuery = useAppStore((state) => state.setSearchQuery);
  const tickets = useAppStore((state) => state.tickets);
  const setSelectedTicketId = useAppStore((state) => state.setSelectedTicketId);
  const setActiveView = useAppStore((state) => state.setActiveView);
  const claimTicket = useAppStore((state) => state.claimTicket);
  const copyTicketShareLink = useAppStore((state) => state.copyTicketShareLink);
  const openLogoutModal = useAppStore((state) => state.openLogoutModal);
  const addToast = useAppStore((state) => state.addToast);

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleClaimAndChat = (e: React.MouseEvent, ticket: Ticket) => {
    e.stopPropagation();
    claimTicket(ticket.id, currentUser?.name, currentUser?.id);
    setSelectedTicketId(ticket.id);
    addToast('Ticket Claimed', `You claimed ${ticket.ticketCode} (${ticket.task})`, 'success');
  };

  const handleCopyVerification = async (ticketCode: string) => {
    await copyTicketShareLink(ticketCode);
    addToast('Link Copied', `Employee verification URL copied for ${ticketCode}`, 'success');
  };

  return (
    <header className="h-16 bg-white border-b border-[#ECEEF2] px-6 flex items-center justify-between gap-4 shrink-0 z-30 relative">
      {/* Left: Signature Nexora Orange Square Hamburger Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="w-9 h-9 rounded-lg bg-orange-500 hover:bg-orange-600 active:scale-95 text-white flex items-center justify-center shadow-sm transition-all"
          aria-label="Toggle Sidebar"
          title="Toggle Sidebar"
        >
          <Menu className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Right Controls: Search, Hub Pill, Notification, Messages, Fullscreen, Profile */}
      <div className="flex items-center gap-3">
        {/* 1. Global Search */}
        <HeaderGlobalSearch
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          tickets={tickets}
          onSelectTicket={setSelectedTicketId}
          onViewQueue={() => setActiveView('tickets')}
        />

        {/* 2. Hub Status Pill matching Nexora Design */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F4F6F9] text-xs font-semibold text-ink">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>PH • 15 Hubs</span>
        </div>

        {/* 3. Notification Bell */}
        <HeaderNotificationsPopover
          tickets={tickets}
          onSelectTicket={setSelectedTicketId}
          onViewAllInQueue={() => setActiveView('tickets')}
          onCopyShareLink={handleCopyVerification}
        />

        {/* 4. Messages / Dispatches Icon */}
        <HeaderMessagesPopover
          tickets={tickets}
          onSelectTicket={setSelectedTicketId}
          onClaimAndChat={handleClaimAndChat}
        />

        {/* 5. Fullscreen Toggle */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="hidden lg:flex p-2 rounded-lg hover:bg-zinc-100 text-zinc-600 transition-colors active:scale-95"
          title={isFullscreen ? 'Exit Fullscreen' : 'Toggle Fullscreen'}
          aria-label="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        <div className="h-6 w-[1px] bg-zinc-200 hidden sm:block" />

        {/* 6. Staff Profile Popover */}
        <HeaderProfilePopover
          currentUser={currentUser}
          onSignOut={openLogoutModal}
        />
      </div>
    </header>
  );
};
