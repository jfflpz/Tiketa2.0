import React, { useState } from 'react';
import { CheckCircle2, Copy, Check, Printer, Plus, ListFilter } from 'lucide-react';
import type { Ticket } from '../../../types/ticket';
import { useAppStore } from '../../../store/useAppStore';

export interface TicketSubmissionReceiptProps {
  ticket: Ticket;
  onReset: () => void;
  onViewTickets: () => void;
}

export const TicketSubmissionReceipt: React.FC<TicketSubmissionReceiptProps> = ({
  ticket,
  onReset,
  onViewTickets,
}) => {
  const copyTicketShareLink = useAppStore((state) => state.copyTicketShareLink);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyTicketShareLink(ticket.ticketCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-surface border border-emerald-200/90 rounded-3xl p-8 shadow-card text-center space-y-6 animate-fade-in">
      <div className="w-16 h-16 rounded-full bg-emerald-100/80 text-brand flex items-center justify-center mx-auto ring-8 ring-emerald-50">
        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
      </div>

      <div className="space-y-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          Ticket Registered Successfully
        </span>
        <h2 className="text-2xl font-black text-ink mt-2">
          Help Request Dispatched
        </h2>
        <p className="text-xs text-ink-subtle max-w-md mx-auto">
          An on-duty Five Star IT Support technician has been alerted in the central triage queue.
        </p>
      </div>

      <div className="p-4 bg-canvas border border-line rounded-2xl max-w-sm mx-auto space-y-2 text-left">
        <div className="flex justify-between items-center text-xs">
          <span className="text-ink-subtle">Ticket Tracking Code:</span>
          <span className="font-mono font-bold text-sm text-ink">{ticket.ticketCode}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-ink-subtle">Location & Dept:</span>
          <span className="font-medium text-ink">{ticket.location} • {ticket.department}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-ink-subtle">Issue Type:</span>
          <span className="font-semibold text-brand">{ticket.task}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
        <button
          onClick={handleCopy}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-canvas hover:bg-surface border border-line text-xs font-semibold text-ink flex items-center justify-center gap-2 press-fx"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-ink-subtle" />}
          <span>{copied ? 'Link Copied!' : 'Copy Tracking Link'}</span>
        </button>

        <button
          onClick={() => window.print()}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-canvas hover:bg-surface border border-line text-xs font-semibold text-ink flex items-center justify-center gap-2 press-fx"
        >
          <Printer className="w-4 h-4 text-ink-subtle" />
          <span>Print Receipt</span>
        </button>

        <button
          onClick={onViewTickets}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-canvas hover:bg-surface border border-line text-xs font-semibold text-ink flex items-center justify-center gap-2 press-fx"
        >
          <ListFilter className="w-4 h-4 text-ink-subtle" />
          <span>View Ticket</span>
        </button>

        <button
          onClick={onReset}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold flex items-center justify-center gap-2 press-fx shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Report Another Problem</span>
        </button>
      </div>
    </div>
  );
};
