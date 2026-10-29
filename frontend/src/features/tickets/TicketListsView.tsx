// @spec FR-QUEUE-01..04: Unified Ticket Lists Screen with Table View & 3-Column Kanban Switcher
import React, { useState, useEffect } from 'react';
import {
  List,
  LayoutGrid,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { Ticket } from '../../types/ticket';
import { TicketQueueFilterToolbar } from './components/TicketQueueFilterToolbar';
import { TicketQueueTable } from './components/TicketQueueTable';
import { TicketQueueKanbanBoard } from './components/TicketQueueKanbanBoard';
import { TicketResolveModal } from './components/TicketResolveModal';
import { TicketAssignModal } from './components/TicketAssignModal';

interface PendingAssignment {
  ticketId: string;
  ticketCode: string;
  ticketTask: string;
  techName: string;
  techId: string;
}

export const TicketListsView: React.FC = () => {
  const currentUser = useAppStore((state) => state.currentUser);
  const tickets = useAppStore((state) => state.tickets);
  const searchQuery = useAppStore((state) => state.searchQuery);
  const setSearchQuery = useAppStore((state) => state.setSearchQuery);
  const queueFilter = useAppStore((state) => state.queueFilter);
  const setQueueFilter = useAppStore((state) => state.setQueueFilter);
  const locationFilter = useAppStore((state) => state.locationFilter);
  const setLocationFilter = useAppStore((state) => state.setLocationFilter);
  const claimTicketApi = useAppStore((state) => state.claimTicketApi);
  const fetchQueueApi = useAppStore((state) => state.fetchQueueApi);
  const fetchITMembers = useAppStore((state) => state.fetchITMembers);
  const fetchDictionaries = useAppStore((state) => state.fetchDictionaries);
  const isFetchingQueue = useAppStore((state) => state.isFetchingQueue);
  const assignTicket = useAppStore((state) => state.assignTicket);
  const itTeamMembers = useAppStore((state) => state.itTeamMembers);
  const setSelectedTicketId = useAppStore((state) => state.setSelectedTicketId);
  const setQuickIntakeOpen = useAppStore((state) => state.setQuickIntakeOpen);
  const setActiveView = useAppStore((state) => state.setActiveView);
  const copyTicketShareLink = useAppStore((state) => state.copyTicketShareLink);
  const setActiveWorkbenchTicketId = useAppStore((state) => state.setActiveWorkbenchTicketId);

  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [ticketToResolve, setTicketToResolve] = useState<Ticket | null>(null);
  const [pendingAssignment, setPendingAssignment] = useState<PendingAssignment | null>(null);

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
    const target = tickets.find((t) => t.ticketCode === ticketCode);
    const res = await copyTicketShareLink(ticketCode, target?.id);
    if (res.success) {
      setCopiedCode(ticketCode);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  useEffect(() => {
    fetchDictionaries();
    fetchITMembers();
    fetchQueueApi();
    const interval = setInterval(() => {
      fetchQueueApi();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchQueueApi, fetchITMembers, fetchDictionaries]);

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

  const handleRequestAssign = (ticketId: string, techName: string, techId: string) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    setPendingAssignment({
      ticketId,
      ticketCode: ticket?.ticketCode || 'Ticket',
      ticketTask: ticket?.task || '',
      techName,
      techId,
    });
  };

  const handleConfirmAssign = () => {
    if (!pendingAssignment) return;
    assignTicket(pendingAssignment.ticketId, pendingAssignment.techName, pendingAssignment.techId);
    setPendingAssignment(null);
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
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-zinc-50 text-ink border border-[#ECEEF2] text-xs font-bold shadow-xs transition-colors press-fx"
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

      <TicketQueueFilterToolbar
        filterTab={queueFilter}
        onSelectFilterTab={setQueueFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        locationFilter={locationFilter}
        onLocationFilterChange={setLocationFilter}
        ticketCounts={{
          all: tickets.length,
          open: openTickets.length,
          myActive: myActiveCount,
          resl: reslTickets.length,
          clsd: clsdTickets.length,
        }}
      />

      {/* VIEW 1: DATA TABLE VIEW */}
      {viewMode === 'table' ? (
        <TicketQueueTable
          tickets={filteredTickets}
          isAdmin={isAdmin}
          itTeamMembers={itTeamMembers}
          copiedCode={copiedCode}
          onSelectTicket={setSelectedTicketId}
          onClaimAndWork={handleClaimAndWork}
          onFocusWorkbench={handleFocusWorkbench}
          onResolveTicket={(e, ticket) => {
            e.stopPropagation();
            setTicketToResolve(ticket);
          }}
          onCopyVerification={handleCopyVerification}
          onAssignTicket={handleRequestAssign}
        />
      ) : (
        /* VIEW 2: 3-COLUMN KANBAN BOARD */
        <TicketQueueKanbanBoard
          openTickets={openTickets}
          progTickets={progTickets}
          reslTickets={reslTickets}
          isAdmin={isAdmin}
          itTeamMembers={itTeamMembers}
          copiedCode={copiedCode}
          onSelectTicket={setSelectedTicketId}
          onClaimAndWork={handleClaimAndWork}
          onFocusWorkbench={handleFocusWorkbench}
          onResolveTicket={(ticket) => setTicketToResolve(ticket)}
          onCopyVerification={handleCopyVerification}
          onAssignTicket={handleRequestAssign}
        />
      )}

      {/* Quick Resolve Confirmation Modal */}
      <TicketResolveModal
        ticket={ticketToResolve}
        onClose={() => setTicketToResolve(null)}
      />

      {/* Ticket Assignment Confirmation Modal */}
      <TicketAssignModal
        isOpen={pendingAssignment !== null}
        ticketCode={pendingAssignment?.ticketCode || ''}
        ticketTask={pendingAssignment?.ticketTask || ''}
        techName={pendingAssignment?.techName || ''}
        onConfirm={handleConfirmAssign}
        onCancel={() => setPendingAssignment(null)}
      />
    </div>
  );
};
