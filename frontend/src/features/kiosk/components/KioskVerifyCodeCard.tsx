import React, { useState } from 'react';
import { Lock, ShieldCheck, Loader2 } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';

export interface KioskVerifyCodeCardProps {
  ticketCode: string;
  onUnlocked: () => void;
}

export const KioskVerifyCodeCard: React.FC<KioskVerifyCodeCardProps> = ({ ticketCode, onUnlocked }) => {
  const verifyEmployeeIdentity = useAppStore((state) => state.verifyEmployeeIdentity);
  const isVerifyingIdentity = useAppStore((state) => state.isVerifyingIdentity);
  const verificationErrorMessage = useAppStore((state) => state.verificationErrorMessage);
  const [empInput, setEmpInput] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = empInput.trim();
    if (!cleanId) return;

    setLocalError(null);
    const success = await verifyEmployeeIdentity(cleanId);
    if (success) {
      onUnlocked();
    }
  };

  const error = localError || verificationErrorMessage;

  return (
    <div className="bg-surface border border-line rounded-3xl p-6 shadow-card space-y-4 max-w-md mx-auto text-center animate-fade-in">
      <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center mx-auto shadow-sm">
        <Lock className="w-6 h-6 text-emerald-400" />
      </div>

      <div className="space-y-1">
        <h3 className="font-bold text-sm text-ink">Verify Identity to Access Ticket</h3>
        <p className="text-xs text-ink-subtle">
          Please enter your Employee ID No. to verify access for ticket <strong>{ticketCode}</strong>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 text-left">
        <input
          type="text"
          value={empInput}
          onChange={(e) => {
            setEmpInput(e.target.value.toUpperCase());
            setLocalError(null);
          }}
          disabled={isVerifyingIdentity}
          placeholder="e.g. 2015"
          className="w-full px-4 py-3 bg-canvas border border-line rounded-2xl text-center font-bold text-xs uppercase tracking-wider focus:outline-none focus:border-zinc-500"
        />

        {error && <p className="text-xs text-rose-600 text-center font-medium">{error}</p>}

        <button
          type="submit"
          disabled={!empInput.trim() || isVerifyingIdentity}
          className="w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-2 press-fx shadow-sm"
        >
          {isVerifyingIdentity ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying Identity...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Unlock &amp; View Ticket</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
