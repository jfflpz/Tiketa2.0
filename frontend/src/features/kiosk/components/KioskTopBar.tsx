// @spec BF-02: Single Login Button for Staff Authentication
import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Lock } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';

export interface KioskTopBarProps {
  hubName: string;
}

export const KioskTopBar: React.FC<KioskTopBarProps> = ({ hubName }) => {
  const openLoginModal = useAppStore((state) => state.openLoginModal);
  const [clock, setClock] = useState('');

  useEffect(() => {
    const update = () =>
      setClock(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-line bg-surface/80 backdrop-blur-md px-6 py-3 flex items-center justify-between text-xs sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 font-bold tracking-tight text-ink text-sm">
          <div className="w-6 h-6 rounded-lg bg-brand flex items-center justify-center text-white font-black text-xs">
            T
          </div>
          <span>Tiketa</span>
        </div>
        <span className="hidden sm:inline-block text-ink-faint">•</span>
        <div className="hidden sm:flex items-center gap-1.5 text-ink-subtle">
          <MapPin className="w-3.5 h-3.5 text-brand" />
          <span className="font-medium">{hubName}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-canvas border border-line rounded-full text-ink-subtle font-mono text-[11px] mr-2">
          <Clock className="w-3 h-3 text-ink-faint" />
          <span>{clock}</span>
        </div>

        {/* BF-02: Replaced separate IT Support/Admin buttons with single Login button */}
        <button
          onClick={() => openLoginModal('it')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold press-fx shadow-xs transition-colors"
          title="Staff Workspace Login"
        >
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Login</span>
        </button>
      </div>
    </header>
  );
};
