import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, LogOut } from 'lucide-react';
import type { AuthenticatedUser } from '../../../store/useAppStore';

export interface HeaderProfilePopoverProps {
  currentUser: AuthenticatedUser | null;
  onSignOut: () => void;
}

export const HeaderProfilePopover: React.FC<HeaderProfilePopoverProps> = ({
  currentUser,
  onSignOut,
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProfileOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="relative" ref={profileRef}>
      <button
        type="button"
        onClick={() => setProfileOpen(!profileOpen)}
        className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-zinc-100 active:scale-95 transition-all text-left"
        title="User Profile & Sign Out"
        aria-label="User Profile"
      >
        <img
          src={
            currentUser?.avatar ??
            'https://api.dicebear.com/7.x/avataaars/svg?seed=Edward&backgroundColor=fed7aa'
          }
          alt={currentUser?.name ?? 'Staff'}
          className="w-8 h-8 rounded-full border border-orange-200 bg-orange-50 shrink-0"
        />
        <div className="hidden sm:block leading-tight">
          <p className="text-xs font-bold text-ink">
            {currentUser?.name ?? 'Nathaniel Esguerra'}
          </p>
          <p className="text-[11px] text-zinc-500">
            {currentUser?.title ?? 'IT Support Specialist'}
          </p>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-zinc-400 hidden sm:block" />
      </button>

      {profileOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-zinc-200/90 p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center gap-3 pb-3 border-b border-zinc-100">
            <img
              src={
                currentUser?.avatar ??
                'https://api.dicebear.com/7.x/avataaars/svg?seed=Edward&backgroundColor=fed7aa'
              }
              alt={currentUser?.name ?? 'Staff'}
              className="w-10 h-10 rounded-full border border-orange-200 bg-orange-50 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink truncate">
                {currentUser?.name ?? 'Nathaniel Esguerra'}
              </p>
              <p className="text-[11px] text-zinc-500 truncate">
                {currentUser?.email ?? 'nathaniel.esguerra@fivestarbus.com'}
              </p>
              <span className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.2 rounded bg-orange-100 text-orange-700">
                {currentUser?.role === 'admin' ? 'Administrator' : 'IT Support Specialist'}
              </span>
            </div>
          </div>

          <div className="py-2 space-y-1">
            <div className="px-2 py-1.5 text-xs text-zinc-600 flex items-center justify-between">
              <span>Terminal Hub:</span>
              <span className="font-semibold text-ink">Pasay Central Hub</span>
            </div>
            <div className="px-2 py-1.5 text-xs text-zinc-600 flex items-center justify-between">
              <span>Active Role:</span>
              <span className="font-semibold text-emerald-600">On Duty</span>
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => {
                setProfileOpen(false);
                onSignOut();
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out to Employee Kiosk</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
