import React from 'react';
import {
  X,
  MapPin,
  Building2,
  Copy,
  MessageSquare,
  FileSpreadsheet,
  History,
} from 'lucide-react';
import type { Ticket } from '../../../types/ticket';
import { StatusBadge } from '../../common/StatusBadge';

export interface JobLogDrawerHeaderProps {
  ticket: Ticket;
  drawerTab: 'CHAT' | 'JOB_LOG' | 'HISTORY';
  messageCount: number;
  onSelectTab: (tab: 'CHAT' | 'JOB_LOG' | 'HISTORY') => void;
  onCopyShareLink: () => void;
  onRequestValidation?: () => void;
  onClose: () => void;
}

export const JobLogDrawerHeader: React.FC<JobLogDrawerHeaderProps> = ({
  ticket,
  drawerTab,
  messageCount,
  onSelectTab,
  onCopyShareLink,
  onClose,
}) => {
  return (
    <div className="p-5 border-b border-line bg-canvas/60 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-sm font-bold px-2.5 py-0.5 rounded-lg bg-zinc-900 text-white">
              {ticket.ticketCode}
            </span>
            <StatusBadge status={ticket.status} />
            {ticket.intakeSource && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-ink-subtle border border-line">
                {ticket.intakeSource}
              </span>
            )}
          </div>
          <h2 className="text-base font-semibold text-ink mt-2">{ticket.task}</h2>
          <p className="text-xs text-ink-subtle mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="inline-flex items-center gap-1 font-medium text-ink">
              Requestor: {ticket.requestor}
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {ticket.location}
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="inline-flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> {ticket.department}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onCopyShareLink}
            className="p-1.5 rounded-xl bg-surface border border-line text-ink-subtle hover:text-ink transition-colors press-fx"
            title="Copy employee confirmation link for chat"
            aria-label="Copy employee confirmation link"
          >
            <Copy className="w-4 h-4 text-orange-500" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-surface border border-line text-ink-subtle hover:text-ink transition-colors press-fx"
            aria-label="Close drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Drawer View Switcher: Live Chat vs 15-Column Job Log vs Activity Timeline */}
      <div className="grid grid-cols-3 gap-1.5 bg-surface p-1 rounded-xl border border-line">
        <button
          type="button"
          onClick={() => onSelectTab('CHAT')}
          className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all press-fx ${
            drawerTab === 'CHAT'
              ? 'bg-[#111315] text-white shadow-sm'
              : 'text-ink-subtle hover:text-ink'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-[#F97316]" />
          <span>Live Chat with Employee</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              drawerTab === 'CHAT'
                ? 'bg-[#F97316] text-white'
                : 'bg-zinc-100 text-ink'
            }`}
          >
            {messageCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('JOB_LOG')}
          className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all press-fx ${
            drawerTab === 'JOB_LOG'
              ? 'bg-[#111315] text-white shadow-sm'
              : 'text-ink-subtle hover:text-ink'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
          <span>15-Column Job Log &amp; Controls</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('HISTORY')}
          className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all press-fx ${
            drawerTab === 'HISTORY'
              ? 'bg-[#111315] text-white shadow-sm'
              : 'text-ink-subtle hover:text-ink'
          }`}
        >
          <History className="w-3.5 h-3.5 text-sky-400" />
          <span>Activity History</span>
        </button>
      </div>
    </div>
  );
};
