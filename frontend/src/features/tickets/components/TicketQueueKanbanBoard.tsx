import React from 'react';
import {
  UserCheck,
  CheckCircle2,
  Clock,
  MessageSquare,
  ArrowRight,
  Copy,
  Check,
  Wrench,
} from 'lucide-react';
import type { Ticket } from '../../../types/ticket';
import type { TeamMember } from '../../../types/team';

export interface TicketQueueKanbanBoardProps {
  openTickets: Ticket[];
  progTickets: Ticket[];
  reslTickets: Ticket[];
  isAdmin: boolean;
  itTeamMembers: TeamMember[];
  copiedCode: string | null;
  onSelectTicket: (ticketId: string) => void;
  onClaimAndWork: (e: React.MouseEvent, ticket: Ticket) => void;
  onFocusWorkbench: (e: React.MouseEvent, ticket: Ticket) => void;
  onResolveTicket: (ticket: Ticket) => void;
  onCopyVerification: (e: React.MouseEvent, ticketCode: string) => void;
  onAssignTicket: (ticketId: string, techName: string, techId: string) => void;
}

const getPriorityBadge = (priority: Ticket['priority']) => {
  switch (priority) {
    case 'Critical':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'High':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Medium':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'Low':
      return 'bg-zinc-100 text-zinc-600 border-zinc-200';
  }
};

