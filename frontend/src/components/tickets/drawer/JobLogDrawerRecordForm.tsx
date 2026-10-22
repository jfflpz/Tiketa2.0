import React from 'react';
import { Save } from 'lucide-react';
import type { Ticket, SupportMode } from '../../../types/ticket';
import type { TeamMember } from '../../../types/team';
import { DiagnosedTaskSelector } from '../DiagnosedTaskSelector';

export interface JobLogDrawerRecordFormProps {
  ticket: Ticket;
  notesDraft: string;
  onNotesDraftChange: (val: string) => void;
  isSavingNotes: boolean;
  onSaveJobLog: () => void;
  onUpdateMode: (mode: SupportMode) => void;
  isAdmin: boolean;
  itTeamMembers: TeamMember[];
  onAssignTicket: (ticketId: string, techName: string, techId: string) => void;
}

export const JobLogDrawerRecordForm: React.FC<JobLogDrawerRecordFormProps> = ({
  ticket,
  notesDraft,
  onNotesDraftChange,
  isSavingNotes,
  onSaveJobLog,
  onUpdateMode,
  isAdmin,
  itTeamMembers,
  onAssignTicket,
}) => {
  const orgFields = [
    { no: '01', label: 'Company', value: `${ticket.company} (${ticket.companyCode})` },
    { no: '14', label: 'Location Hub', value: `${ticket.location} (${ticket.locationCode})` },
    { no: '03', label: 'Department', value: `${ticket.department} (${ticket.departmentCode})` },
    {
      no: '04',
      label: 'Requestor',
      value: ticket.employeeId
        ? `${ticket.requestor} [${ticket.employeeId}]`
        : ticket.requestor,
    },
  ];

  const issueFields = [
    { no: '05', label: 'Task Category', value: `${ticket.task} (${ticket.taskCode})` },
    {
      no: '02',
      label: 'Support Mode',
      value:
        ticket.mode === 'SITE'
          ? 'SITE (On-Site Terminal Repair)'
          : 'REM (Remote Support)',
    },
    { no: '13', label: 'Status', value: ticket.status },
    { no: '15', label: 'Worked By', value: ticket.workedBy ?? 'Unassigned (General Pool)' },
    { no: '06', label: 'Description', value: ticket.description },
  ];

  const timeFields = [
    { no: '07', label: 'Month', value: ticket.month },
    { no: '08', label: 'Date Started', value: ticket.dateStarted },
    { no: '09', label: 'Time Started', value: ticket.timeStarted },
    { no: '12', label: 'Date Finished', value: ticket.dateFinished ?? '—' },
    { no: '10', label: 'Time Finished', value: ticket.timeFinished ?? '— (Active)' },
    {
      no: '11',
      label: 'Duration (Hours)',
      value:
        ticket.duration !== undefined
          ? `${ticket.duration.toFixed(2)} hrs`
          : '— (Computed on Resolution)',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Technician Quick Controls: Support Mode & Repair Notes */}
      <div className="bg-canvas border border-line rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-ink">
            Technician Work Controls
          </span>
          <div className="inline-flex items-center bg-surface p-0.5 rounded-xl border border-line">
            {(['REM', 'SITE'] as SupportMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onUpdateMode(m)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all press-fx ${
                  ticket.mode === m
                    ? 'bg-zinc-900 text-white shadow-sm'
                    : 'text-ink-subtle hover:text-ink'
                }`}
              >
                {m === 'REM' ? 'Remote (REM)' : 'On-Site (SITE)'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[11px] font-medium text-ink-subtle">
            Symptom &amp; Repair Notes (Job Log Column #06)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={notesDraft}
              onChange={(e) => onNotesDraftChange(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-surface border border-line rounded-xl text-xs text-ink focus:outline-none focus:border-zinc-500"
            />
            <button
              type="button"
              disabled={isSavingNotes}
              onClick={onSaveJobLog}
              className="px-3 py-1.5 rounded-xl bg-surface hover:bg-zinc-100 text-ink border border-line text-xs font-semibold inline-flex items-center gap-1 transition-colors press-fx"
            >
              <Save className="w-3.5 h-3.5 text-ink-subtle" />
              <span>{isSavingNotes ? 'Saving...' : 'Save Job Log'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grouped 15-Column Job Log Record */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-subtle">
            15-Column Job Log Record
          </span>
          <span className="text-[11px] font-mono text-ink-faint">
            Standardized Format
          </span>
        </div>

        {/* Group 1: Organization & Requestor */}
        <div className="bg-canvas border border-line rounded-2xl divide-y divide-line overflow-hidden">
          <div className="px-3.5 py-2 bg-zinc-100/70 text-[11px] font-bold text-ink-subtle uppercase tracking-wider">
            1. Terminal &amp; Requestor Info
          </div>
          {orgFields.map((f) => (
            <div
              key={f.no}
              className="px-3.5 py-2 flex items-center justify-between gap-4 text-xs"
            >
              <span className="text-ink-subtle font-medium">
                <span className="font-mono text-[10px] text-ink-faint mr-1.5">
                  #{f.no}
                </span>
                {f.label}
              </span>
              <span className="font-semibold text-ink text-right">{f.value}</span>
            </div>
          ))}
        </div>

        {/* Group 2: Issue & Assignment */}
        <div className="bg-canvas border border-line rounded-2xl divide-y divide-line overflow-hidden">
          <div className="px-3.5 py-2 bg-zinc-100/70 text-[11px] font-bold text-ink-subtle uppercase tracking-wider">
            2. Task, Mode &amp; Assignment
          </div>
          {issueFields.map((f) => (
            <div
              key={f.no}
              className="px-3.5 py-2 flex items-center justify-between gap-4 text-xs"
            >
              <span className="text-ink-subtle font-medium shrink-0">
                <span className="font-mono text-[10px] text-ink-faint mr-1.5">
                  #{f.no}
                </span>
                {f.label}
              </span>
              {f.no === '05' ? (
                <div className="w-60">
                  <DiagnosedTaskSelector
                    ticketId={ticket.id}
                    currentTaskCode={ticket.taskCode}
                    currentTaskName={ticket.task}
                    compact
                  />
                </div>
              ) : f.no === '15' && isAdmin ? (
                <select
                  value={ticket.workedById ?? ''}
                  onChange={(e) => {
                    const tech = itTeamMembers.find((m) => m.id === e.target.value);
                    if (tech) onAssignTicket(ticket.id, tech.name, tech.id);
                  }}
                  className="px-2.5 py-1 bg-surface border border-line rounded-lg text-xs font-semibold text-ink focus:border-orange-500 focus:outline-none"
                >
                  <option value="" disabled>Assign Tech...</option>
                  {itTeamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.primaryLocation.split(' ')[0]})
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-semibold text-ink text-right max-w-[65%]">
                  {f.value}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Group 3: Timestamps & Duration */}
        <div className="bg-canvas border border-line rounded-2xl divide-y divide-line overflow-hidden">
          <div className="px-3.5 py-2 bg-zinc-100/70 text-[11px] font-bold text-ink-subtle uppercase tracking-wider">
            3. Timestamps &amp; Active Labor Duration
          </div>
          {timeFields.map((f) => (
            <div
              key={f.no}
              className="px-3.5 py-2 flex items-center justify-between gap-4 text-xs"
            >
              <span className="text-ink-subtle font-medium">
                <span className="font-mono text-[10px] text-ink-faint mr-1.5">
                  #{f.no}
                </span>
                {f.label}
              </span>
              <span className="font-mono font-semibold text-ink text-right">
                {f.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
