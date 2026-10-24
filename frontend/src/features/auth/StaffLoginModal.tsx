// @spec FR-AUTH-02: Staff Authentication Modal for IT Support and Administrators
import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Wrench, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useAppStore, StaffRole } from '../../store/useAppStore';

export const StaffLoginModal: React.FC = () => {
  const loginModalRole = useAppStore((state) => state.loginModalRole);
  const closeLoginModal = useAppStore((state) => state.closeLoginModal);
  const loginWithApi = useAppStore((state) => state.loginWithApi);
  const isAuthenticating = useAppStore((state) => state.isAuthenticating);
  const authError = useAppStore((state) => state.authError);
  const [role, setRole] = useState<StaffRole>('admin');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (loginModalRole) {
      setRole(loginModalRole);
      setUsername(loginModalRole === 'admin' ? 'admin' : 'technician');
    }
  }, [loginModalRole]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && loginModalRole && !isAuthenticating) {
        closeLoginModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [loginModalRole, closeLoginModal, isAuthenticating]);

  if (!loginModalRole) return null;

  const handleRoleSwitch = (newRole: StaffRole) => {
    setRole(newRole);
    setUsername(newRole === 'admin' ? 'admin' : 'technician');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await loginWithApi({ username, password });
    if (success) {
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div
        className="fixed inset-0"
        onClick={() => !isAuthenticating && closeLoginModal()}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-md bg-surface border border-line rounded-3xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-5 bg-canvas border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center">
              <Lock className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink">
                Staff Workspace Sign In
              </h3>
              <p className="text-[11px] text-ink-subtle">
                2-Tier Authenticated Access (Argon2id + Dual-Token JWT)
              </p>
            </div>
          </div>
          <button
            onClick={closeLoginModal}
            disabled={isAuthenticating}
            className="p-1.5 rounded-xl bg-surface border border-line text-ink-subtle hover:text-ink press-fx disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Banner */}
          {authError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* Role Switcher Pill */}
          <div className="grid grid-cols-2 gap-1.5 bg-canvas p-1 rounded-2xl border border-line">
            <button
              type="button"
              onClick={() => handleRoleSwitch('it')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all press-fx ${
                role === 'it'
                  ? 'bg-surface text-ink shadow-card border border-line'
                  : 'text-ink-subtle hover:text-ink'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>IT Support</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleSwitch('admin')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all press-fx ${
                role === 'admin'
                  ? 'bg-surface text-ink shadow-card border border-line'
                  : 'text-ink-subtle hover:text-ink'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-brand" />
              <span>Administrator</span>
            </button>
          </div>

          {/* Credentials Input */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Staff Email or Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isAuthenticating}
                className="w-full px-3.5 py-2.5 bg-canvas border border-line rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-
zinc-500 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password (min 12 characters)"
                required
                disabled={isAuthenticating}
                className="w-full px-3.5 py-2.5 bg-canvas border border-line rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-
zinc-500 disabled:opacity-60"
              />
            </div>
          </div>

          {/* Destination Preview Note */}
          <div className="p-3 rounded-2xl bg-canvas border border-line text-[11px] text-ink-subtle">
            {role === 'admin' ? (
              <span>
                Opens the <strong>Admin &amp; Team Workbench Dashboard</strong>, IT Queue,
                and 8 Executive Reports.
              </span>
            ) : (
              <span>
                Opens the <strong>IT Support Workbench</strong> for single-click ticket
                claiming, active repairs, and 15-column job logging.
              </span>
            )}
          </div>

          {/* Quick Demo Helper */}
          <div className="flex items-center justify-between text-[11px] text-ink-subtle px-1">
            <span>Demo: <code className="bg-canvas px-1 py-0.5 rounded border border-line text-ink font-mono">{role === 'admin' ? 'admin' : 'technician'}</code> / <code className="bg-canvas px-1 py-0.5 rounded border border-line text-ink font-mono">Tiketa2026!Pass</code></span>
            <button
              type="button"
              onClick={() => {
                setUsername(role === 'admin' ? 'admin' : 'technician');
                setPassword('Tiketa2026!Pass');
              }}
              className="text-brand hover:underline font-medium text-[11px]"
            >
              Fill Credentials
            </button>
          </div>

          <button
            type="submit"
            disabled={isAuthenticating}
            className="w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold flex items-center justify-center
gap-2 shadow-sm transition-colors press-fx disabled:opacity-50"
          >
            {isAuthenticating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating with Argon2id...</span>
              </>
            ) : (
              <>
                <span>
                  {role === 'admin'
                    ? 'Launch Admin Dashboard'
                    : 'Launch IT Support Workbench'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};