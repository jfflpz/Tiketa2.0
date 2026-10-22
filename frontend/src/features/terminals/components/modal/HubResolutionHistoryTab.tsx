import React from 'react';
import type { Ticket } from '../../../../types/ticket';
import type { TerminalMeta } from '../../TerminalHubDetailModal';
import { StatusBadge } from '../../../../components/common/StatusBadge';

export interface FallbackHistoryLog {
  ticketCode: string;
  task: string;
  department: string;
  requestor: string;
  workedBy: string;
  dateFinished: string;
  duration: string;
  notes: string;
}

export interface HubResolutionHistoryTabProps {
  hub: TerminalMeta;
  resolvedTickets: Ticket[];
  fallbackHistoryLogs: FallbackHistoryLog[];
}

export const HubResolutionHistoryTab: React.FC<HubResolutionHistoryTabProps> = ({
  hub,
  resolvedTickets,
  fallbackHistoryLogs,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-ink">
            Ticket Resolution History for {hub.name}
          </h3>
          <p className="text-xs text-zinc-500">
            Archived and verified repairs, logged durations, and technician sign-offs.
          </p>
        </div>
        <span className="text-xs text-zinc-400 font-medium">
          Audited maintenance records
        </span>
      </div>

      <div className="space-y-3">
        {resolvedTickets.length > 0 ? (
          resolvedTickets.map((t) => (
            <div
              key={t.id}
              className="bg-white border border-[#ECEEF2] rounded-2xl p-4 shadow-sm hover:border-zinc-300 transition-all space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-zinc-800 text-white">
                    {t.ticketCode}
                  </span>
                  <h4 className="text-xs font-bold text-ink">{t.task}</h4>
                  <StatusBadge status={t.status} size="sm" />
                </div>
                <span className="text-[11px] font-mono text-zinc-400">
                  {t.dateFinished || t.dateStarted}
                </span>
              </div>

              <p className="text-xs text-zinc-600">{t.description}</p>

              <div className="pt-2 border-t border-[#ECEEF2] flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500">
                <div className="flex items-center gap-2">
                  <span>Requestor: <strong>{t.requestor}</strong> ({t.department})</span>
                  <span>•</span>
                  <span>Worked By: <strong className="text-emerald-700">{t.workedBy || 'IT Support Staff'}</strong></span>
                </div>
                {t.duration && (
                  <span className="font-mono font-bold text-zinc-700">
                    Duration: {t.duration}h
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          fallbackHistoryLogs.map((log) => (
            <div
              key={log.ticketCode}
              className="bg-white border border-[#ECEEF2] rounded-2xl p-4 shadow-sm space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-zinc-800 text-white">
                    {log.ticketCode}
                  </span>
                  <h4 className="text-xs font-bold text-ink">{log.task}</h4>
                  <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-bold">
                    CLOSED
                  </span>
                </div>
                <span className="text-[11px] font-mono text-zinc-400">
                  {log.dateFinished}
                </span>
              </div>

              <p className="text-xs text-zinc-600">{log.notes}</p>

              <div className="pt-2 border-t border-[#ECEEF2] flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500">
                <div className="flex items-center gap-2">
                  <span>Requestor: <strong>{log.requestor}</strong> ({log.department})</span>
                  <span>•</span>
                  <span>Technician: <strong className="text-emerald-700">{log.workedBy}</strong></span>
                </div>
                <span className="font-mono font-bold text-zinc-700">
                  Duration: {log.duration}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
