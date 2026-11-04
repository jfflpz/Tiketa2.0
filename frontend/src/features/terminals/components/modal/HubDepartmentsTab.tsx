import React from 'react';
import {
  Building2,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import type { Ticket } from '../../../../types/ticket';
import type { LocationDepartmentSummary } from '../../../../api/client';

export interface HubDepartmentsTabProps {
  hubName: string;
  departments: LocationDepartmentSummary[];
  activeTickets: Ticket[];
  onOpenTicketDrawer: (ticketId: string) => void;
}

export const HubDepartmentsTab: React.FC<HubDepartmentsTabProps> = ({
  hubName,
  departments,
  activeTickets,
  onOpenTicketDrawer,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-ink">
            Operating Departments at {hubName}
          </h3>
          <p className="text-xs text-zinc-500">
            Authoritative operating departments mapped to this terminal in company directory.
          </p>
        </div>
        <span className="text-xs text-zinc-400 font-medium font-mono">
          {departments.length} registered department{departments.length !== 1 ? 's' : ''}
        </span>
      </div>

      {departments.length === 0 ? (
        <div className="p-8 bg-zinc-50 border border-[#ECEEF2] rounded-2xl text-center space-y-2">
          <Building2 className="w-8 h-8 text-zinc-400 mx-auto" />
          <h4 className="text-xs font-bold text-ink">No Mapped Departments</h4>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            This terminal has no operating departments registered in the central system directory.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {departments.map((dept) => {
            const deptTickets = activeTickets.filter(
              (t) =>
                t.departmentCode === dept.code ||
                t.department.toLowerCase().includes(dept.code.toLowerCase())
            );
            const activeCount = Math.max(dept.active_tickets_count, deptTickets.length);
            const hasIssue = activeCount > 0;

            return (
              <div
                key={dept.id || dept.code}
                className={`p-4 rounded-2xl border transition-all ${
                  hasIssue
                    ? 'bg-amber-50/40 border-amber-200'
                    : 'bg-white border-[#ECEEF2] hover:border-zinc-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        hasIssue
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-zinc-100 text-zinc-700'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-ink leading-tight truncate">
                        {dept.name}
                      </h4>
                      <span className="font-mono text-[10px] text-zinc-400 font-semibold block mt-0.5">
                        Code: {dept.code}
                      </span>
                    </div>
                  </div>

                  {hasIssue ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold shrink-0">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      {activeCount} Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      No Issues
                    </span>
                  )}
                </div>

                {deptTickets.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-amber-200/80 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                      Active Tickets ({deptTickets.length})
                    </span>
                    {deptTickets.map((dt) => (
                      <button
                        key={dt.id}
                        type="button"
                        onClick={() => onOpenTicketDrawer(dt.id)}
                        className="w-full text-left p-2 rounded-xl bg-white/95 hover:bg-white text-[11px] flex items-center justify-between border border-amber-200/80 text-ink press-fx shadow-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono font-bold text-orange-600 shrink-0">
                            {dt.ticketCode}
                          </span>
                          <span className="font-medium truncate text-zinc-700">
                            {dt.task}
                          </span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
