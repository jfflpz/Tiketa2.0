import React from 'react';
import { MapPin, Briefcase, Flame, Trash2, ShieldAlert } from 'lucide-react';
import type { TeamMember } from '../../../types/team';

export interface ITStaffTableProps {
  staff: TeamMember[];
  currentUserEmail?: string;
  onDeleteMember: (id: string, name: string) => void;
}

export const ITStaffTable: React.FC<ITStaffTableProps> = ({
  staff,
  currentUserEmail,
  onDeleteMember,
}) => {
  if (staff.length === 0) {
    return (
      <div className="bg-white border border-[#ECEEF2] rounded-3xl p-12 text-center space-y-3 shadow-card">
        <ShieldAlert className="w-10 h-10 text-zinc-300 mx-auto" />
        <h3 className="text-sm font-bold text-ink">No Staff Accounts Found</h3>
        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
          No authorized IT staff or administrator accounts are registered in the database, or an error occurred loading them.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.map((member) => {
          const isCurrentUser = currentUserEmail?.toLowerCase() === member.email.toLowerCase();
          const isDeactivated = member.is_active === false;

          return (
            <div
              key={member.id}
              className={`bg-white border rounded-2xl p-4 shadow-card transition-all flex flex-col justify-between space-y-3 ${
                isDeactivated
                  ? 'border-zinc-200 opacity-60 bg-zinc-50/50'
                  : 'border-[#ECEEF2] hover:border-orange-300'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-11 h-11 rounded-full border border-[#ECEEF2] bg-zinc-50 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-xs font-bold text-ink truncate">{member.name}</h3>
                        {isCurrentUser && (
                          <span className="px-1.5 py-0.2 rounded bg-orange-100 text-orange-700 text-[9px] font-extrabold uppercase">
                            You
                          </span>
                        )}
                        {member.systemRole === 'admin' && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-extrabold uppercase">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate">{member.email}</p>
                      {member.username && (
                        <p className="text-[10px] font-mono text-orange-600 font-semibold">@{member.username}</p>
                      )}
                      <span className="inline-block mt-0.5 text-[10px] font-semibold text-zinc-600">
                        {member.role}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      isDeactivated
                        ? 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                        : member.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-zinc-100 text-zinc-600'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isDeactivated
                          ? 'bg-zinc-400'
                          : 'bg-emerald-500 animate-pulse'
                      }`}
                    />
                    {isDeactivated ? 'Deactivated' : 'Active'}
                  </span>
                </div>

                <div className="bg-[#F8F9FA] rounded-xl p-2.5 text-xs space-y-1.5 border border-[#ECEEF2]">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-zinc-400" /> Station Hub:
                    </span>
                    <span className="font-bold text-ink truncate max-w-[170px]">
                      {member.primaryLocation}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500 flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-zinc-400" /> Dept:
                    </span>
                    <span className="font-medium text-zinc-700 truncate max-w-[170px]">
                      {member.department}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-xl p-2">
                    <span className="text-[10px] text-emerald-700 font-semibold block">Closed Repairs</span>
                    <span className="font-mono font-bold text-emerald-800 text-sm">
                      {member.ticketsClosed}
                    </span>
                  </div>
                  <div className="bg-orange-50/60 border border-orange-200/60 rounded-xl p-2">
                    <span className="text-[10px] text-orange-700 font-semibold block">Active Bench</span>
                    <span className="font-mono font-bold text-orange-800 text-sm">
                      {member.activeTickets}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#ECEEF2] flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold flex items-center gap-1">
                  <Flame className="w-3 h-3 text-orange-500 fill-orange-400" />
                  {member.flameScore} Rating
                </span>

                {!isCurrentUser && !isDeactivated && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Deactivate staff account @${member.username || member.name}?`)) {
                        onDeleteMember(member.id, member.name);
                      }
                    }}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors press-fx"
                    title="Deactivate Staff Account"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
