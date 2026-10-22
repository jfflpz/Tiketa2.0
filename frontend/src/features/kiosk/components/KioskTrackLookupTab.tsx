import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';

export interface KioskTrackLookupTabProps {
  onTicketFound: (ticketId: string) => void;
}

export const KioskTrackLookupTab: React.FC<KioskTrackLookupTabProps> = ({ onTicketFound }) => {
  const trackTicketApi = useAppStore((state) => state.trackTicketApi);
  const [codeInput, setCodeInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = codeInput.trim().toUpperCase();
    if (!clean) return;

    setIsLoading(true);
    setError(null);
    try {
      const ticket = await trackTicketApi(clean);
      if (ticket) {
        onTicketFound(ticket.id);
      } else {
        setError(`Ticket "${clean}" was not found on the server. Please check the code.`);
      }
    } catch {
      setError('Unable to reach server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-surface border border-line rounded-3xl p-6 shadow-card space-y-4 max-w-lg mx-auto">
      <div className="text-center space-y-1">
        <h3 className="font-bold text-sm text-ink">Track Ticket by Code</h3>
        <p className="text-xs text-ink-subtle">
          Enter your 9-character ticket tracking code (e.g. T-2610-0101)
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <input
            type="text"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            placeholder="T-2610-0101"
            className="w-full px-4 py-3 bg-canvas border border-line rounded-2xl text-center font-mono font-bold text-sm uppercase tracking-wider focus:outline-none focus:border-zinc-500"
          />
        </div>

        {error && <p className="text-xs text-rose-600 text-center">{error}</p>}

        <button
          type="submit"
          disabled={isLoading || !codeInput.trim()}
          className="w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-2 press-fx shadow-sm"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          <span>Lookup Ticket</span>
        </button>
      </form>
    </div>
  );
};
