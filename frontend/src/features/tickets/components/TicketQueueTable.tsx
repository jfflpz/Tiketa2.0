import React from 'react';
import {
  MapPin,
  Copy,
  Check,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import type { Ticket } from '../../../types/ticket';
import type { TeamMember } from '../../../types/team';
import { StatusBadge } from '../../../components/common/StatusBadge';

export interface TicketQueueTableProps {
  tickets: Ticket[];
  isAdmin: boolean;
  itTeamMembers: TeamMember[];
  copiedCode: string | null;
  onSelectTicket: (ticketId: string) => void;
  onClaimAndWork: (e: React.MouseEvent, ticket: Ticket) => void;
  onFocusWorkbench: (e: React.MouseEvent, ticket: Ticket) => void;
  onResolveTicket: (e: React.MouseEvent, ticket: Ticket) => void;
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

export const TicketQueueTable: React.FC<TicketQueueTableProps> = ({
  tickets,
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
    <div className="bg-white border border-[#ECEEF2] rounded-2xl shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#F8F9FA] text-zinc-500 text-[11px] font-semibold border-b border-[#ECEEF2]">
              <th className="py-3 px-4">Ticket Code</th>
              <th className="py-3 px-3">Mode</th>
              <th className="py-3 px-3">Priority</th>
              <th className="py-3 px-3">Task &amp; Description</th>
              <th className="py-3 px-3">Requestor &amp; Dept</th>
              <th className="py-3 px-3">Terminal Hub</th>
              <th className="py-3 px-3">Assigned Tech</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ECEEF2]">
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-zinc-400">
                  <AlertCircle className="w-6 h-6 mx-auto mb-1.5 text-zinc-300" />
                  <p className="font-semibold text-ink text-xs">No matching tickets found</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Try clearing your filters or search keywords.</p>
                </td>
              </tr>
            ) : (
              tickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  onClick={() => onSelectTicket(ticket.id)}
                  className="hover:bg-orange-50/30 transition-colors cursor-pointer group"
                >
                  {/* Ticket Code */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-zinc-900 text-white group-hover:bg-orange-600 transition-colors">
                      {ticket.ticketCode}
                    </span>
                  </td>

                  {/* Mode */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span
                      className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        ticket.mode === 'SITE'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {ticket.mode}
                    </span>
                  </td>

                  {/* Priority */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getPriorityBadge(
                        ticket.priority
                      )}`}
                    >
                      {ticket.priority}
                    </span>
                  </td>

                  {/* Task & Description */}
                  <td className="py-3 px-3 max-w-xs">
                    <p className="font-bold text-ink truncate">{ticket.task}</p>
                    {ticket.description && (
                      <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                        {ticket.description}
                      </p>
                    )}
                  </td>

                  {/* Requestor & Department */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <p className="font-semibold text-ink">{ticket.requestor}</p>
                    <p className="text-[11px] text-zinc-400">{ticket.department}</p>
                  </td>

                  {/* Terminal Hub */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-zinc-700 font-medium">
                      <MapPin className="w-3 h-3 text-orange-500 shrink-0" />
                      <span>{ticket.location}</span>
                    </span>
                  </td>

                  {/* Assigned Tech with Admin Selector */}
                  <td className="py-3 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    {isAdmin ? (
                      <select
                        value={ticket.workedById ?? ''}
                        onChange={(e) => {
                          const tech = itTeamMembers.find((m) => m.id === e.target.value);
                          if (tech) {
                            onAssignTicket(ticket.id, tech.name, tech.id);
                          }
                        }}
                        className="px-2 py-1 bg-white border border-[#ECEEF2] rounded-lg text-xs font-semibold text-ink focus:border-orange-500 focus:outline-none cursor-pointer shadow-xs"
                      >
                        <option value="" disabled>Assign Tech...</option>
                        {itTeamMembers.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    ) : ticket.workedBy ? (
                      <span className="text-ink font-medium">{ticket.workedBy}</span>
                    ) : (
                      <span className="text-zinc-400 italic">Unassigned</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <StatusBadge status={ticket.status} size="sm" />
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      {ticket.status === 'OPEN' && (
                        <button
                          type="button"
                          onClick={(e) => onClaimAndWork(e, ticket)}
                          className="px-2.5 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-[11px] font-bold transition-all shadow-xs"
                        >
                          Claim &amp; Work
                        </button>
                      )}
                      {ticket.status === 'PROG' && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => onFocusWorkbench(e, ticket)}
                            className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-[11px] font-semibold transition-colors"
                          >
                            Workbench
                          </button>
                          <button
                            type="button"
                            onClick={(e) => onResolveTicket(e, ticket)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors"
                          >
                            Resolve
                          </button>
                        </>
                      )}
                      {ticket.status === 'RESL' && (
                        <button
                          type="button"
                          onClick={(e) => onCopyVerification(e, ticket.ticketCode)}
                          className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-[11px] font-bold transition-colors inline-flex items-center gap-1"
                        >
                          {copiedCode === ticket.ticketCode ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-amber-800" />
                              <span>Verification</span>
                            </>
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectTicket(ticket.id)}
                        className="p-1 rounded-lg text-zinc-400 hover:text-ink hover:bg-zinc-100 transition-colors"
                        title="Open 15-Column Job Log Drawer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
