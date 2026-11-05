import React, { useState } from 'react';
import { Lock, ShieldCheck, Loader2, Mail, User } from 'lucide-react';
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
  const [emailInput, setEmailInput] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = empInput.trim();
    const cleanEmail = emailInput.trim();
    if (!cleanId) return;

    setLocalError(null);
    const success = await verifyEmployeeIdentity(cleanId, cleanEmail || undefined);
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
          Please enter your Employee ID and registered email to access ticket <strong>{ticketCode}</strong>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 text-left">
        <div>
          <label className="block text-[11px] font-semibold text-ink-subtle mb-1">Employee ID Number</label>
          <div className="relative">
            <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={empInput}
              onChange={(e) => {
                setEmpInput(e.target.value.toUpperCase());
                setLocalError(null);
              }}
              disabled={isVerifyingIdentity}
              placeholder="e.g. 2015"
              className="w-full pl-10 pr-4 py-2.5 bg-canvas border border-line rounded-xl text-xs font-semibold focus:outline-none
              focus:border-zinc-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-ink-subtle mb-1">Registered Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                setLocalError(null);
              }}
              disabled={isVerifyingIdentity}
              placeholder="e.g. name@fivestarbus.com"
              className="w-full pl-10 pr-4 py-2.5 bg-canvas border border-line rounded-xl text-xs font-semibold focus:outline-none
              focus:border-zinc-500"
            />
          </div>
        </div>

        {error && <p className="text-xs text-rose-600 text-center font-medium">{error}</p>}

        <button
          type="submit"
          disabled={!empInput.trim() || isVerifyingIdentity}
          className="w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white font-bold text-xs flex items-center
          justify-center gap-2 press-fx shadow-sm mt-2"
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