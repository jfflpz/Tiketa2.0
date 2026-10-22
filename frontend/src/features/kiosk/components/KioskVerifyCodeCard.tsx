import React, { useState } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import type { Ticket } from '../../../types/ticket';
import { useAppStore } from '../../../store/useAppStore';

export interface KioskVerifyCodeCardProps {
  ticket: Ticket;
  onUnlocked: () => void;
}

export const KioskVerifyCodeCard: React.FC<KioskVerifyCodeCardProps> = ({ ticket, onUnlocked }) => {
  const unlockTicketVerification = useAppStore((state) => state.unlockTicketVerification);
  const [empInput, setEmpInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const upper = empInput.trim().toUpperCase();
    if (!upper) return;

    const isMatch =
      !ticket.employeeId ||
      ticket.employeeId.toUpperCase() === upper ||
      upper === ticket.requestor.toUpperCase();

    if (isMatch) {
      unlockTicketVerification(ticket.ticketCode);
      onUnlocked();
    } else {
      setError(`Employee ID "${upper}" does not match the requestor on this ticket (${ticket.requestor}).`);
    }
  };

  return (
    <div className="bg-surface border border-line rounded-3xl p-6 shadow-card space-y-4 max-w-md mx-auto text-center">
      <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center mx-auto shadow-sm">
        <Lock className="w-6 h-6 text-emerald-400" />
      </div>

      <div className="space-y-1">
        <h3 className="font-bold text-sm text-ink">Verify Identity to Access Ticket</h3>
        <p className="text-xs text-ink-subtle">
          Please confirm your Employee ID No. to view ticket <strong>{ticket.ticketCode}</strong>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 text-left">
        <input
          type="text"
          value={empInput}
          onChange={(e) => setEmpInput(e.target.value.toUpperCase())}
          placeholder="e.g. FS-1042"
          className="w-full px-4 py-3 bg-canvas border border-line rounded-2xl text-center font-bold text-xs uppercase tracking-wider focus:outline-none focus:border-zinc-500"
        />

        {error && <p className="text-xs text-rose-600 text-center">{error}</p>}

        <button
          type="submit"
          disabled={!empInput.trim()}
          className="w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-2 press-fx shadow-sm"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Unlock &amp; View Ticket</span>
        </button>
      </form>
    </div>
  );
};
