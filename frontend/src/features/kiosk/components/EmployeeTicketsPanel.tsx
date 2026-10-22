import React from 'react';
import { Clock, ArrowRight, UserCheck, MessageSquare, Copy, Check } from 'lucide-react';
import type { Ticket } from '../../../types/ticket';
import { StatusBadge } from '../../../components/common/StatusBadge';

export interface EmployeeTicketsPanelProps {
  tickets: Ticket[];
  onSelectTicket: (id: string) => void;
  onCopyLink: (ticketCode: string, id: string) => void;
  copiedId: string | null;
}

export const EmployeeTicketsPanel: React.FC<EmployeeTicketsPanelProps> = ({
  tickets,
  onSelectTicket,
  onCopyLink,
  copiedId,
}) => {
  if (tickets.length === 0) {
    return (
      <div className="bg-surface border border-line rounded-3xl p-12 text-center space-y-3 shadow-card">
        <div className="w-12 h-12 rounded-2xl bg-canvas text-ink-subtle flex items-center justify-center mx-auto">
          <Clock className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-sm text-ink">No Tickets Found</h3>
        <p className="text-xs text-ink-subtle max-w-sm mx-auto">
          You haven't submitted any tickets yet. Switch to "Create Ticket" to report an IT problem.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tickets.map((t) => (
        <div
          key={t.id}
          onClick={() => onSelectTicket(t.id)}
          className="bg-surface border border-line hover:border-zinc-300 rounded-3xl p-5 shadow-card hover:shadow-md transition-all cursor-pointer press-fx space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="font-mono font-bold text-xs text-ink bg-canvas px-2.5 py-1 rounded-xl border border-line">
                {t.ticketCode}
              </span>
              <span className="text-xs font-semibold text-brand">{t.task}</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={t.status} />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyLink(t.ticketCode, t.id);
                }}
                className="p-1 rounded-lg text-ink-subtle hover:text-ink hover:bg-canvas"
                title="Copy confirmation link"
              >
                {copiedId === t.id ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          <p className="text-xs text-ink-subtle line-clamp-2 leading-relaxed">
            {t.description}
          </p>

          <div className="flex items-center justify-between pt-2 border-t border-line/60 text-[11px] text-ink-subtle">
            <div className="flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-brand" />
              <span>{t.workedBy ? `Assigned: ${t.workedBy}` : 'Awaiting Technician Claim'}</span>
            </div>
            <div className="flex items-center gap-1 text-ink font-semibold">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Details & Chat</span>
              <ArrowRight className="w-3 h-3 ml-0.5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
