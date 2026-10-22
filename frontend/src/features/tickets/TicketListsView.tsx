// @spec FR-QUEUE-01..04: Unified Ticket Lists Screen with Table View & 3-Column Kanban Switcher
import React, { useState, useEffect } from 'react';
import {
  List,
  LayoutGrid,
  Search,
  Plus,
  UserCheck,
  CheckCircle2,
  Clock,
  MapPin,
  MessageSquare,
  ArrowRight,
  Copy,
  Check,
  Wrench,
  AlertCircle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { useAppStore, QueueFilterTab } from '../../store/useAppStore';
import { LOCATIONS } from '../../data/mockTicketsData';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Ticket } from '../../types/ticket';

export const TicketListsView: React.FC = () => {
  const {
    currentUser,
    tickets,
    searchQuery,
    setSearchQuery,
    queueFilter,
    setQueueFilter,
    locationFilter,
    setLocationFilter,
    claimTicketApi,   // <-- REPLACE claimTicket WITH claimTicketApi
    fetchQueueApi,    // <-- ADD
    isFetchingQueue,
    assignTicket,
    itTeamMembers,
    resolveTicket,
    setSelectedTicketId,
    setQuickIntakeOpen,
    setActiveView,
    copyTicketShareLink,
    setActiveWorkbenchTicketId,
    addToast,
  } = useAppStore();

  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const currentTechName = currentUser?.name ?? 'Nathaniel D. Esguerra';
  const isAdmin = currentUser?.role === 'admin';

  // Counts for tabs and kanban columns
  const openTickets = tickets.filter((t) => t.status === 'OPEN');
  const progTickets = tickets.filter((t) => t.status === 'PROG');
  const reslTickets = tickets.filter((t) => t.status === 'RESL');
  const clsdTickets = tickets.filter((t) => t.status === 'CLSD');
  const myActiveCount = progTickets.filter(
    (t) => t.workedBy === currentTechName || !t.workedBy
  ).length;

  // Filtered tickets for Table View
  const filteredTickets = tickets.filter((t) => {
    // 1. Tab filter
    if (queueFilter === 'OPEN' && t.status !== 'OPEN') return false;
    if (
      queueFilter === 'MY_ACTIVE' &&
      !(t.status === 'PROG' && (t.workedBy === currentTechName || !t.workedBy))
    ) {
      return false;
    }
    if (queueFilter === 'RESL' && t.status !== 'RESL') return false;
    if (queueFilter === 'CLSD' && t.status !== 'CLSD') return false;

    // 2. Terminal Location filter
    if (locationFilter !== 'ALL' && t.locationCode !== locationFilter) {
      return false;
    }

    // 3. Search query filter
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      t.ticketCode.toLowerCase().includes(q) ||
      t.task.toLowerCase().includes(q) ||
      t.requestor.toLowerCase().includes(q) ||
      t.location.toLowerCase().includes(q) ||
      t.department.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q))
    );
  });

  const handleCopyVerification = async (e: React.MouseEvent, ticketCode: string) => {
    e.stopPropagation();
    await copyTicketShareLink(ticketCode);
    setCopiedCode(ticketCode);
    addToast('Link Copied', `Employee verification URL copied for ${ticketCode}`, 'success');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  useEffect(() => {
    fetchQueueApi();
    const interval = setInterval(() => {
      fetchQueueApi();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleClaimAndWork = async (e: React.MouseEvent, ticket: Ticket) => {
    e.stopPropagation();
    const success = await claimTicketApi(ticket.id);
    if (success) {
      setActiveWorkbenchTicketId(ticket.id);
      setActiveView('workbench');
    }
  };

  const handleFocusWorkbench = (e: React.MouseEvent, ticket: Ticket) => {
    e.stopPropagation();
    setActiveWorkbenchTicketId(ticket.id);
    setActiveView('workbench');
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
    <div className="space-y-5 pb-8">
      {/* Top Header Row with Title, View Switcher & Action Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink tracking-tight">
            Active Ticket Lists &amp; Dispatch Queue
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manage submitted terminal tickets, claim unassigned dispatches, and track repairs across 15 hubs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Switcher: Table vs 3-Col Kanban */}
          <div className="inline-flex items-center bg-white p-1 rounded-xl border border-[#ECEEF2] shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'table'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-ink'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'kanban'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-ink'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>3-Col Kanban</span>
            </button>
          </div>

          <button
            type="button"
            disabled={isFetchingQueue}
            onClick={() => fetchQueueApi()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-zinc-50 text-ink border border-[#ECEEF2] text-xs font-bold
shadow-xs transition-colors press-fx"
            title="Refresh queue from server"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-zinc-500 ${isFetchingQueue ? 'animate-spin text-orange-500' : ''}`} />
            <span>{isFetchingQueue ? 'Syncing...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={() => setQuickIntakeOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-sm transition-colors press-fx"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Walk-in / Viber Intake</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar: Status Filter Tabs, Search & Terminal Location Filter */}
      <div className="bg-white border border-[#ECEEF2] rounded-2xl p-4 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {(
            [
              { id: 'ALL', label: 'All Tickets', count: tickets.length },
              { id: 'OPEN', label: 'Unassigned Pool', count: openTickets.length },
              { id: 'MY_ACTIVE', label: 'Active Repairs', count: myActiveCount },
              { id: 'RESL', label: 'Pending Sign-Off', count: reslTickets.length },
              { id: 'CLSD', label: 'Verified Closed', count: clsdTickets.length },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setQueueFilter(tab.id as QueueFilterTab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 press-fx ${
                queueFilter === tab.id
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  queueFilter === tab.id ? 'bg-zinc-700 text-white' : 'bg-zinc-100 text-zinc-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Location Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-60">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code, task, requestor..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink placeholder:text-zinc-400 focus:outline-none focus:border-orange-500"
            />
          </div>

          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500"
          >
            <option value="ALL">All 15 Hubs</option>
            {LOCATIONS.map((loc) => (
              <option key={loc.code} value={loc.code}>
                {loc.code} - {loc.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* VIEW 1: DATA TABLE VIEW */}
      {viewMode === 'table' ? (
        <div className="bg-white border border-[#ECEEF2] rounded-2xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8F9FA] text-zinc-500 text-[11px] font-semibold border-b border-[#ECEEF2]">
                  <th className="py-3 px-4">Ticket Code</th>
                  <th className="py-3 px-3">Mode</th>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-3">Task &amp; Description</th>
                  <th className="py-3 px-3">Requestor &amp; Dept</th>
                  <th className="py-3 px-3">Terminal Hub</th>
                  <th className="py-3 px-3">Assigned Tech</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEEF2]">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-zinc-400">
                      <AlertCircle className="w-6 h-6 mx-auto mb-1.5 text-zinc-300" />
                      <p className="font-semibold text-ink text-xs">No matching tickets found</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">Try clearing your filters or search keywords.</p>
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      onClick={() => setSelectedTicketId(ticket.id)}
                      className="hover:bg-orange-50/30 transition-colors cursor-pointer group"
                    >
                      {/* Ticket Code */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-zinc-900 text-white group-hover:bg-orange-600 transition-colors">
                          {ticket.ticketCode}
                        </span>
                      </td>

                      {/* Mode */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            ticket.mode === 'SITE'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {ticket.mode}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getPriorityBadge(
                            ticket.priority
                          )}`}
                        >
                          {ticket.priority}
                        </span>
                      </td>

                      {/* Task & Description */}
                      <td className="py-3 px-3 max-w-xs">
                        <p className="font-bold text-ink truncate">{ticket.task}</p>
                        {ticket.description && (
                          <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                            {ticket.description}
                          </p>
                        )}
                      </td>

                      {/* Requestor & Department */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <p className="font-semibold text-ink">{ticket.requestor}</p>
                        <p className="text-[11px] text-zinc-400">{ticket.department}</p>
                      </td>

                      {/* Terminal Hub */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-zinc-700 font-medium">
                          <MapPin className="w-3 h-3 text-orange-500 shrink-0" />
                          <span>{ticket.location}</span>
                        </span>
                      </td>

                      {/* Assigned Tech with Admin Selector */}
                      <td className="py-3 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {isAdmin ? (
                          <select
                            value={ticket.workedById ?? ''}
                            onChange={(e) => {
                              const tech = itTeamMembers.find((m) => m.id === e.target.value);
                              if (tech) {
                                assignTicket(ticket.id, tech.name, tech.id);
                              }
                            }}
                            className="px-2 py-1 bg-white border border-[#ECEEF2] rounded-lg text-xs font-semibold text-ink focus:border-orange-500 focus:outline-none cursor-pointer shadow-xs"
                          >
                            <option value="" disabled>Assign Tech...</option>
                            {itTeamMembers.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        ) : ticket.workedBy ? (
                          <span className="text-ink font-medium">{ticket.workedBy}</span>
                        ) : (
                          <span className="text-zinc-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <StatusBadge status={ticket.status} size="sm" />
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {ticket.status === 'OPEN' && (
                            <button
                              type="button"
                              onClick={(e) => handleClaimAndWork(e, ticket)}
                              className="px-2.5 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-[11px] font-bold transition-all shadow-xs"
                            >
                              Claim &amp; Work
                            </button>
                          )}
                          {ticket.status === 'PROG' && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => handleFocusWorkbench(e, ticket)}
                                className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-[11px] font-semibold transition-colors"
                              >
                                Workbench
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  resolveTicket(ticket.id);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors"
                              >
                                Resolve
                              </button>
                            </>
                          )}
                          {ticket.status === 'RESL' && (
                            <button
                              type="button"
                              onClick={(e) => handleCopyVerification(e, ticket.ticketCode)}
                              className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-[11px] font-bold transition-colors inline-flex items-center gap-1"
                            >
                              {copiedCode === ticket.ticketCode ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-amber-800" />
                                  <span>Verification</span>
                                </>
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedTicketId(ticket.id)}
                            className="p-1 rounded-lg text-zinc-400 hover:text-ink hover:bg-zinc-100 transition-colors"
                            title="Open 15-Column Job Log Drawer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VIEW 2: 3-COLUMN KANBAN BOARD */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* COLUMN 1: UNASSIGNED POOL (OPEN) */}
          <div className="bg-white border border-[#ECEEF2] rounded-2xl p-4 shadow-card flex flex-col space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#ECEEF2]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                  1. Unassigned Pool (OPEN)
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold tabular-nums">
                {openTickets.length}
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
              {openTickets.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-400">
                  <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-500" />
                  <p className="font-semibold text-ink">Zero unassigned tickets!</p>
                  <p className="text-[11px]">All submitted tickets have been claimed.</p>
                </div>
              ) : (
                openTickets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className="p-3.5 rounded-xl bg-[#F4F6F9] hover:bg-orange-50/50 border border-[#ECEEF2] space-y-2.5 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-white">
                        {t.ticketCode}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getPriorityBadge(
                          t.priority
                        )}`}
                      >
                        {t.priority}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-ink">{t.task}</p>
                      <p className="text-[11px] text-zinc-500 line-clamp-2 mt-0.5">
                        {t.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-200/70">
                      <span>
                        <strong className="text-ink">{t.location}</strong> • {t.requestor}
                      </span>
                      <span className="inline-flex items-center gap-1 text-orange-600 font-semibold">
                        <MessageSquare className="w-3 h-3" />
                        {t.messages?.length ?? 0}
                      </span>
                    </div>

                    {isAdmin ? (
                      <div className="pt-2 border-t border-zinc-200/70" onClick={(e) => e.stopPropagation()}>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                          Assign IT Specialist:
                        </label>
                        <select
                          value=""
                          onChange={(e) => {
                            const tech = itTeamMembers.find((m) => m.id === e.target.value);
                            if (tech) assignTicket(t.id, tech.name, tech.id);
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-[#ECEEF2] rounded-lg text-xs font-semibold text-ink focus:border-orange-500 focus:outline-none"
                        >
                          <option value="" disabled>Dispatch Tech...</option>
                          {itTeamMembers.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleClaimAndWork(e, t)}
                        className="w-full py-2 px-3 rounded-lg bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Claim &amp; Open Workbench</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUMN 2: ACTIVE REPAIRS (PROG) */}
          <div className="bg-white border border-[#ECEEF2] rounded-2xl p-4 shadow-card flex flex-col space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#ECEEF2]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                  2. Active Repairs (PROG)
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold tabular-nums">
                {progTickets.length}
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
              {progTickets.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-400">
                  <Wrench className="w-6 h-6 mx-auto mb-1 text-zinc-300" />
                  <p className="font-semibold text-ink">No tickets in progress</p>
                  <p className="text-[11px]">Claim an open ticket from column 1.</p>
                </div>
              ) : (
                progTickets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className="p-3.5 rounded-xl bg-[#F4F6F9] hover:bg-orange-50/50 border border-[#ECEEF2] space-y-2.5 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-white">
                        {t.ticketCode}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white border border-zinc-200 text-zinc-700">
                        {t.mode === 'SITE' ? 'On-Site' : 'Remote'}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-ink">{t.task}</p>
                      <p className="text-[11px] text-zinc-500 line-clamp-2 mt-0.5">
                        {t.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-200/70">
                      <span>
                        <strong className="text-ink">{t.location}</strong> • {t.department}
                      </span>
                      <span className="text-orange-600 font-semibold truncate max-w-[120px]">
                        {t.workedBy ?? 'Assigned'}
                      </span>
                    </div>

                    {isAdmin && (
                      <div className="pt-1.5" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={t.workedById ?? ''}
                          onChange={(e) => {
                            const tech = itTeamMembers.find((m) => m.id === e.target.value);
                            if (tech) assignTicket(t.id, tech.name, tech.id);
                          }}
                          className="w-full px-2 py-1 bg-white border border-[#ECEEF2] rounded-lg text-[11px] font-medium text-zinc-700 focus:border-orange-500 focus:outline-none"
                        >
                          <option value="" disabled>Reassign Tech...</option>
                          {itTeamMembers.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div
                      className="grid grid-cols-2 gap-2 pt-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={(e) => handleFocusWorkbench(e, t)}
                        className="py-1.5 px-2.5 rounded-lg bg-white hover:bg-zinc-100 text-ink border border-zinc-200 text-xs font-semibold transition-colors active:scale-95"
                      >
                        Workbench ({t.messages?.length ?? 0})
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          resolveTicket(t.id);
                        }}
                        className="py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1 shadow-sm transition-colors active:scale-95"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Resolve</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUMN 3: PENDING SIGN-OFF (RESL) */}
          <div className="bg-white border border-[#ECEEF2] rounded-2xl p-4 shadow-card flex flex-col space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#ECEEF2]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                  3. Pending Sign-Off (RESL)
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold tabular-nums">
                {reslTickets.length}
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
              {reslTickets.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-400">
                  <Clock className="w-6 h-6 mx-auto mb-1 text-zinc-300" />
                  <p className="font-semibold text-ink">No pending verifications</p>
                  <p className="text-[11px]">Resolved tickets waiting for employee sign-off show here.</p>
                </div>
              ) : (
                reslTickets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className="p-3.5 rounded-xl bg-amber-50/40 border border-amber-200/80 space-y-2.5 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-white">
                        {t.ticketCode}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                        {t.duration ?? 0.65} hrs logged
                      </span>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-ink">{t.task}</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
                        Repaired by <strong>{t.workedBy ?? 'IT'}</strong> • Awaiting {t.requestor} sign-off
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-amber-200/60">
                      <span>{t.location}</span>
                      <span className="text-amber-800 font-semibold">Awaiting Verification</span>
                    </div>

                    <div
                      className="grid grid-cols-2 gap-2 pt-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={(e) => handleCopyVerification(e, t.ticketCode)}
                        className="py-1.5 px-2 rounded-lg bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold inline-flex items-center justify-center gap-1 transition-colors active:scale-95"
                      >
                        {copiedCode === t.ticketCode ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedTicketId(t.id)}
                        className="py-1.5 px-2 rounded-lg bg-[#111315] hover:bg-zinc-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-1 transition-colors active:scale-95"
                      >
                        <span>Drawer</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
