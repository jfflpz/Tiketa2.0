// @spec FR-REPT-06: Comprehensive Terminal Hub Station Details Modal (Departments, Active Tickets, Resolution History & Infrastructure)
import React, { useState, useEffect } from 'react';
import {
  X,
  Layers,
  Wrench,
  Clock,
  Monitor,
  ExternalLink,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { HubDepartmentsTab, HUB_DEPARTMENTS_CONFIG } from './components/modal/HubDepartmentsTab';
import { HubActiveTicketsTab } from './components/modal/HubActiveTicketsTab';
import { HubResolutionHistoryTab, type FallbackHistoryLog } from './components/modal/HubResolutionHistoryTab';
import { HubInfrastructureTab } from './components/modal/HubInfrastructureTab';

export interface TerminalMeta {
  code: string;
  name: string;
  region: string;
  devicesCount: number;
  hotspot: string;
  networkStatus: string;
}

interface TerminalHubDetailModalProps {
  hub: TerminalMeta | null;
  onClose: () => void;
}

type ModalTab = 'DEPARTMENTS' | 'ACTIVE_TICKETS' | 'HISTORY' | 'INFRASTRUCTURE';

export const TerminalHubDetailModal: React.FC<TerminalHubDetailModalProps> = ({
  hub,
  onClose,
}) => {
  const tickets = useAppStore((state) => state.tickets);
  const setSelectedTicketId = useAppStore((state) => state.setSelectedTicketId);
  const setActiveWorkbenchTicketId = useAppStore((state) => state.setActiveWorkbenchTicketId);
  const setActiveView = useAppStore((state) => state.setActiveView);
  const setLocationFilter = useAppStore((state) => state.setLocationFilter);
  const setQuickIntakeOpen = useAppStore((state) => state.setQuickIntakeOpen);

  const [activeTab, setActiveTab] = useState<ModalTab>('DEPARTMENTS');

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!hub) return null;

  // Filter tickets for this specific terminal hub
  const hubTickets = tickets.filter((t) => t.locationCode === hub.code);
  const activeTickets = hubTickets.filter((t) => t.status !== 'CLSD');
  const resolvedTickets = hubTickets.filter((t) => t.status === 'CLSD' || t.status === 'RESL');

  const fallbackHistoryLogs: FallbackHistoryLog[] = [
    {
      ticketCode: `T-${hub.code}048`,
      task: 'Printer Troubleshoot',
      department: 'Cash Management',
      requestor: 'Booth #2 Cashier',
      workedBy: 'Nathaniel D. Esguerra',
      dateFinished: '2026-10-15 16:40',
      duration: '25 mins',
      notes: 'Cleared paper jam in thermal receipt cutter. Realigned sensor and ran self-test print.',
    },
    {
      ticketCode: `T-${hub.code}039`,
      task: 'Network Configuration',
      department: 'Operations',
      requestor: 'Dispatch Officer',
      workedBy: 'Stephen I. Miralles',
      dateFinished: '2026-10-12 11:15',
      duration: '45 mins',
      notes: 'Re-crimped RJ45 CAT6 connector on Dispatch Switch Port 4. Ping latency restored to <1ms.',
    },
    {
      ticketCode: `T-${hub.code}024`,
      task: 'Software Assistance',
      department: 'Station Admin',
      requestor: 'Station Clerk',
      workedBy: 'Nathaniel D. Esguerra',
      dateFinished: '2026-10-09 14:05',
      duration: '20 mins',
      notes: 'Restarted FiveStar Waybill SQLite service. Resolved database lock error.',
    },
  ];

  const handleOpenTicketDrawer = (ticketId: string) => {
    setSelectedTicketId(ticketId);
  };

  const handleOpenWorkbenchForTicket = (ticketId: string) => {
    setActiveWorkbenchTicketId(ticketId);
    setActiveView('workbench');
    onClose();
  };

  const handleFilterInTicketLists = () => {
    setLocationFilter(hub.code);
    setActiveView('tickets');
    onClose();
  };

  const handleQuickIntake = () => {
    setQuickIntakeOpen(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 w-full max-w-4xl bg-white border border-[#ECEEF2] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="px-6 py-5 bg-[#FAFAFB] border-b border-[#ECEEF2] flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 border border-orange-200/80 flex items-center justify-center font-mono text-base font-extrabold shadow-sm shrink-0">
              {hub.code}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-ink tracking-tight">
                  {hub.name}
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                {hub.region} • <span className="font-mono text-zinc-600">{hub.networkStatus}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors press-fx"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick KPI Metric Highlights */}
        <div className="px-6 py-3.5 bg-white border-b border-[#ECEEF2] grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#F8F9FA] rounded-xl p-3 border border-[#ECEEF2]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Active Tickets
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-extrabold text-ink font-mono">
                {activeTickets.length}
              </span>
              <span className="text-[11px] text-zinc-500 font-medium">pending</span>
            </div>
          </div>

          <div className="bg-[#F8F9FA] rounded-xl p-3 border border-[#ECEEF2]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Departments
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-extrabold text-ink font-mono">
                {HUB_DEPARTMENTS_CONFIG.length}
              </span>
              <span className="text-[11px] text-zinc-500 font-medium">active zones</span>
            </div>
          </div>

          <div className="bg-[#F8F9FA] rounded-xl p-3 border border-[#ECEEF2]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Workstations &amp; POS
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-extrabold text-ink font-mono">
                {hub.devicesCount}
              </span>
              <span className="text-[11px] text-zinc-500 font-medium">units</span>
            </div>
          </div>

          <div className="bg-[#F8F9FA] rounded-xl p-3 border border-[#ECEEF2]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Resolution History
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-extrabold text-emerald-700 font-mono">
                {resolvedTickets.length > 0 ? resolvedTickets.length : fallbackHistoryLogs.length}
              </span>
              <span className="text-[11px] text-zinc-500 font-medium">closed logs</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-3 bg-white border-b border-[#ECEEF2] flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('DEPARTMENTS')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'DEPARTMENTS'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Departments ({HUB_DEPARTMENTS_CONFIG.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ACTIVE_TICKETS')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'ACTIVE_TICKETS'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Active Tickets</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTickets.length > 0
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-zinc-100 text-zinc-600'
              }`}
            >
              {activeTickets.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('HISTORY')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'HISTORY'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Resolution History</span>
            <span className="px-1.5 py-0.2 rounded-full bg-zinc-100 text-zinc-600 text-[10px] font-bold">
              {resolvedTickets.length > 0 ? resolvedTickets.length : fallbackHistoryLogs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('INFRASTRUCTURE')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'INFRASTRUCTURE'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Hardware &amp; Network</span>
          </button>
        </div>

        {/* Tab Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#FAFAFB]">
          {activeTab === 'DEPARTMENTS' && (
            <HubDepartmentsTab
              hub={hub}
              activeTickets={activeTickets}
              onOpenTicketDrawer={handleOpenTicketDrawer}
            />
          )}

          {activeTab === 'ACTIVE_TICKETS' && (
            <HubActiveTicketsTab
              hub={hub}
              activeTickets={activeTickets}
              onOpenTicketDrawer={handleOpenTicketDrawer}
              onOpenWorkbenchForTicket={handleOpenWorkbenchForTicket}
              onQuickIntake={handleQuickIntake}
            />
          )}

          {activeTab === 'HISTORY' && (
            <HubResolutionHistoryTab
              hub={hub}
              resolvedTickets={resolvedTickets}
              fallbackHistoryLogs={fallbackHistoryLogs}
            />
          )}

          {activeTab === 'INFRASTRUCTURE' && (
            <HubInfrastructureTab hub={hub} />
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-white border-t border-[#ECEEF2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-zinc-400">
            Station Code: <strong className="font-mono text-zinc-700">{hub.code}</strong> • {hub.devicesCount} active devices
          </div>

          <div className="flex items-center gap-2.5">
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
              className="py-2 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-colors press-fx"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
