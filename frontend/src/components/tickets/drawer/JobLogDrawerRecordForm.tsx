import React, { useState } from 'react';
import { Edit2, Check } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { ticketsApi } from '../../../api/client';
import { canEditTicket } from '../../../store/slices/ticketOperationsSlice';
import type { Ticket, SupportMode, TicketStatus } from '../../../types/ticket';
import type { TeamMember } from '../../../types/team';
import { DiagnosedTaskSelector } from '../DiagnosedTaskSelector';
import { TicketChecklistSection } from '../checklist/TicketChecklistSection';
import { formatStandardTime } from '../../../utils/timeFormat';

export interface JobLogDrawerRecordFormProps {
  ticket: Ticket;
  notesDraft?: string;
  onNotesDraftChange?: (val: string) => void;
  isSavingNotes?: boolean;
  onSaveJobLog?: () => void;
  onUpdateMode?: (mode: SupportMode) => void;
  isAdmin: boolean;
  itTeamMembers: TeamMember[];
  onAssignTicket: (ticketId: string, techName: string, techId: string) => void;
}

export const JobLogDrawerRecordForm: React.FC<JobLogDrawerRecordFormProps> = ({
  ticket,
  isAdmin,
  itTeamMembers,
  onAssignTicket,
}) => {
  const currentUser = useAppStore((state) => state.currentUser);
  const isOwner = canEditTicket(currentUser, ticket);
  const addToast = useAppStore((state) => state.addToast);

  const [isEditingDiagnosis, setIsEditingDiagnosis] = useState(false);
  const [editDiagnosis, setEditDiagnosis] = useState(ticket.technicianDiagnosis || ticket.description || '');
  const [isSavingDiagnosis, setIsSavingDiagnosis] = useState(false);

  const handleSaveDiagnosis = async () => {
    setIsSavingDiagnosis(true);
    try {
      await ticketsApi.updateServiceRecord(ticket.id, {
        diagnosis: editDiagnosis.trim() || undefined,
      });
      addToast('Record Updated', 'Diagnosis & resolution updated successfully', 'success');
      setIsEditingDiagnosis(false);
      window.location.reload();
    } catch (err) {
      addToast('Update Failed', err instanceof Error ? err.message : 'Failed to update diagnosis', 'warning');
    } finally {
      setIsSavingDiagnosis(false);
    }
  };

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
    { no: '06', label: 'Diagnosis & Resolution', value: ticket.technicianDiagnosis || ticket.description },
  ];

  const timeFields = [
    { no: '07', label: 'Month', value: ticket.month },
    { no: '08', label: 'Date Started', value: ticket.dateStarted },
    { no: '09', label: 'Time Started', value: formatStandardTime(ticket.timeStarted) },
    { no: '12', label: 'Date Finished', value: ticket.dateFinished ?? '—' },
    {
      no: '10',
      label: 'Time Finished',
      value: ticket.timeFinished ? formatStandardTime(ticket.timeFinished) : '— (Active)',
    },
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
      {/* Original Employee Report & Context */}
      <div className="bg-canvas border border-line rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-ink">Original Employee Report & Context</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 text-zinc-500">Intake Description</span>
        </div>
        <p className="text-xs text-ink leading-relaxed bg-surface p-3 rounded-xl border border-line font-medium">
          {ticket.description || 'No description provided by requestor.'}
        </p>
      </div>

      {/* Persistent SOP Checklist & Saved Repair Guides */}
      <TicketChecklistSection
        ticketId={ticket.id}
        ticketStatus={isOwner ? ticket.status : ('CLSD' as TicketStatus)}
        ticketTaskCode={ticket.taskCode}
        assignedTechId={ticket.workedById ?? ticket.assigned_tech_id ?? null}
      />

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

          {/* Group 1: Organization & Requestor (Read-Only Intake Audit Record Across All Roles) */}
          <div className="bg-canvas border border-line rounded-2xl divide-y divide-line relative z-20 overflow-visible">
            <div className="px-3.5 py-2 bg-zinc-100/70 text-[11px] font-bold text-ink-subtle uppercase tracking-wider flex items-center justify-between">
              <span>1. Terminal &amp; Requestor Info</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-200/60 text-zinc-600 font-semibold">
                Intake Record
              </span>
            </div>

            {/* Company */}
            <div className="px-3.5 py-2 flex items-center justify-between gap-4 text-xs">
              <span className="text-ink-subtle font-medium">Company</span>
              <span className="font-semibold text-ink text-right">
                {ticket.company} ({ticket.companyCode})
              </span>
            </div>

            {/* Location Hub */}
            <div className="px-3.5 py-2 flex items-center justify-between gap-4 text-xs">
              <span className="text-ink-subtle font-medium">Location Hub</span>
              <span
                className={`font-semibold text-right ${
                  ticket.locationCode === 'TBD' ? 'text-amber-600 font-bold' : 'text-ink'
                }`}
              >
                {ticket.location} ({ticket.locationCode})
              </span>
            </div>

            {/* Department */}
            <div className="px-3.5 py-2 flex items-center justify-between gap-4 text-xs">
              <span className="text-ink-subtle font-medium">Department</span>
              <span className="font-semibold text-ink text-right">
                {ticket.department} ({ticket.departmentCode})
              </span>
            </div>

            {/* Requestor */}
            <div className="px-3.5 py-2 flex items-center justify-between gap-4 text-xs">
              <span className="text-ink-subtle font-medium">Requestor</span>
              <span className="font-semibold text-ink text-right">
                {ticket.employeeId ? `${ticket.requestor} [${ticket.employeeId}]` : ticket.requestor}
              </span>
            </div>
          </div>

        {/* Group 2: Issue & Assignment */}
        <div className="bg-canvas border border-line rounded-2xl divide-y divide-line relative z-30 overflow-visible">
          <div className="px-3.5 py-2 bg-zinc-100/70 text-[11px] font-bold text-ink-subtle uppercase tracking-wider">
            2. Task, Mode &amp; Assignment
          </div>
          {issueFields.map((f) => (
            <div
              key={f.no}
              className="px-3.5 py-2 flex items-center justify-between gap-4 text-xs"
            >
              <span className="text-ink-subtle font-medium shrink-0">
                {f.label}
              </span>
              {f.no === '05' ? (
                <div className="w-60">
                  <DiagnosedTaskSelector
                    ticketId={ticket.id}
                    currentTaskCode={ticket.taskCode}
                    currentTaskName={ticket.task}
                    compact
                    disabled={!isOwner || ticket.status !== 'PROG'}
                    align="right"
                  />
                </div>
              ) : f.no === '15' && isAdmin && ticket.status === 'OPEN' && !ticket.workedById && !ticket.assigned_tech_id && !ticket.workedBy ? (
                <select
                  value=""
                  onChange={(e) => {
                    const tech = itTeamMembers.find((m) => m.id === e.target.value);
                    if (tech) onAssignTicket(ticket.id, tech.name, tech.id);
                  }}
                  className="px-2.5 py-1 bg-surface border border-line rounded-lg text-xs font-semibold text-ink focus:border-orange-500 focus:outline-none"
                >
                  <option value="" disabled>Assign Tech...</option>
                  {itTeamMembers
                    .filter((m) => (m.systemRole === 'it' || m.systemRole === 'intern') && m.is_active !== false)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.primaryLocation.split(' ')[0]})
                      </option>
                    ))}
                </select>
              ) : f.no === '15' ? (
                <span className="font-semibold text-ink leading-snug">
                  {ticket.workedBy ?? 'Unassigned (General Pool)'}
                </span>
              ) : f.no === '06' ? (
                !isEditingDiagnosis ? (
                  <div className="flex items-center justify-end gap-2 max-w-[70%] text-right">
                    <span className="font-semibold text-ink leading-snug">
                      {ticket.technicianDiagnosis || ticket.description || '—'}
                    </span>
                    {isOwner && ticket.status === 'PROG' && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditDiagnosis(ticket.technicianDiagnosis || ticket.description || '');
                          setIsEditingDiagnosis(true);
                        }}
                        className="p-1 rounded text-zinc-400 hover:text-orange-600 hover:bg-orange-50 transition-colors shrink-0"
                        title="Edit diagnosis & resolution"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-end gap-1.5 w-full max-w-[75%]">
                    <textarea
                      value={editDiagnosis}
                      onChange={(e) => setEditDiagnosis(e.target.value)}
                      rows={2}
                      className="w-full px-2.5 py-1.5 bg-surface border border-line rounded-lg text-xs font-medium text-ink focus:border-orange-500 focus:outline-none
                      leading-relaxed"
                      placeholder="Enter technical diagnosis & resolution..."
                    />
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isSavingDiagnosis}
                        onClick={() => setIsEditingDiagnosis(false)}
                        className="px-2 py-0.5 rounded-lg text-[11px] font-semibold text-zinc-500 hover:text-zinc-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isSavingDiagnosis}
                        onClick={handleSaveDiagnosis}
                        className="px-2.5 py-0.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-semibold shadow-xs press-fx inline-flex
                        items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>{isSavingDiagnosis ? 'Saving...' : 'Save'}</span>
                      </button>
                    </div>
                  </div>
                )
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
