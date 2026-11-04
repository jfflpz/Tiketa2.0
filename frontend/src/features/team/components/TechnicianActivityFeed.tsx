import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { Ticket } from '../../../types/ticket';

export interface TechnicianActivityFeedProps {
  tickets: Ticket[];
  onSelectTicket: (ticketId: string) => void;
  onOpenQueue: () => void;
}

export const TechnicianActivityFeed: React.FC<TechnicianActivityFeedProps> = ({
  tickets,
  onSelectTicket,
  onOpenQueue,
}) => {
  return (
    <div className="bg-white border border-[#ECEEF2] rounded-3xl p-5 shadow-card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-ink">
            Live 15-Column Dispatch Activity &amp; Assignment Logs
          </h2>
          <p className="text-xs text-zinc-500">
            Audit trail of technician claims, active repairs, and confirmed closures across all terminals.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenQueue}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold transition-colors press-fx"
        >
          <span>Open Full IT Triage Queue</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="divide-y divide-[#ECEEF2]">
        {tickets.map((t) => (
          <div
            key={t.id}
            onClick={() => onSelectTicket(t.id)}
            className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs cursor-pointer hover:bg-zinc-50 rounded-xl transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-zinc-900 text-white shrink-0">
                {t.ticketCode}
              </span>
              <div>
                <h4 className="font-bold text-ink">{t.task}</h4>
                <p className="text-[11px] text-zinc-500">
                  {t.requestor} ({t.department}) • <span className="font-semibold text-zinc-700">{t.location}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-zinc-500">
                Worked By: <strong className="text-emerald-700">{t.workedBy ?? 'Unassigned'}</strong>
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  t.status === 'CLSD'
                    ? 'bg-zinc-100 text-zinc-700'
                    : t.status === 'RESL'
                    ? 'bg-emerald-100 text-emerald-800'
                    : t.status === 'PROG'
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {t.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
