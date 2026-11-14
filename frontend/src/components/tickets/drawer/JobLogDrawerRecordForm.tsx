import React, { useState, useEffect } from 'react';
import { Edit2, Check, Pause, Play, Clock, HardDrive } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { ticketsApi, assetsApi, type AssetRecord } from '../../../api/client';
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
  const pauseTicketWorkApi = useAppStore((state) => state.pauseTicketWorkApi);
  const resumeTicketWorkApi = useAppStore((state) => state.resumeTicketWorkApi);

  const [isEditingDiagnosis, setIsEditingDiagnosis] = useState(false);
  const [editDiagnosis, setEditDiagnosis] = useState(ticket.technicianDiagnosis || ticket.description || '');
  const [isSavingDiagnosis, setIsSavingDiagnosis] = useState(false);
  const [isTogglingPause, setIsTogglingPause] = useState(false);
  const [pauseError, setPauseError] = useState<string | null>(null);

  // F-F1: Minimal authorized asset selection & history capture
  const canEditAsset = isOwner || isAdmin;
  const [assetOptions, setAssetOptions] = useState<AssetRecord[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>(ticket.assetId ?? '');
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [isSavingAsset, setIsSavingAsset] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [attachedAssetSummary, setAttachedAssetSummary] = useState<{
    tag?: string;
    model?: string;
    serial?: string;
  }>({
    tag: ticket.assetTag,
    model: ticket.assetModel,
    serial: ticket.assetSerial,
  });

  useEffect(() => {
    setSelectedAssetId(ticket.assetId ?? '');
    setAttachedAssetSummary({
      tag: ticket.assetTag,
      model: ticket.assetModel,
      serial: ticket.assetSerial,
    });
  }, [ticket.id, ticket.assetId, ticket.assetTag, ticket.assetModel, ticket.assetSerial]);

  useEffect(() => {
    if (!canEditAsset) return;
    let cancelled = false;
    setIsLoadingAssets(true);
    assetsApi
      .list(ticket.locationId ? { location_id: ticket.locationId } : undefined)
      .then((rows) => {
        if (!cancelled) setAssetOptions(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setAssetOptions([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingAssets(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canEditAsset, ticket.locationId]);

  const handleSaveAsset = async () => {
    if (!selectedAssetId || isSavingAsset) return;
    setAssetError(null);
    setIsSavingAsset(true);
    try {
      const updated = await assetsApi.attachToTicket(ticket.id, selectedAssetId);
      const picked = assetOptions.find((a) => a.id === selectedAssetId);
      setAttachedAssetSummary({
        tag: updated.asset_tag ?? picked?.asset_tag ?? undefined,
        model: updated.asset_model ?? picked?.model_name ?? undefined,
        serial: updated.asset_serial ?? picked?.serial_number ?? undefined,
      });
      addToast('Asset Linked', 'Saved asset identity recorded on ticket.', 'success');
    } catch (err) {
      // Keep user's selectedAssetId intact so failed saves retain input
      setAssetError(err instanceof Error ? err.message : 'Failed to attach asset. Your selection was kept.');
    } finally {
      setIsSavingAsset(false);
    }
  };

  const renderRiskBadge = (risk?: Ticket['riskLevel']) => {
    const normalized = risk ?? 'UNKNOWN';
    const styles: Record<string, string> = {
      CRITICAL: 'bg-rose-50 text-rose-700 border-rose-200',
      HIGH: 'bg-amber-50 text-amber-700 border-amber-200',
      MEDIUM: 'bg-sky-50 text-sky-700 border-sky-200',
      LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      UNKNOWN: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    };
    const labels: Record<string, string> = {
      CRITICAL: 'Critical Risk',
      HIGH: 'High Risk',
      MEDIUM: 'Medium Risk',
      LOW: 'Low Risk',
      UNKNOWN: 'Unknown Risk',
    };
    return (
      <span
        data-testid="ticket-risk-badge"
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${styles[normalized] ?? styles.UNKNOWN}`}
      >
        {labels[normalized] ?? 'Unknown Risk'}
      </span>
    );
  };

  const formatMinutes = (minutes?: number): string => {
    if (minutes === undefined || minutes === null || Number.isNaN(minutes)) {
      return '— (Server-tracked)';
    }
    const rounded = Math.max(0, Math.round(minutes));
    const hrs = Math.floor(rounded / 60);
    const mins = rounded % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const handleTogglePause = async () => {
    if (isTogglingPause) return;
    setPauseError(null);
    setIsTogglingPause(true);
    try {
      const ok = ticket.isPaused
        ? await resumeTicketWorkApi(ticket.id)
        : await pauseTicketWorkApi(ticket.id);
      if (!ok) {
        setPauseError(
          ticket.isPaused
            ? 'Could not resume work. Saved server state remains paused.'
            : 'Could not pause work. Saved server state remains active.'
        );
      }
    } finally {
      setIsTogglingPause(false);
    }
  };

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
              <span>1. Location &amp; Requestor Info</span>
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

          {/* F-G2: Subcategory & Server-Resolved Risk */}
          <div className="px-3.5 py-2 flex items-center justify-between gap-4 text-xs">
            <span className="text-ink-subtle font-medium shrink-0">Subcategory &amp; Risk</span>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {ticket.subcategoryName || ticket.subcategoryCode ? (
                <span className="font-semibold text-ink">
                  {ticket.subcategoryName ?? ticket.subcategoryCode}
                </span>
              ) : (
                <span className="text-zinc-400">Parent category only</span>
              )}
              {renderRiskBadge(ticket.riskLevel)}
            </div>
          </div>

          {/* F-F1: Authorized Saved Asset Identity */}
          <div className="px-3.5 py-2.5 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-4">
              <span className="text-ink-subtle font-medium shrink-0 inline-flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-zinc-400" />
                <span>Affected Asset</span>
              </span>
              {attachedAssetSummary.tag || attachedAssetSummary.model ? (
                <span className="font-semibold text-ink text-right" data-testid="attached-asset-summary">
                  {attachedAssetSummary.tag ?? 'Tag Unknown'} · {attachedAssetSummary.model ?? 'Model Unknown'} · S/N:{' '}
                  {attachedAssetSummary.serial ?? 'Unknown'}
                </span>
              ) : (
                <span className="text-zinc-400">Not linked</span>
              )}
            </div>

            {canEditAsset && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                <select
                  aria-label="Select saved asset"
                  value={selectedAssetId}
                  onChange={(e) => {
                    setSelectedAssetId(e.target.value);
                    setAssetError(null);
                  }}
                  disabled={isLoadingAssets || isSavingAsset}
                  className="flex-1 px-2.5 py-1.5 bg-surface border border-line rounded-lg text-xs text-ink focus:border-orange-500 focus:outline-none"
                >
                  <option value="">
                    {isLoadingAssets ? 'Loading saved assets...' : 'Select saved asset identity...'}
                  </option>
                  {assetOptions.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.asset_tag} — {asset.model_name} (S/N: {asset.serial_number ?? 'Unknown'} ·{' '}
                      {asset.location_name ?? 'Location Unknown'})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedAssetId || isSavingAsset}
                  onClick={handleSaveAsset}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-[11px] font-bold disabled:opacity-50 press-fx"
                >
                  {isSavingAsset ? 'Saving...' : 'Save Asset'}
                </button>
              </div>
            )}
            {assetError && (
              <div role="alert" className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
                {assetError}
              </div>
            )}
          </div>
        </div>
        {/* Group 3: Timestamps & Duration */}
        <div className="bg-canvas border border-line rounded-2xl divide-y divide-line overflow-hidden">
          <div className="px-3.5 py-2 bg-zinc-100/70 text-[11px] font-bold text-ink-subtle uppercase tracking-wider flex items-center justify-between gap-2">
            <span>3. Timestamps &amp; Active Labor Duration</span>
            {ticket.status === 'PROG' && (
              <div className="flex items-center gap-2">
                <span
                  data-testid="labor-state-badge"
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    ticket.isPaused
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>{ticket.isPaused ? 'Paused' : 'Active'}</span>
                </span>
                {isOwner && (
                  <button
                    type="button"
                    disabled={isTogglingPause}
                    onClick={handleTogglePause}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold normal-case tracking-normal transition-colors press-fx disabled:opacity-50 ${
                      ticket.isPaused
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-amber-600 hover:bg-amber-700 text-white'
                    }`}
                  >
                    {ticket.isPaused ? (
                      <>
                        <Play className="w-3 h-3" />
                        <span>{isTogglingPause ? 'Resuming...' : 'Resume Work'}</span>
                      </>
                    ) : (
                      <>
                        <Pause className="w-3 h-3" />
                        <span>{isTogglingPause ? 'Pausing...' : 'Pause Work'}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
          {pauseError && (
            <div role="alert" className="px-3.5 py-2 bg-rose-50 text-rose-700 text-[11px] font-semibold">
              {pauseError}
            </div>
          )}
          {ticket.isPaused && ticket.pausedAt && (
            <div className="px-3.5 py-2 bg-amber-50/70 flex items-center justify-between gap-4 text-xs">
              <span className="text-amber-800 font-semibold">Paused Since</span>
              <span className="font-mono font-semibold text-amber-900 text-right">
                {new Date(ticket.pausedAt).toLocaleString()}
              </span>
            </div>
          )}
          <div className="px-3.5 py-2 flex items-center justify-between gap-4 text-xs">
            <span className="text-ink-subtle font-medium">Active Labor Time</span>
            <span data-testid="active-labor-time" className="font-mono font-semibold text-ink text-right">
              {formatMinutes(ticket.activeMinutes)}
            </span>
          </div>
          <div className="px-3.5 py-2 flex items-center justify-between gap-4 text-xs">
            <span className="text-ink-subtle font-medium">Total Elapsed Time</span>
            <span data-testid="elapsed-labor-time" className="font-mono font-semibold text-ink text-right">
              {formatMinutes(ticket.elapsedMinutes)}
            </span>
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
