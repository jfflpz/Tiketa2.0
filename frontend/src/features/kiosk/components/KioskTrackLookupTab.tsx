import React, { useState } from 'react';
import {
  Search,
  Loader2,
  ArrowLeft,
  Copy,
  Check,
  Clock,
  MapPin,
  Tag,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { nonemployeeApi, extractApiErrorMessage } from '../../../api/client';
import { mapStaffTicket } from '../../../utils/mapStaffTicket';
import { StatusBadge } from '../../../components/common/StatusBadge';
import type { Ticket, TicketStatus } from '../../../types/ticket';

export interface KioskTrackLookupTabProps {
  onTicketFound?: (ticketId: string) => void;
  initialCode?: string;
}

const STEPPER_STAGES: {
  status: TicketStatus;
  step: number;
  label: string;
  sublabel: string;
}[] = [
  { status: 'OPEN', step: 1, label: '1. Registered', sublabel: 'Queued in IT triage' },
  { status: 'PROG', step: 2, label: '2. In Progress', sublabel: 'Technician assigned' },
  { status: 'RESL', step: 3, label: '3. Resolved', sublabel: 'Pending verification' },
  { status: 'CLSD', step: 4, label: '4. Closed', sublabel: 'Verified & archived' },
];

function getStageLevel(status: TicketStatus): number {
  switch (status) {
    case 'OPEN':
      return 1;
    case 'PROG':
      return 2;
    case 'RESL':
      return 3;
    case 'CLSD':
      return 4;
    default:
      return 1;
  }
}

export const KioskTrackLookupTab: React.FC<KioskTrackLookupTabProps> = ({ initialCode }) => {
  const trackTicketApi = useAppStore((state) => state.trackTicketApi);
  const copyTicketShareLink = useAppStore((state) => state.copyTicketShareLink);

  const [codeInput, setCodeInput] = useState(initialCode || '');
  const [delegationToken, setDelegationToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmingDelegation, setIsConfirmingDelegation] = useState(false);
  const [delegationSuccessMsg, setDelegationSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (initialCode && !activeTicket) {
      const clean = initialCode.trim().toUpperCase();
      if (!clean) return;
      setIsLoading(true);
      trackTicketApi(clean)
        .then((ticket) => {
          if (ticket) setActiveTicket(ticket);
          else setError(`Ticket "${clean}" was not found on the server.`);
        })
        .catch(() => setError('Unable to reach central IT server.'))
        .finally(() => setIsLoading(false));
    }
  }, [initialCode, trackTicketApi, activeTicket]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = codeInput.trim().toUpperCase();
    if (!clean) return;

    setIsLoading(true);
    setError(null);
    setDelegationSuccessMsg(null);
    try {
      if (delegationToken.trim()) {
        const res = await nonemployeeApi.trackDelegated(clean, {
          delegation_token: delegationToken.trim(),
        });
        const mapped: Ticket = {
          ...mapStaffTicket(res, null),
          delegatedForName: res.represented_person ?? res.requester_name,
          delegationStatus: res.delegation_status ?? 'active',
        };
        setActiveTicket(mapped);
        setError(null);
      } else {
        const ticket = await trackTicketApi(clean);
        if (ticket) {
          setActiveTicket(ticket);
          setError(null);
        } else {
          setError(`Ticket "${clean}" was not found on the server. Please check the code.`);
          setActiveTicket(null);
        }
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403) {
        setError(extractApiErrorMessage(err, 'Delegation access expired, revoked, or unauthorized for this ticket.'));
      } else {
        setError(extractApiErrorMessage(err, 'Unable to reach central IT server. Please check network and try again.'));
      }
      setActiveTicket(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelegatedClosure = async () => {
    if (!activeTicket || isConfirmingDelegation) return;
    setIsConfirmingDelegation(true);
    setError(null);
    try {
      const updated = await nonemployeeApi.confirmDelegatedClosure(activeTicket.id, {
        delegation_token: delegationToken.trim() || undefined,
        represented_person: activeTicket.delegatedForName,
      });
      setActiveTicket({
        ...mapStaffTicket(updated, null),
        delegatedForName: activeTicket.delegatedForName,
        delegationStatus: activeTicket.delegationStatus,
      });
      setDelegationSuccessMsg(`Confirmed closure on behalf of ${activeTicket.delegatedForName || activeTicket.requestor}.`);
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Delegated closure failed or delegation was revoked/expired.'));
    } finally {
      setIsConfirmingDelegation(false);
    }
  };

  const handleCopyLink = async () => {
    if (!activeTicket) return;
    const res = await copyTicketShareLink(activeTicket.ticketCode, activeTicket.id);
    if (res.success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleResetSearch = () => {
    setActiveTicket(null);
    setCodeInput('');
    setError(null);
  };

  // 1. RENDER INLINE TRACKING RECEIPT WHEN TICKET IS FOUND
  if (activeTicket) {
    const currentStep = getStageLevel(activeTicket.status);

    return (
      <div className="bg-surface border border-line rounded-3xl p-6 sm:p-8 shadow-card space-y-6 max-w-2xl mx-auto animate-fade-in">
        {/* Top bar with back to search and status badge */}
        <div className="flex items-center justify-between border-b border-line/60 pb-4">
          <button
            type="button"
            onClick={handleResetSearch}
            className="flex items-center gap-1.5 text-xs font-semibold text-ink-subtle hover:text-ink transition-colors press-fx"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Track Another Ticket</span>
          </button>
          <div className="flex items-center gap-2">
            <StatusBadge status={activeTicket.status} />
          </div>
        </div>

        {/* Ticket Header & Code */}
        <div className="text-center space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-subtle bg-canvas border border-line px-2.5 py-1 rounded-full">
            Live Ticket Status
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-ink tracking-tight font-mono">
            {activeTicket.ticketCode}
          </h2>
          <p className="text-xs text-ink-subtle">
            Created on {activeTicket.dateStarted} {activeTicket.timeStarted ? `at ${activeTicket.timeStarted}` : ''}
          </p>
        </div>

        {/* 4-Step Stepper (OPEN -> PROG -> RESL -> CLSD) */}
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            {STEPPER_STAGES.map((s) => {
              const isPast = currentStep > s.step;
              const isCurrent = currentStep === s.step;
              return (
                <div
                  key={s.status}
                  className={`p-3 rounded-2xl border transition-all ${
                    isCurrent
                      ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                      : isPast
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                      : 'bg-canvas text-ink-faint border-line'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    {isPast && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                    <span className="text-xs font-bold">{s.label}</span>
                  </div>
                  <p
                    className={`text-[10px] leading-tight ${
                      isCurrent
                        ? 'text-zinc-300'
                        : isPast
                        ? 'text-emerald-700 font-medium'
                        : 'text-ink-faint'
                    }`}
                  >
                    {s.sublabel}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ticket Details Summary Card */}
        <div className="bg-canvas/70 border border-line rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <Tag className="w-4 h-4 text-brand shrink-0 mt-0.5" />
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-subtle">
                  Issue Category
                </span>
                <strong className="text-ink text-sm font-semibold">{activeTicket.task}</strong>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-brand shrink-0 mt-0.5" />
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-subtle">
                  Location &amp; Department
                </span>
                <strong className="text-ink text-sm font-semibold">
                  {activeTicket.location} • {activeTicket.department}
                </strong>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-brand shrink-0 mt-0.5" />
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-subtle">
                  Logged Date
                </span>
                <span className="text-ink font-medium">
                  {activeTicket.dateStarted} {activeTicket.timeStarted || ''}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <RefreshCw className="w-4 h-4 text-brand shrink-0 mt-0.5" />
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-subtle">
                  Assigned Technician
                </span>
                <span className="text-ink font-medium">
                  {activeTicket.workedBy || 'Awaiting Triage Claim'}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          {activeTicket.description && (
            <div className="pt-2 border-t border-line/60">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-subtle mb-1">
                Reported Description
              </span>
              <p className="text-xs text-ink leading-relaxed bg-surface p-3 rounded-xl border border-line">
                {activeTicket.description}
              </p>
            </div>
          )}
        </div>

        {/* Delegated Representation & Scoped Confirmation Banner (F-E2) */}
        {activeTicket.delegatedForName && (
          <div
            data-testid="delegation-banner"
            className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
              activeTicket.delegationStatus === 'expired' || activeTicket.delegationStatus === 'revoked'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-sky-50 border-sky-200 text-sky-900'
            }`}
          >
            <div className="font-bold">
              Representing: {activeTicket.delegatedForName}
            </div>
            {activeTicket.delegationStatus === 'expired' && (
              <p>This delegation has expired. Please request a new delegation link.</p>
            )}
            {activeTicket.delegationStatus === 'revoked' && (
              <p>This delegation was revoked and can no longer confirm closure.</p>
            )}
            {activeTicket.status === 'RESL' &&
              (!activeTicket.delegationStatus || activeTicket.delegationStatus === 'active') && (
                <button
                  type="button"
                  disabled={isConfirmingDelegation}
                  onClick={() => void handleConfirmDelegatedClosure()}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold"
                >
                  {isConfirmingDelegation ? 'Confirming...' : `Confirm Closure for ${activeTicket.delegatedForName}`}
                </button>
              )}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2 animate-fade-in"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {delegationSuccessMsg && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            {delegationSuccessMsg}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-canvas hover:bg-surface border border-line text-xs font-semibold text-ink flex items-center justify-center gap-2 press-fx transition-colors"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4 text-ink-subtle" />
            )}
            <span>{copied ? 'Link Copied to Clipboard!' : 'Copy Tracking Link'}</span>
          </button>

          <button
            type="button"
            onClick={handleResetSearch}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold flex items-center justify-center gap-2 press-fx shadow-sm transition-colors"
          >
            <Search className="w-4 h-4" />
            <span>Track Another Ticket</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. RENDER LOOKUP INPUT FORM WHEN NO TICKET IS ACTIVELY DISPLAYED
  return (
    <div className="bg-surface border border-line rounded-3xl p-6 sm:p-8 shadow-card space-y-5 max-w-lg mx-auto animate-fade-in">
      <div className="text-center space-y-1.5">
        <div className="w-10 h-10 rounded-2xl bg-canvas border border-line flex items-center justify-center mx-auto text-ink-subtle">
          <Search className="w-5 h-5" />
        </div>
        <h3 className="font-bold text-base text-ink">Track Ticket by Code</h3>
        <p className="text-xs text-ink-subtle leading-relaxed max-w-sm mx-auto">
          Enter your 9-character ticket tracking code (e.g. <strong>T-2610-0101</strong>) to view live triage status, technician assignment, and repair progress.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-ink text-center">
            Ticket Tracking Code
          </label>
          <input
            type="text"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            placeholder="T-2610-0101"
            autoFocus
            disabled={isLoading}
            className="w-full px-4 py-3.5 bg-canvas border border-line rounded-2xl text-center font-mono font-black text-base uppercase tracking-widest text-ink placeholder:text-ink-faint focus:outline-none focus:border-zinc-500 transition-colors"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-semibold text-ink-subtle text-center">
            Delegation / Nonemployee Token (Optional)
          </label>
          <input
            type="text"
            value={delegationToken}
            onChange={(e) => setDelegationToken(e.target.value)}
            placeholder="Paste scoped delegation token if representing another requester"
            disabled={isLoading}
            className="w-full px-3.5 py-2 bg-canvas border border-line rounded-xl text-center font-mono text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:border-zinc-500"
          />
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !codeInput.trim()}
          className="w-full py-3.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-2 press-fx shadow-sm transition-all"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Checking Ticket Status...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>Lookup Ticket Status</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
