import React from 'react';
import { Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import type { Ticket } from '../../../../types/ticket';
import type { TerminalMeta } from '../../TerminalHubDetailModal';
import { StatusBadge } from '../../../../components/common/StatusBadge';

export interface HubActiveTicketsTabProps {
  hub: TerminalMeta;
  activeTickets: Ticket[];
  onOpenTicketDrawer: (ticketId: string) => void;
  onOpenWorkbenchForTicket: (ticketId: string) => void;
  onQuickIntake: () => void;
}

export const HubActiveTicketsTab: React.FC<HubActiveTicketsTabProps> = ({
  hub,
  activeTickets,
  onOpenTicketDrawer,
  onOpenWorkbenchForTicket,
  onQuickIntake,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-ink">
            Active Tickets at {hub.name} ({activeTickets.length})
          </h3>
          <p className="text-xs text-zinc-500">
            Open, unassigned, and in-progress technician dispatches for this station.
          </p>
        </div>
        <button
          type="button"
          onClick={onQuickIntake}
          className="py-1.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors press-fx"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Report Ticket Here</span>
        </button>
      </div>

      {activeTickets.length === 0 ? (
        <div className="bg-white border border-[#ECEEF2] rounded-2xl p-8 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-ink">All Systems Operational</h4>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            There are no unresolved tickets for {hub.name}. All ticketing booths, dispatch radios, and network gateways are running normally.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeTickets.map((t) => (
            <div
              key={t.id}
              className="bg-white border border-[#ECEEF2] rounded-2xl p-4 shadow-sm hover:border-orange-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-zinc-900 text-white">
                    {t.ticketCode}
                  </span>
                  <span className="text-xs font-bold text-ink">
                    {t.task}
                  </span>
                  <StatusBadge status={t.status} size="sm" />
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 uppercase">
                    {t.mode === 'SITE' ? 'Onsite' : 'Remote'}
                  </span>
                </div>

                <p className="text-xs text-zinc-600 line-clamp-2">
                  {t.description}
                </p>

                <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                  <span>Requestor: <strong className="text-zinc-700">{t.requestor}</strong></span>
                  <span>•</span>
                  <span>Dept: <strong className="text-zinc-700">{t.department}</strong></span>
                  <span>•</span>
                  <span>Created: {t.dateStarted} {t.timeStarted}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0">
                <button
                  type="button"
                  onClick={() => onOpenTicketDrawer(t.id)}
                  className="py-1.5 px-3 rounded-xl bg-[#F4F6F9] hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition-colors press-fx"
                >
                  Inspect Log
                </button>
                <button
                  type="button"
                  onClick={() => onOpenWorkbenchForTicket(t.id)}
                  className="py-1.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors press-fx flex items-center gap-1"
                >
                  <span>Open in Bench</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
