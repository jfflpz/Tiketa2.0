// @spec FR-VERIF-02: Interactive Closure Verification & Validation Modal
// @spec SR-07: Digital Closure Verification Sign-Off Loop
import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  Clock,
  Wrench,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const TicketVerificationModal: React.FC = () => {
  const verificationModalTicketId = useAppStore(
    (state) => state.verificationModalTicketId
  );
  const closeVerificationModal = useAppStore(
    (state) => state.closeVerificationModal
  );
  const tickets = useAppStore((state) => state.tickets);
  const currentUser = useAppStore((state) => state.currentUser);
  const confirmClosure = useAppStore((state) => state.confirmClosure);
  const reopenTicket = useAppStore((state) => state.reopenTicket);
  const sendTicketMessage = useAppStore((state) => state.sendTicketMessage);

  const ticket = tickets.find((t) => t.id === verificationModalTicketId) ?? null;

  // Local state for verification checks and feedback
  const [equipmentTested, setEquipmentTested] = useState(true);
  const [issueResolved, setIssueResolved] = useState(true);
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reopen prompt sub-state
  const [showReopenPrompt, setShowReopenPrompt] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset form whenever ticket changes
  useEffect(() => {
    if (verificationModalTicketId) {
      setEquipmentTested(true);
      setIssueResolved(true);
      setRemarks('');
      setShowReopenPrompt(false);
      setReopenReason('');
      setErrorMsg(null);
      setIsSubmitting(false);
    }
  }, [verificationModalTicketId]);

  // Keyboard accessibility: dismiss on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && verificationModalTicketId && !isSubmitting) {
        closeVerificationModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [verificationModalTicketId, isSubmitting, closeVerificationModal]);

  if (!verificationModalTicketId || !ticket) return null;

  const isStaff = Boolean(currentUser);
  const activeTechName = ticket.workedBy || 'Assigned Technician';
  const durationText = ticket.duration ? `${ticket.duration} hrs` : '0.65 hrs';
  const modeText =
    ticket.mode === 'SITE' ? 'On-Site Visit (SITE)' : 'Remote Support (REM)';

  const handleConfirmClosure = async () => {
    if (!equipmentTested || !issueResolved) {
      setErrorMsg(
        'Please confirm that the equipment has been tested and the issue is resolved before closing.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // If employee or staff left remarks, log to ticket conversation thread
      if (remarks.trim()) {
        const senderRole = isStaff ? 'it' : 'employee';
        const senderName = isStaff
          ? currentUser?.name ?? 'IT Support'
          : ticket.requestor;
        sendTicketMessage(
          ticket.id,
          senderRole,
          senderName,
          `✅ Closure Sign-Off Verified:\n📝 Remarks: "${remarks.trim()}"`,
          false
        );
      }

      await confirmClosure(ticket.id);
      closeVerificationModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReopenTicket = async () => {
    if (!reopenReason.trim()) {
      setErrorMsg('Please describe why the issue persists to help IT troubleshoot.');
      return;
    }

    setIsSubmitting(true);
    try {
      const senderRole = isStaff ? 'it' : 'employee';
      const senderName = isStaff
        ? currentUser?.name ?? 'IT Support'
        : ticket.requestor;
      sendTicketMessage(
        ticket.id,
        senderRole,
        senderName,
        `⚠️ TICKET REOPENED: Issue persists after resolution attempt.\nReason: "${reopenReason.trim()}"`,
        false
      );

      await reopenTicket(ticket.id);
      closeVerificationModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="verification-modal-title"
    >
      {/* Backdrop click dismiss */}
      <div
        className="fixed inset-0"
        onClick={() => !isSubmitting && closeVerificationModal()}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative z-10 w-full max-w-lg bg-surface border border-line rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-canvas border-b border-line flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h2
                id="verification-modal-title"
                className="text-sm font-bold text-ink flex items-center gap-2"
              >
                <span>Ticket Closure Verification</span>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {ticket.ticketCode}
                </span>
              </h2>
              <p className="text-[11px] text-ink-subtle">
                {isStaff
                  ? 'Administrative verification & 15-column job log sign-off'
                  : 'Employee terminal resolution confirmation'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeVerificationModal}
            disabled={isSubmitting}
            className="p-1.5 rounded-xl bg-surface border border-line text-ink-subtle hover:text-ink press-fx disabled:opacity-50"
            aria-label="Close verification modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Repair Summary Strip */}
          <div className="p-3.5 bg-canvas border border-line rounded-2xl space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="font-bold text-ink flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-zinc-500" />
                <span>Worked by: {activeTechName}</span>
              </span>
              <span className="font-semibold text-ink-subtle flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Duration: {durationText}</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-line/60 text-[11px]">
              <span className="text-ink-subtle">
                Task:{' '}
                <strong className="text-ink">
                  {ticket.task} ({ticket.taskCode})
                </strong>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-surface border border-line font-medium text-ink">
                {modeText}
              </span>
            </div>

            {ticket.description && (
              <p className="text-[11px] text-ink-subtle italic bg-surface p-2 rounded-xl border border-line/60">
                "{ticket.description}"
              </p>
            )}
          </div>

          {/* Validation Checklist */}
          {!showReopenPrompt && (
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-ink">
                Resolution Sign-Off Checklist
              </label>
              <div className="space-y-2">
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-line bg-canvas/60 hover:bg-canvas cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={equipmentTested}
                    onChange={(e) => {
                      setEquipmentTested(e.target.checked);
                      setErrorMsg(null);
                    }}
                    className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-line"
                  />
                  <div className="text-[11px]">
                    <span className="font-bold text-ink block">
                      Equipment &amp; Workstation Tested
                    </span>
                    <span className="text-ink-subtle">
                      Confirmed terminal booth PC, ticket printer, scanner, or network connection works normally.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-line bg-canvas/60 hover:bg-canvas cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={issueResolved}
                    onChange={(e) => {
                      setIssueResolved(e.target.checked);
                      setErrorMsg(null);
                    }}
                    className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-line"
                  />
                  <div className="text-[11px]">
                    <span className="font-bold text-ink block">
                      Reported Issue Completely Resolved
                    </span>
                    <span className="text-ink-subtle">
                      Fix verified with no recurring errors or secondary application crashes.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Optional Resolution Remarks */}
          {!showReopenPrompt && (
            <div className="space-y-1">
              <label className="block text-xs font-bold text-ink">
                Resolution Remarks <span className="text-ink-subtle font-normal">(Optional)</span>
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Tested POS ticket printer with 3 passenger receipts. Cutter operating smoothly."
                rows={2}
                className="w-full px-3 py-2 bg-canvas border border-line rounded-xl text-xs text-ink focus:outline-none focus:border-zinc-500 placeholder:text-ink-faint resize-none"
              />
            </div>
          )}

          {/* Reopen Ticket Sub-form */}
          {showReopenPrompt && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
              <div className="flex items-start gap-2.5 text-amber-900 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span>Reopen Ticket — Issue Still Unresolved</span>
                  <p className="text-[11px] font-normal text-amber-800 mt-0.5">
                    This will revert ticket status back to <strong>In Progress</strong> and alert technician{' '}
                    <strong>{activeTechName}</strong> to follow up.
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-amber-950 mb-1">
                  Reason / Symptoms Still Occurring <span className="text-rose-600">*</span>
                </label>
                <textarea
                  value={reopenReason}
                  onChange={(e) => {
                    setReopenReason(e.target.value);
                    setErrorMsg(null);
                  }}
                  rows={2}
                  placeholder="Describe what error is still happening or what hardware is still failing..."
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs text-ink focus:outline-none focus:border-amber-500 placeholder:text-zinc-400 resize-none"
                />
              </div>
            </div>
          )}

          {/* Error Message Alert */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-canvas border-t border-line flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          {!showReopenPrompt ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setShowReopenPrompt(true);
                  setErrorMsg(null);
                }}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-line bg-surface hover:bg-zinc-100 text-ink-subtle hover:text-ink text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors press-fx"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                <span>Still Broken? Reopen</span>
              </button>

              <div className="w-full sm:w-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeVerificationModal}
                  disabled={isSubmitting}
                  className="px-3.5 py-2.5 rounded-xl border border-line bg-surface hover:bg-zinc-100 text-ink-subtle hover:text-ink text-xs font-semibold press-fx disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClosure}
                  disabled={isSubmitting || !equipmentTested || !issueResolved}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center justify-center gap-2 shadow-sm transition-colors press-fx"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sealing Closure...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm Closure &amp; Sign-Off</span>
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setShowReopenPrompt(false);
                  setErrorMsg(null);
                }}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-line bg-surface hover:bg-zinc-100 text-ink-subtle hover:text-ink text-xs font-semibold press-fx"
              >
                Back to Verification
              </button>
              <button
                type="button"
                onClick={handleReopenTicket}
                disabled={isSubmitting || !reopenReason.trim()}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-sm transition-colors press-fx"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Reopening Ticket...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Confirm Ticket Reopening</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
