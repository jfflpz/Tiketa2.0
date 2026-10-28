import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Building2,
  Inbox,
  Clock,
  ExternalLink,
  Flame,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { HubSummaryOut } from '../../api/client';
import { HubDepartmentsTab } from './components/modal/HubDepartmentsTab';
import { HubActiveTicketsTab } from './components/modal/HubActiveTicketsTab';
import { HubResolutionHistoryTab } from './components/modal/HubResolutionHistoryTab';

interface TerminalHubDetailModalProps {
  hub: HubSummaryOut | null;
  onClose: () => void;
  onRefreshHubs?: () => void;
}

type ModalTab = 'DEPARTMENTS' | 'ACTIVE_TICKETS' | 'HISTORY';

export const TerminalHubDetailModal: React.FC<TerminalHubDetailModalProps> = ({
  hub,
  onClose,
  onRefreshHubs,
}) => {
  const tickets = useAppStore((state) => state.tickets);
  const selectedTicketId = useAppStore((state) => state.selectedTicketId);
  const setSelectedTicketId = useAppStore((state) => state.setSelectedTicketId);
  const setActiveWorkbenchTicketId = useAppStore((state) => state.setActiveWorkbenchTicketId);
  const setActiveView = useAppStore((state) => state.setActiveView);
  const setLocationFilter = useAppStore((state) => state.setLocationFilter);
  const setQueueFilter = useAppStore((state) => state.setQueueFilter);
  const setSearchQuery = useAppStore((state) => state.setSearchQuery);
  const setQuickIntakeOpen = useAppStore((state) => state.setQuickIntakeOpen);

  const [activeTab, setActiveTab] = useState<ModalTab>('DEPARTMENTS');

  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Focus trap and restoration on opening and closing
  useEffect(() => {
    if (!hub) return;
    previousActiveElement.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    return () => {
      if (previousActiveElement.current && document.body.contains(previousActiveElement.current)) {
        previousActiveElement.current.focus();
      } else {
        document.querySelector<HTMLElement>('[role="button"][tabindex="0"]')?.focus();
      }
    };
  }, [hub]);

  const handleFocusContainment = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      // If drawer is open on top of the modal, let the drawer contain focus
      if (selectedTicketId) return;

      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [selectedTicketId]
  );

  // Handle ESC key to close modal (only if ticket drawer is not currently open)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedTicketId) {
          return;
        }
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, selectedTicketId]);

  if (!hub) return null;

  // Filter local preview tickets matching this station for department tab
  const hubTickets = tickets.filter((t) => t.locationCode === hub.code);
  const activeTickets = hubTickets.filter((t) => t.status !== 'CLSD');

  const handleOpenTicketDrawer = (ticketId: string) => {
    setSelectedTicketId(ticketId);
  };

  const handleOpenWorkbenchForTicket = (ticketId: string) => {
    // Explicit claiming: opening a ticket in workbench does not claim it automatically
    setActiveWorkbenchTicketId(ticketId);
    setActiveView('workbench');
    onClose();
  };

  const handleFilterInTicketLists = () => {
    setSearchQuery('');
    setQueueFilter('ALL');
    setLocationFilter(hub.code);
    setActiveView('tickets');
    onClose();
  };

  const handleQuickIntake = () => {
    setQuickIntakeOpen(true);
    onRefreshHubs?.();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terminal-hub-title"
    >
      <div
        ref={modalRef}
        onKeyDown={handleFocusContainment}
        className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-zinc-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-[#ECEEF2] flex items-start justify-between gap-4 bg-gradient-to-r from-orange-50/40 via-white to-white shrink-0">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-orange-600 text-white font-mono font-extrabold text-base flex items-center justify-center shadow-md shadow-orange-600/20 shrink-0">
              {hub.code}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="terminal-hub-title" className="text-lg font-bold text-ink">
                  {hub.name} Terminal Station
                </h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 font-semibold">
                  Station Code: {hub.code}
                </span>
              </div>

              {/* Station Workload Summary Bar */}
              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                  Open: <strong>{hub.open_count}</strong>
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-orange-50 text-orange-700 border border-orange-200 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  In Progress: <strong>{hub.in_progress_count}</strong>
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Awaiting Conf: <strong>{hub.resolved_count}</strong>
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Closed This Month: <strong>{hub.closed_this_month_count}</strong>
                </span>
                {hub.top_issue_task_name && (
                  <span className="px-2.5 py-1 rounded-xl bg-zinc-100 text-zinc-700 font-medium flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                    Top Issue (30d): <strong>{hub.top_issue_task_name}</strong> ({hub.top_issue_count})
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close station modal"
            className="p-2 rounded-xl text-zinc-400 hover:text-ink hover:bg-zinc-100 transition-colors press-fx shrink-0 focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#ECEEF2] px-6 bg-zinc-50/50 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('DEPARTMENTS')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'DEPARTMENTS'
                ? 'border-orange-500 text-orange-600 bg-white'
                : 'border-transparent text-zinc-500 hover:text-ink'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Operating Departments ({hub.departments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ACTIVE_TICKETS')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'ACTIVE_TICKETS'
                ? 'border-orange-500 text-orange-600 bg-white'
                : 'border-transparent text-zinc-500 hover:text-ink'
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>Active Tickets ({hub.total_active_count})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('HISTORY')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'HISTORY'
                ? 'border-orange-500 text-orange-600 bg-white'
                : 'border-transparent text-zinc-500 hover:text-ink'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Resolution History</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'DEPARTMENTS' && (
            <HubDepartmentsTab
              hubName={hub.name}
              departments={hub.departments}
              activeTickets={activeTickets}
              onOpenTicketDrawer={handleOpenTicketDrawer}
            />
          )}

          {activeTab === 'ACTIVE_TICKETS' && (
            <HubActiveTicketsTab
              hubId={hub.id}
              hubName={hub.name}
              totalActiveCount={hub.total_active_count}
              onOpenTicketDrawer={handleOpenTicketDrawer}
              onOpenWorkbenchForTicket={handleOpenWorkbenchForTicket}
              onQuickIntake={handleQuickIntake}
            />
          )}

          {activeTab === 'HISTORY' && (
            <HubResolutionHistoryTab
              hubId={hub.id}
              hubName={hub.name}
              onOpenTicketDrawer={handleOpenTicketDrawer}
            />
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#ECEEF2] bg-zinc-50 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-zinc-500">
            Workload totals reflect all active tickets across terminal departments.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFilterInTicketLists}
              className="py-2 px-3.5 rounded-xl bg-[#F4F6F9] hover:bg-orange-50 hover:text-orange-600 text-zinc-700 text-xs font-bold transition-colors press-fx inline-flex items-center gap-1.5"
            >
              <span>View In Full Ticket Lists</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-900 text-white text-xs font-bold transition-colors press-fx"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
