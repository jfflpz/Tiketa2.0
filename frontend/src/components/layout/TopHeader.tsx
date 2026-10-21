// @spec UI-LAYOUT-02: Nexora White Top Header with Functional Search, Notifications, Messages & Profile
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Menu,
  Search,
  Bell,
  Mail,
  Maximize2,
  Minimize2,
  LogOut,
  X,
  CheckCircle2,
  Clock,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { Ticket } from '../../types/ticket';

export const TopHeader: React.FC = () => {
  const {
    currentUser,
    toggleSidebar,
    searchQuery,
    setSearchQuery,
    tickets,
    setSelectedTicketId,
    setActiveView,
    claimTicket,
    copyTicketShareLink,
    logoutToKiosk,
    addToast,
  } = useAppStore();

  // Popover state
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mailOpen, setMailOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [mailTab, setMailTab] = useState<'chats' | 'unassigned'>('chats');

  // DOM Refs for click-outside detection
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const mailRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Global click-outside & keyboard shortcut listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (searchRef.current && !searchRef.current.contains(target)) {
        setSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false);
      }
      if (mailRef.current && !mailRef.current.contains(target)) {
        setMailOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape closes any open popover
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setNotifOpen(false);
        setMailOpen(false);
        setProfileOpen(false);
      }
      // Ctrl+K or '/' focuses the search input
      if (
        (e.ctrlKey && e.key.toLowerCase() === 'k') ||
        (e.key === '/' &&
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA')
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Filtered tickets for global search
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tickets.slice(0, 5); // Default to recent 5 tickets
    return tickets
      .filter(
        (t) =>
          t.ticketCode.toLowerCase().includes(q) ||
          t.requestor.toLowerCase().includes(q) ||
          t.task.toLowerCase().includes(q) ||
          t.location.toLowerCase().includes(q) ||
          t.department.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [tickets, searchQuery]);

  // Notifications calculation: Pending employee verification + High/Critical alerts
  const pendingVerifications = useMemo(
    () => tickets.filter((t) => t.status === 'RESL'),
    [tickets]
  );

  const priorityAlerts = useMemo(
    () =>
      tickets.filter(
        (t) =>
          (t.priority === 'Critical' || t.priority === 'High') &&
          t.status !== 'CLSD' &&
          t.status !== 'RESL'
      ),
    [tickets]
  );

  const totalNotifCount = pendingVerifications.length + priorityAlerts.length;

  // Messages calculation: Tickets with chat messages + Unassigned open tickets
  const ticketsWithMessages = useMemo(
    () => tickets.filter((t) => t.messages && t.messages.length > 0),
    [tickets]
  );

  const unassignedTickets = useMemo(
    () => tickets.filter((t) => t.status === 'OPEN' && !t.workedBy),
    [tickets]
  );

  const totalMailCount = ticketsWithMessages.length + unassignedTickets.length;

  // Quick ticket selection from any popover
  const handleSelectTicket = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setSearchOpen(false);
    setNotifOpen(false);
    setMailOpen(false);
  };

  // Quick copy link action for verification notifications
  const handleCopyVerification = async (e: React.MouseEvent, ticketCode: string) => {
    e.stopPropagation();
    await copyTicketShareLink(ticketCode);
    setCopiedCode(ticketCode);
    addToast('Link Copied', `Employee verification URL copied for ${ticketCode}`, 'success');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Quick claim and chat from messages popover
  const handleClaimAndChat = (e: React.MouseEvent, ticket: Ticket) => {
    e.stopPropagation();
    claimTicket(ticket.id, currentUser?.name, currentUser?.id);
    setSelectedTicketId(ticket.id);
    setMailOpen(false);
    addToast('Ticket Claimed', `You claimed ${ticket.ticketCode} (${ticket.task})`, 'success');
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Helper badge color for status
  const getStatusBadge = (status: Ticket['status']) => {
    switch (status) {
      case 'OPEN':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'PROG':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'RESL':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'CLSD':
        return 'bg-zinc-100 text-zinc-600 border-zinc-200';
    }
  };

  const getPriorityBadge = (priority: Ticket['priority']) => {
    switch (priority) {
      case 'Critical':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'High':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Medium':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'Low':
        return 'bg-zinc-100 text-zinc-600 border-zinc-200';
    }
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
        {/* 1. Global Search Input with Dynamic Results Popover */}
        <div className="relative hidden sm:block" ref={searchRef}>
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onFocus={() => setSearchOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchOpen(true);
              }}
              placeholder="Search tickets, names, hubs... ( / )"
              className="pl-9 pr-8 py-1.5 bg-[#F4F6F9] border border-transparent focus:border-orange-400 focus:bg-white rounded-lg text-xs text-ink placeholder:text-zinc-400 focus:outline-none w-64 lg:w-72 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2.5 text-zinc-400 hover:text-zinc-600 p-0.5 rounded transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Results Popover Dropdown */}
          {searchOpen && (
            <div className="absolute left-0 top-full mt-2 w-96 max-w-[90vw] bg-white rounded-xl shadow-2xl border border-zinc-200/90 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3.5 py-2.5 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between text-[11px] font-semibold text-zinc-600">
                <span>
                  {searchQuery.trim()
                    ? `Results for "${searchQuery}" (${searchResults.length})`
                    : 'Recent Active Tickets'}
                </span>
                <span className="text-zinc-400 font-normal">Esc to close</span>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100">
                {searchResults.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-500">
                    <p className="font-semibold text-zinc-700">No matching tickets found</p>
                    <p className="text-[11px] mt-1 text-zinc-400">
                      Try searching by ticket code (e.g. T-261042), requestor, or terminal hub.
                    </p>
                  </div>
                ) : (
                  searchResults.map((ticket) => (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => handleSelectTicket(ticket.id)}
                      className="w-full text-left p-3 hover:bg-orange-50/50 active:bg-orange-50 transition-colors flex items-start gap-3 group"
                    >
                      <div className="mt-0.5 shrink-0">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-900 text-white group-hover:bg-orange-600 transition-colors">
                          {ticket.ticketCode}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-ink truncate">
                            {ticket.task}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getStatusBadge(
                              ticket.status
                            )}`}
                          >
                            {ticket.status}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getPriorityBadge(
                              ticket.priority
                            )}`}
                          >
                            {ticket.priority}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
                          {ticket.requestor} • {ticket.location} • {ticket.department}
                        </p>
                        {ticket.description && (
                          <p className="text-[11px] text-zinc-400 mt-1 line-clamp-1 italic">
                            "{ticket.description}"
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-orange-500 shrink-0 self-center transition-colors" />
                    </button>
                  ))
                )}
              </div>

              {searchQuery.trim() && (
                <div className="p-2 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between text-[11px]">
                  <span className="text-zinc-500">Showing top matches</span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView('tickets');
                      setSearchOpen(false);
                    }}
                    className="text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1"
                  >
                    View in Ticket Queue <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. Hub Status Pill matching Nexora Design */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F4F6F9] text-xs font-semibold text-ink">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>PH • 15 Hubs</span>
        </div>

        {/* 3. Notification Bell with Count Badge & Interactive Popover */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setNotifOpen(!notifOpen);
              setMailOpen(false);
              setProfileOpen(false);
              setSearchOpen(false);
            }}
            className={`relative p-2 rounded-lg transition-colors active:scale-95 ${
              notifOpen ? 'bg-orange-50 text-orange-600' : 'hover:bg-zinc-100 text-zinc-600'
            }`}
            title="Notifications & Verification Alerts"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {totalNotifCount > 0 && (
              <span className="px-1 min-w-[16px] h-4 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center absolute -top-0.5 -right-0.5 shadow-sm">
                {totalNotifCount}
              </span>
            )}
          </button>

          {/* Notifications Popover Dropdown */}
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-96 max-w-[92vw] bg-white rounded-xl shadow-2xl border border-zinc-200/90 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-ink">Notifications</span>
                  {totalNotifCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">
                      {totalNotifCount} action required
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('tickets');
                    setNotifOpen(false);
                  }}
                  className="text-[11px] font-semibold text-orange-600 hover:text-orange-700"
                >
                  View All in Queue
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100">
                {totalNotifCount === 0 ? (
                  <div className="p-8 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-xs font-bold text-ink">All caught up!</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      No pending employee verifications or urgent alerts.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Section: Pending Closure Verifications */}
                    {pendingVerifications.length > 0 && (
                      <div className="p-2">
                        <div className="px-2 py-1 text-[10px] font-bold tracking-wider text-amber-700 uppercase flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          <span>Awaiting Employee Sign-Off ({pendingVerifications.length})</span>
                        </div>
                        {pendingVerifications.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => handleSelectTicket(t.id)}
                            className="p-2.5 rounded-lg hover:bg-amber-50/60 transition-colors cursor-pointer flex items-start justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-white">
                                  {t.ticketCode}
                                </span>
                                <span className="font-bold text-ink truncate">{t.task}</span>
                              </div>
                              <p className="text-[11px] text-zinc-500 mt-1 truncate">
                                Repaired by {t.workedBy ?? 'IT'} • Awaiting {t.requestor} ({t.location})
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => handleCopyVerification(e, t.ticketCode)}
                                className="px-2 py-1 rounded bg-white hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold transition-colors active:scale-95 flex items-center gap-1"
                                title="Copy employee verification share link"
                              >
                                {copiedCode === t.ticketCode ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span>Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 text-amber-700" />
                                    <span>Link</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Section: Critical & High Priority Alerts */}
                    {priorityAlerts.length > 0 && (
                      <div className="p-2">
                        <div className="px-2 py-1 text-[10px] font-bold tracking-wider text-rose-700 uppercase flex items-center gap-1.5">
                          <Flame className="w-3 h-3" />
                          <span>Urgent Tickets ({priorityAlerts.length})</span>
                        </div>
                        {priorityAlerts.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => handleSelectTicket(t.id)}
                            className="p-2.5 rounded-lg hover:bg-rose-50/60 transition-colors cursor-pointer flex items-start justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-white">
                                  {t.ticketCode}
                                </span>
                                <span className="font-bold text-ink truncate">{t.task}</span>
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${getPriorityBadge(
                                    t.priority
                                  )}`}
                                >
                                  {t.priority}
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-500 mt-1 truncate">
                                {t.requestor} • {t.location} • Status: {t.status}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-zinc-300 shrink-0 self-center" />
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 4. Messages / Dispatches Icon with Badge & Interactive Popover */}
        <div className="relative" ref={mailRef}>
          <button
            type="button"
            onClick={() => {
              setMailOpen(!mailOpen);
              setNotifOpen(false);
              setProfileOpen(false);
              setSearchOpen(false);
            }}
            className={`relative p-2 rounded-lg transition-colors active:scale-95 ${
              mailOpen ? 'bg-orange-50 text-orange-600' : 'hover:bg-zinc-100 text-zinc-600'
            }`}
            title="Messages & Unassigned Dispatch Pool"
            aria-label="Messages and Dispatches"
          >
            <Mail className="w-4 h-4" />
            {totalMailCount > 0 && (
              <span className="px-1 min-w-[16px] h-4 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center absolute -top-0.5 -right-0.5 shadow-sm">
                {totalMailCount}
              </span>
            )}
          </button>

          {/* Messages Popover Dropdown */}
          {mailOpen && (
            <div className="absolute right-0 top-full mt-2 w-96 max-w-[92vw] bg-white rounded-xl shadow-2xl border border-zinc-200/90 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
                <span className="text-xs font-bold text-ink">Messages & Dispatches</span>
                <span className="text-[11px] text-zinc-400">Click to reply</span>
              </div>

              {/* Popover Tab Switcher */}
              <div className="grid grid-cols-2 p-1.5 bg-zinc-100/70 border-b border-zinc-200/70 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setMailTab('chats')}
                  className={`py-1.5 rounded-lg text-center transition-all ${
                    mailTab === 'chats'
                      ? 'bg-white text-ink shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  Active Chats ({ticketsWithMessages.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMailTab('unassigned')}
                  className={`py-1.5 rounded-lg text-center transition-all ${
                    mailTab === 'unassigned'
                      ? 'bg-white text-ink shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  Unassigned ({unassignedTickets.length})
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100">
                {mailTab === 'chats' ? (
                  ticketsWithMessages.length === 0 ? (
                    <div className="p-8 text-center">
                      <MessageSquare className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-ink">No active chat messages</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Employee conversations will appear here in real-time.
                      </p>
                    </div>
                  ) : (
                    ticketsWithMessages.map((t) => {
                      const lastMsg = t.messages![t.messages!.length - 1];
                      const isEmployee = lastMsg.senderRole === 'employee';
                      return (
                        <div
                          key={t.id}
                          onClick={() => handleSelectTicket(t.id)}
                          className="p-3 hover:bg-orange-50/40 transition-colors cursor-pointer flex items-start gap-3 group"
                        >
                          <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-zinc-700">
                              {lastMsg.senderName.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold text-ink truncate">
                                {lastMsg.senderName}
                              </span>
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-700 shrink-0">
                                {t.ticketCode}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-600 mt-0.5 line-clamp-2">
                              {lastMsg.message}
                            </p>
                            <div className="flex items-center justify-between gap-1 mt-1 text-[10px] text-zinc-400">
                              <span>
                                {isEmployee ? '👤 Requestor' : '🛠️ IT Tech'} • {t.location}
                              </span>
                              <span>{lastMsg.timestamp}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )
                ) : unassignedTickets.length === 0 ? (
                  <div className="p-8 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-xs font-bold text-ink">Queue is clear</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      All submitted tickets have been claimed by technicians.
                    </p>
                  </div>
                ) : (
                  unassignedTickets.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 hover:bg-orange-50/40 transition-colors flex items-start justify-between gap-2"
                    >
                      <div
                        className="min-w-0 flex-1 cursor-pointer"
                        onClick={() => handleSelectTicket(t.id)}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-white">
                            {t.ticketCode}
                          </span>
                          <span className="font-bold text-xs text-ink truncate">{t.task}</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
                          {t.requestor} • {t.location} ({t.department})
                        </p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          Opened at {t.timeStarted} • {t.priority} Priority
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleClaimAndChat(e, t)}
                        className="px-2.5 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-[11px] font-bold shrink-0 transition-all shadow-sm"
                      >
                        Claim & Chat
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

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

        {/* 6. Staff Profile Popover with Sign Out Option (Replaces Standalone Employee Screen Button) */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => {
              setProfileOpen(!profileOpen);
              setNotifOpen(false);
              setMailOpen(false);
              setSearchOpen(false);
            }}
            className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-zinc-100 active:scale-95 transition-all text-left"
            title="User Profile & Sign Out"
            aria-label="User Profile"
          >
            <img
              src={
                currentUser?.avatar ??
                'https://api.dicebear.com/7.x/avataaars/svg?seed=Edward&backgroundColor=fed7aa'
              }
              alt={currentUser?.name ?? 'Staff'}
              className="w-8 h-8 rounded-full border border-orange-200 bg-orange-50 shrink-0"
            />
            <div className="hidden sm:block leading-tight">
              <p className="text-xs font-bold text-ink">
                {currentUser?.name ?? 'Nathaniel Esguerra'}
              </p>
              <p className="text-[11px] text-zinc-500">
                {currentUser?.title ?? 'IT Support Specialist'}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 hidden sm:block" />
          </button>

          {/* Profile Popover Dropdown */}
          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-zinc-200/90 p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center gap-3 pb-3 border-b border-zinc-100">
                <img
                  src={
                    currentUser?.avatar ??
                    'https://api.dicebear.com/7.x/avataaars/svg?seed=Edward&backgroundColor=fed7aa'
                  }
                  alt={currentUser?.name ?? 'Staff'}
                  className="w-10 h-10 rounded-full border border-orange-200 bg-orange-50 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-ink truncate">
                    {currentUser?.name ?? 'Nathaniel Esguerra'}
                  </p>
                  <p className="text-[11px] text-zinc-500 truncate">
                    {currentUser?.email ?? 'nathaniel.esguerra@fivestarbus.com'}
                  </p>
                  <span className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.2 rounded bg-orange-100 text-orange-700">
                    {currentUser?.role === 'admin' ? 'Administrator' : 'IT Support Specialist'}
                  </span>
                </div>
              </div>

              <div className="py-2 space-y-1">
                <div className="px-2 py-1.5 text-xs text-zinc-600 flex items-center justify-between">
                  <span>Terminal Hub:</span>
                  <span className="font-semibold text-ink">Pasay Central Hub</span>
                </div>
                <div className="px-2 py-1.5 text-xs text-zinc-600 flex items-center justify-between">
                  <span>Active Role:</span>
                  <span className="font-semibold text-emerald-600">On Duty</span>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    logoutToKiosk();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors active:scale-95"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out to Employee Kiosk</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
