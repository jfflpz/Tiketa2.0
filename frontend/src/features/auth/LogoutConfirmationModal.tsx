// @spec FR-AUTH-03: Staff Logout Confirmation Modal
import React, { useState, useEffect } from 'react';
import { LogOut, X, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const LogoutConfirmationModal: React.FC = () => {
  const isLogoutModalOpen = useAppStore((state) => state.isLogoutModalOpen);
  const closeLogoutModal = useAppStore((state) => state.closeLogoutModal);
  const logoutToKiosk = useAppStore((state) => state.logoutToKiosk);
  const currentUser = useAppStore((state) => state.currentUser);

  const [retainSession, setRetainSession] = useState(false);

  useEffect(() => {
    if (isLogoutModalOpen) {
      setRetainSession(false);
    }
  }, [isLogoutModalOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isLogoutModalOpen) {
        closeLogoutModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isLogoutModalOpen, closeLogoutModal]);

  if (!isLogoutModalOpen) return null;

  const handleConfirmLogout = () => {
    closeLogoutModal();
    logoutToKiosk({ retainSession });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
    >
      <div
        className="fixed inset-0"
        onClick={closeLogoutModal}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-sm bg-surface border border-line rounded-3xl shadow-2xl overflow-hidden my-auto animate-scale-up">
        {/* Header */}
        <div className="px-6 py-4 bg-canvas border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <LogOut className="w-4 h-4" />
            </div>
            <div>
              <h3 id="logout-modal-title" className="text-sm font-bold text-ink">
                Confirm Sign Out
              </h3>
              <p className="text-[11px] text-ink-subtle">
                End current staff session
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeLogoutModal}
            className="p-1.5 rounded-xl bg-surface border border-line text-ink-subtle hover:text-ink transition-colors press-fx"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              Are you sure you want to sign out{currentUser?.name ? ` as ${currentUser.name}` : ''}? You will be returned to the public <strong>Employee Ticket Kiosk</strong>.
            </div>
          </div>

          {/* Session Retention Toggle Checkbox */}
          <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#F8F9FA] border border-[#ECEEF2] cursor-pointer select-none hover:bg-zinc-100/60 transition-colors">
            <input
              type="checkbox"
              checked={retainSession}
              onChange={(e) => setRetainSession(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-[#ECEEF2] text-orange-600 focus:ring-0 cursor-pointer accent-orange-600"
            />
            <div className="text-xs">
              <span className="font-semibold text-ink block">Keep my staff session on this device</span>
              <span className="text-[11px] text-zinc-500">
                Preserves authentication tokens for quick 1-click return to workspace from the employee kiosk.
              </span>
            </div>
          </label>

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={closeLogoutModal}
              className="flex-1 py-2.5 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold transition-colors press-fx"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmLogout}
              className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-sm transition-colors press-fx"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Yes, Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