export const TicketQueueKanbanBoard: React.FC<TicketQueueKanbanBoardProps> = ({
  openTickets,
  progTickets,
  reslTickets,
  isAdmin,
  itTeamMembers,
  copiedCode,
  onSelectTicket,
  onClaimAndWork,
  onFocusWorkbench,
  onResolveTicket,
  onCopyVerification,
  onAssignTicket,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* COLUMN 1: UNASSIGNED POOL (OPEN) */}
      <div className="bg-white border border-[#ECEEF2] rounded-2xl p-4 shadow-card flex flex-col space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#ECEEF2]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
              1. Unassigned Pool (OPEN)
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold tabular-nums">
            {openTickets.length}
          </span>
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
          {openTickets.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400">
              <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-500" />
              <p className="font-semibold text-ink">Zero unassigned tickets!</p>
              <p className="text-[11px]">All submitted tickets have been claimed.</p>
            </div>
          ) : (
            openTickets.map((t) => (
              <div
                key={t.id}
                onClick={() => onSelectTicket(t.id)}
                className="p-3.5 rounded-xl bg-[#F4F6F9] hover:bg-orange-50/50 border border-[#ECEEF2] space-y-2.5 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-white">
                    {t.ticketCode}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getPriorityBadge(
                      t.priority
                    )}`}
                  >
                    {t.priority}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-bold text-ink">{t.task}</p>
                  <p className="text-[11px] text-zinc-500 line-clamp-2 mt-0.5">
                    {t.description}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-200/70">
                  <span>
                    <strong className="text-ink">{t.location}</strong> • {t.requestor}
                  </span>
                  <span className="inline-flex items-center gap-1 text-orange-600 font-semibold">
                    <MessageSquare className="w-3 h-3" />
                    {t.messages?.length ?? 0}
                  </span>
                </div>

                {isAdmin ? (
                  <div className="pt-2 border-t border-zinc-200/70" onClick={(e) => e.stopPropagation()}>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                      Assign IT Specialist:
                    </label>
                    <select
                      value=""
                      onChange={(e) => {
                        const tech = itTeamMembers.find((m) => m.id === e.target.value);
                        if (tech) onAssignTicket(t.id, tech.name, tech.id);
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#ECEEF2] rounded-lg text-xs font-semibold text-ink focus:border-orange-500 focus:outline-none"
                    >
                      <option value="" disabled>Dispatch Tech...</option>
                      {itTeamMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => onClaimAndWork(e, t)}
                    className="w-full py-2 px-3 rounded-lg bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Claim &amp; Open Workbench</span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* COLUMN 2: ACTIVE REPAIRS (PROG) */}
      <div className="bg-white border border-[#ECEEF2] rounded-2xl p-4 shadow-card flex flex-col space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#ECEEF2]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
              2. Active Repairs (PROG)
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold tabular-nums">
            {progTickets.length}
          </span>
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
          {progTickets.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400">
              <Wrench className="w-6 h-6 mx-auto mb-1 text-zinc-300" />
              <p className="font-semibold text-ink">No tickets in progress</p>
              <p className="text-[11px]">Claim an open ticket from column 1.</p>
            </div>
          ) : (
            progTickets.map((t) => (
              <div
                key={t.id}
                onClick={() => onSelectTicket(t.id)}
                className="p-3.5 rounded-xl bg-[#F4F6F9] hover:bg-orange-50/50 border border-[#ECEEF2] space-y-2.5 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-white">
                    {t.ticketCode}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white border border-zinc-200 text-zinc-700">
                    {t.mode === 'SITE' ? 'On-Site' : 'Remote'}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-bold text-ink">{t.task}</p>
                  <p className="text-[11px] text-zinc-500 line-clamp-2 mt-0.5">
                    {t.description}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-200/70">
                  <span>
                    <strong className="text-ink">{t.location}</strong> • {t.department}
                  </span>
                  <span className="text-orange-600 font-semibold truncate max-w-[120px]">
                    {t.workedBy ?? 'Assigned'}
                  </span>
                </div>

                {isAdmin && (
                  <div className="pt-1.5" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={t.workedById ?? ''}
                      onChange={(e) => {
                        const tech = itTeamMembers.find((m) => m.id === e.target.value);
                        if (tech) onAssignTicket(t.id, tech.name, tech.id);
                      }}
                      className="w-full px-2 py-1 bg-white border border-[#ECEEF2] rounded-lg text-[11px] font-medium text-zinc-700 focus:border-orange-500 focus:outline-none"
                    >
                      <option value="" disabled>Reassign Tech...</option>
                      {itTeamMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div
                  className="grid grid-cols-2 gap-2 pt-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={(e) => onFocusWorkbench(e, t)}
                    className="py-1.5 px-2.5 rounded-lg bg-white hover:bg-zinc-100 text-ink border border-zinc-200 text-xs font-semibold transition-colors active:scale-95"
                  >
                    Workbench ({t.messages?.length ?? 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => onResolveTicket(t)}
                    className="py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1 shadow-sm transition-colors active:scale-95"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Resolve</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* COLUMN 3: PENDING SIGN-OFF (RESL) */}
      <div className="bg-white border border-[#ECEEF2] rounded-2xl p-4 shadow-card flex flex-col space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#ECEEF2]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
              3. Pending Sign-Off (RESL)
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold tabular-nums">
            {reslTickets.length}
          </span>
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
          {reslTickets.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400">
              <Clock className="w-6 h-6 mx-auto mb-1 text-zinc-300" />
              <p className="font-semibold text-ink">No pending verifications</p>
              <p className="text-[11px]">Resolved tickets waiting for employee sign-off show here.</p>
            </div>
          ) : (
            reslTickets.map((t) => (
              <div
                key={t.id}
                onClick={() => onSelectTicket(t.id)}
                className="p-3.5 rounded-xl bg-amber-50/40 border border-amber-200/80 space-y-2.5 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-white">
                    {t.ticketCode}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                    {t.duration ?? 0.65} hrs logged
                  </span>
                </div>

                <div>
                  <p className="text-xs font-bold text-ink">{t.task}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
                    Repaired by <strong>{t.workedBy ?? 'IT'}</strong> • Awaiting {t.requestor} sign-off
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-amber-200/60">
                  <span>{t.location}</span>
                  <span className="text-amber-800 font-semibold">Awaiting Verification</span>
                </div>

                <div
                  className="grid grid-cols-2 gap-2 pt-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={(e) => onCopyVerification(e, t.ticketCode)}
                    className="py-1.5 px-2 rounded-lg bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold inline-flex items-center justify-center gap-1 transition-colors active:scale-95"
                  >
                    {copiedCode === t.ticketCode ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectTicket(t.id)}
                    className="py-1.5 px-2 rounded-lg bg-[#111315] hover:bg-zinc-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-1 transition-colors active:scale-95"
                  >
                    <span>Drawer</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
