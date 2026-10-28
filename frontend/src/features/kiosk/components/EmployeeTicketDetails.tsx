// @spec FR-VERIF-02: Employee Ticket Details with Interactive Closure Verification Gate
import React from 'react';
import { ArrowLeft, CheckCircle2, Copy, Check, ShieldCheck } from 'lucide-react';
import type { Ticket } from '../../../types/ticket';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { TicketConversation } from './TicketConversation';
import { useAppStore } from '../../../store/useAppStore';

export interface EmployeeTicketDetailsProps {
  ticket: Ticket;
  onBack: () => void;
}

export const EmployeeTicketDetails: React.FC<EmployeeTicketDetailsProps> = ({ ticket, onBack }) => {
  const openVerificationModal = useAppStore((state) => state.openVerificationModal);
  const copyTicketShareLink = useAppStore((state) => state.copyTicketShareLink);
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    const res = await copyTicketShareLink(ticket.ticketCode, ticket.id);
    if (res.success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStepIndex = (status: Ticket['status']) => {
    switch (status) {
      case 'OPEN':
        return 1;
      case 'PROG':
        return 2;
      case 'RESL':
        return 3;
      case 'CLSD':
        return 4;
    }
  };

  const currentStep = getStepIndex(ticket.status);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between bg-surface border border-line rounded-2xl px-5 py-3 shadow-card">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-ink-subtle hover:text-ink press-fx"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Ticket List</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-xs text-ink">{ticket.ticketCode}</span>
          <StatusBadge status={ticket.status} />
          <button
            onClick={handleCopy}
            className="p-1 rounded-lg text-ink-subtle hover:text-ink hover:bg-canvas press-fx"
            title="Copy share link"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Verification Action Banner if status === RESL */}
      {ticket.status === 'RESL' && (
        <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-5 shadow-card space-y-3 animate-fade-in">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-bold text-xs text-emerald-950 uppercase tracking-wide">
                IT Support Marked This Issue Resolved
              </h3>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Please verify your equipment (test printing, connection, etc.). If working normally, click below to review and confirm closure.
              </p>
            </div>
          </div>

          <div className="pt-1 flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => openVerificationModal(ticket.id)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 press-fx shadow-sm"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Review &amp; Verify Closure</span>
            </button>
          </div>
        </div>
      )}

      {/* 4-Step Progress Indicator */}
      <div className="bg-surface border border-line rounded-2xl p-4 shadow-card">
        <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold">
          <div className={`p-2 rounded-xl ${currentStep >= 1 ? 'bg-zinc-900 text-white font-bold' : 'bg-canvas text-ink-faint'}`}>
            1. Registered
          </div>
          <div className={`p-2 rounded-xl ${currentStep >= 2 ? 'bg-zinc-900 text-white font-bold' : 'bg-canvas text-ink-faint'}`}>
            2. In Progress
          </div>
          <div className={`p-2 rounded-xl ${currentStep >= 3 ? 'bg-zinc-900 text-white font-bold' : 'bg-canvas text-ink-faint'}`}>
            3. Resolved
          </div>
          <div className={`p-2 rounded-xl ${currentStep >= 4 ? 'bg-emerald-600 text-white font-bold' : 'bg-canvas text-ink-faint'}`}>
            4. Closed
          </div>
        </div>
      </div>

      {/* Ticket Details Summary Card */}
      <div className="bg-surface border border-line rounded-2xl p-5 shadow-card space-y-3">
        <h4 className="text-xs font-bold text-ink uppercase tracking-wider text-ink-subtle">Ticket Details</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-ink-subtle block text-[11px]">Reported Issue:</span>
            <span className="font-bold text-ink">{ticket.task}</span>
          </div>
          <div>
            <span className="text-ink-subtle block text-[11px]">Location:</span>
            <span className="font-semibold text-ink">{ticket.location} • {ticket.department}</span>
          </div>
          <div>
            <span className="text-ink-subtle block text-[11px]">Requestor:</span>
            <span className="font-medium text-ink">
              {ticket.requestor} {ticket.employeeId ? `(${ticket.employeeId})` : ''}
            </span>
          </div>
          <div>
            <span className="text-ink-subtle block text-[11px]">Assigned Technician:</span>
            <span className="font-semibold text-brand">{ticket.workedBy || 'Awaiting Triage'}</span>
          </div>
        </div>
        <div className="pt-2 border-t border-line/60">
          <span className="text-ink-subtle block text-[11px]">Notes:</span>
          <p className="text-xs text-ink leading-relaxed mt-0.5">{ticket.description}</p>
        </div>
      </div>

      {/* Two-Way Live Chat Component */}
      <TicketConversation ticket={ticket} />
    </div>
  );
};
