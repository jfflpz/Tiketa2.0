import React from 'react';
import {
  X,
  MapPin,
  Building2,
  Wrench,
  Copy,
  MessageSquare,
  FileSpreadsheet,
} from 'lucide-react';
import type { Ticket } from '../../../types/ticket';
import { StatusBadge } from '../../common/StatusBadge';

export interface JobLogDrawerHeaderProps {
  ticket: Ticket;
  drawerTab: 'CHAT' | 'JOB_LOG';
  messageCount: number;
  onSelectTab: (tab: 'CHAT' | 'JOB_LOG') => void;
  onOpenWorkbench: () => void;
  onCopyShareLink: () => void;
  onRequestValidation: () => void;
  onClose: () => void;
}

export const JobLogDrawerHeader: React.FC<JobLogDrawerHeaderProps> = ({
  ticket,
  drawerTab,
  messageCount,
  onSelectTab,
  onOpenWorkbench,
  onCopyShareLink,
  onRequestValidation,
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
          <p className="text-xs text-ink-subtle mt-0.5 flex items-center gap-3">
            <span className="inline-flex items-center gap-1 font-medium text-ink">
              Requestor: {ticket.requestor}
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {ticket.location}
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> {ticket.department}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenWorkbench}
            className="px-2.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all press-fx"
            title="Open this ticket in Active Workbench"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Active Workbench</span>
          </button>
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

      {/* Validation Request Banner when Resolved */}
      {(ticket.status === 'RESL' || ticket.validationRequested) && (
        <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-between gap-2 text-xs">
          <div className="min-w-0">
            <span className="font-bold text-ink block truncate">
              Validation Requested: Awaiting {ticket.requestor} ({ticket.employeeId}) Sign-Off
            </span>
            <span className="text-[11px] text-zinc-500">
              Employee must validate repair via confirmation screen.
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onCopyShareLink}
              className="px-2.5 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold press-fx"
            >
              Copy Link
            </button>
            <button
              type="button"
              onClick={onRequestValidation}
              className="px-2.5 py-1 rounded-lg bg-white border border-orange-300 text-orange-800 hover:bg-orange-100 text-[11px] font-bold press-fx"
            >
              Remind
            </button>
          </div>
        </div>
      )}

      {/* Drawer View Switcher: Live Chat vs 15-Column Job Log */}
      <div className="grid grid-cols-2 gap-1.5 bg-surface p-1 rounded-xl border border-line">
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
      </div>
    </div>
  );
};
