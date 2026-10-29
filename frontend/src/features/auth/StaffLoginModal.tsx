// @spec FR-AUTH-02: Staff Authentication Modal for 4-Tier Access
import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Shield, Wrench, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
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

  const getPresetUsername = (r: StaffRole): string => {
    switch (r) {
      case 'admin':
        return 'admin';
      case 'supervisor':
        return 'supervisor';
      case 'intern':
        return 'intern';
      case 'it':
      default:
        return 'technician';
    }
  };

  useEffect(() => {
    if (loginModalRole) {
      setRole(loginModalRole);
      setUsername(getPresetUsername(loginModalRole));
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
    setUsername(getPresetUsername(newRole));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await loginWithApi({ username, password });
    if (success) {
      setPassword('');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-login-modal-title"
    >
      <div
        className="fixed inset-0"
        onClick={() => !isAuthenticating && closeLoginModal()}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-lg bg-surface border border-line rounded-3xl shadow-2xl overflow-hidden my-auto animate-scale-up">
        {/* Header */}
        <div className="px-6 py-5 bg-canvas border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center">
              <Lock className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 id="staff-login-modal-title" className="text-sm font-bold text-ink">
                Staff Workspace Sign In
              </h3>
              <p className="text-[11px] text-ink-subtle">
                4-Tier Authenticated Access (Argon2id + Dual-Token JWT)
              </p>
            </div>
          </div>
          <button
            onClick={closeLoginModal}
            disabled={isAuthenticating}
            className="p-1.5 rounded-xl bg-surface border border-line text-ink-subtle hover:text-ink press-fx disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Banner */}
          {authError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* 4-Tier Role Switcher Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-canvas p-1 rounded-2xl border border-line">
            <button
              type="button"
              onClick={() => handleRoleSwitch('it')}
              className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all press-fx ${
                role === 'it'
                  ? 'bg-surface text-ink shadow-card border border-line'
                  : 'text-ink-subtle hover:text-ink'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-orange-500" />
              <span>IT Support</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleSwitch('intern')}
              className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all press-fx ${
                role === 'intern'
                  ? 'bg-surface text-ink shadow-card border border-line'
                  : 'text-ink-subtle hover:text-ink'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-blue-500" />
              <span>IT Intern</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleSwitch('supervisor')}
              className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all press-fx ${
                role === 'supervisor'
                  ? 'bg-surface text-ink shadow-card border border-line'
                  : 'text-ink-subtle hover:text-ink'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-amber-500" />
              <span>Supervisor</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleSwitch('admin')}
              className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all press-fx ${
                role === 'admin'
                  ? 'bg-surface text-ink shadow-card border border-line'
                  : 'text-ink-subtle hover:text-ink'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Admin</span>
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
                className="w-full px-3.5 py-2.5 bg-canvas border border-line rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-orange-500 disabled:opacity-60"
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
                className="w-full px-3.5 py-2.5 bg-canvas border border-line rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-orange-500 disabled:opacity-60"
              />
            </div>
          </div>

          {/* Destination Preview Note */}
          <div className="p-3 rounded-2xl bg-canvas border border-line text-[11px] text-ink-subtle">
            {role === 'admin' && (
              <span>
                Opens the <strong>Admin &amp; Team Workbench Dashboard</strong>, IT Queue, and 8 Executive Reports.
              </span>
            )}
            {role === 'supervisor' && (
              <span>
                Opens the <strong>Supervisor Operations Dashboard</strong> with real-time queue SLA management and full team reporting.
              </span>
            )}
            {role === 'intern' && (
              <span>
                Opens the <strong>IT Intern Workbench</strong> for repair guidance, knowledge base notes, and assisted job logging.
              </span>
            )}
            {role === 'it' && (
              <span>
                Opens the <strong>IT Support Workbench</strong> for single-click ticket claiming, active repairs, and 15-column job logging.
              </span>
            )}
          </div>

          {/* Quick Demo Helper */}
          <div className="flex items-center justify-between text-[11px] text-ink-subtle px-1">
            <span>Demo: <code className="bg-canvas px-1 py-0.5 rounded border border-line text-ink font-mono">{getPresetUsername(role)}</code> / <code className="bg-canvas px-1 py-0.5 rounded border border-line text-ink font-mono">Tiketa2026!Pass</code></span>
            <button
              type="button"
              onClick={() => {
                setUsername(getPresetUsername(role));
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
            className="w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors press-fx disabled:opacity-50"
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
                    : role === 'supervisor'
                    ? 'Launch Supervisor Dashboard'
                    : role === 'intern'
                    ? 'Launch Intern Workbench'
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
