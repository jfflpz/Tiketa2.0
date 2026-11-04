import React, { useState } from 'react';
import { CheckCircle2, X, Wrench, Radio, ShieldCheck, Loader2 } from 'lucide-react';
import type { Ticket, SupportMode } from '../../../types/ticket';
import { useAppStore } from '../../../store/useAppStore';
import { ticketsApi } from '../../../api/client';

export interface TicketResolveModalProps {
  ticket: Ticket | null;
  onClose: () => void;
}

export const TicketResolveModal: React.FC<TicketResolveModalProps> = ({
  ticket,
  onClose,
}) => {
  const updateTicketStatusApi = useAppStore((state) => state.updateTicketStatusApi);
  const fetchQueueApi = useAppStore((state) => state.fetchQueueApi);
  const addToast = useAppStore((state) => state.addToast);

  const [mode, setMode] = useState<SupportMode>(ticket?.mode || 'SITE');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!ticket) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // If resolution notes were entered, save them to the service record first
      if (resolutionNotes.trim() && !ticket.id.startsWith('t-') && !ticket.id.startsWith('tracked-')) {
        try {
          await ticketsApi.updateServiceRecord(ticket.id, {
            resolution_notes: resolutionNotes.trim(),
          });
        } catch {
          // Continue to resolve status even if service record optional update fails
        }
      }

      const success = await updateTicketStatusApi(ticket.id, 'RESL', mode);
      if (success) {
        await fetchQueueApi();
        onClose();
      }
    } catch (err: unknown) {
      addToast('Resolution Error', 'Failed to mark ticket as resolved', 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#ECEEF2] overflow-hidden z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ECEEF2] bg-[#F8F9FA]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink">
                Mark Ticket Resolved
              </h2>
              <p className="text-[11px] text-zinc-500 font-mono">
                {ticket.ticketCode} • {ticket.task}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-zinc-400 hover:text-ink hover:bg-zinc-200/50 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Ticket Context Pill */}
          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/70 text-xs space-y-1">
            <div className="flex justify-between text-zinc-600">
              <span>Requestor:</span>
              <strong className="text-ink">{ticket.requestor} ({ticket.department})</strong>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>Terminal Hub:</span>
              <strong className="text-ink">{ticket.location}</strong>
            </div>
            {ticket.workedBy && (
              <div className="flex justify-between text-zinc-600">
                <span>Assigned Tech:</span>
                <strong className="text-orange-600">{ticket.workedBy}</strong>
              </div>
            )}
          </div>

          {/* Mode Selection */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">
              Service Delivery Mode <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('SITE')}
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all ${
                  mode === 'SITE'
                    ? 'border-orange-500 bg-orange-50/40 text-orange-900 shadow-xs'
                    : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                <Wrench className={`w-4 h-4 ${mode === 'SITE' ? 'text-orange-600' : 'text-zinc-400'}`} />
                <div className="text-left">
                  <p className="font-bold">On-Site Service</p>
                  <p className="text-[10px] text-zinc-400">At terminal bench/desk</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('REM')}
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all ${
                  mode === 'REM'
                    ? 'border-orange-500 bg-orange-50/40 text-orange-900 shadow-xs'
                    : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                <Radio className={`w-4 h-4 ${mode === 'REM' ? 'text-orange-600' : 'text-zinc-400'}`} />
                <div className="text-left">
                  <p className="font-bold">Remote Support</p>
                  <p className="text-[10px] text-zinc-400">AnyDesk / Phone / Viber</p>
                </div>
              </button>
            </div>
          </div>

          {/* Optional Resolution Notes */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1">
              Resolution Summary &amp; Actions Taken <span className="text-zinc-400 text-[11px] font-normal">(Optional)</span>
            </label>
            <textarea
              rows={3}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="e.g., Replaced thermal paste, ran PMS diagnostics, verified POS printer communication..."
              className="w-full p-2.5 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink placeholder:text-zinc-400 focus:outline-none focus:border-orange-500 resize-none"
            />
          </div>

          {/* Verification Warning Note */}
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              Transitioning to <strong>Resolved (RESL)</strong> locks active bench timer and issues a closure verification token for the employee to sign off.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#ECEEF2]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:text-ink hover:bg-zinc-100 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Resolution...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm Resolution</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
