// @spec FR-AUTH-02: Staff Authentication Modal with Consented Remembered Profile Card
import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  ArrowRight,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  UserX,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { authApi } from '../../api/client';
import { normalizeApiError } from '../../utils/errorUtils';
import type { StaffRole } from '../../store/slices/uiSlice';

interface RememberedProfile {
  name: string;
  username: string;
  role: StaffRole;
}

export const StaffLoginModal: React.FC = () => {
  const loginModalRole = useAppStore((state) => state.loginModalRole);
  const closeLoginModal = useAppStore((state) => state.closeLoginModal);
  const loginWithApi = useAppStore((state) => state.loginWithApi);
  const isAuthenticating = useAppStore((state) => state.isAuthenticating);
  const authError = useAppStore((state) => state.authError);

  const [rememberedProfile, setRememberedProfile] = useState<RememberedProfile | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [recoveryStep, setRecoveryStep] = useState<'none' | 'request' | 'confirm'>('none');
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryConfirm, setRecoveryConfirm] = useState('');
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  useEffect(() => {
    setRecoveryStep('none');
    setRecoveryIdentifier('');
    setRecoveryToken('');
    setRecoveryPassword('');
    setRecoveryConfirm('');
    setRecoveryMessage(null);
    setRecoveryError(null);

    if (loginModalRole) {
      try {
        const stored = localStorage.getItem('tiketa_remembered_profile');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.username && parsed?.name && parsed?.role) {
            setRememberedProfile(parsed);
            setUsername(parsed.username);
            setPassword('');
            return;
          }
        }
      } catch {
        // Ignore localStorage read errors
      }
      setRememberedProfile(null);
      setUsername(loginModalRole === 'admin' ? 'admin' : '');
      setPassword('');
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

  const handleSwitchAccount = () => {
    try {
      localStorage.removeItem('tiketa_remembered_profile');
    } catch {
      // Ignore
    }
    setRememberedProfile(null);
    setUsername('');
    setPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetUsername = rememberedProfile?.username || username.trim();
    if (!targetUsername || !password) return;
    
    const success = await loginWithApi({ username: targetUsername, password });
    if (success) {
      setPassword('');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
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
      <div className="relative z-10 w-full max-w-md bg-surface border border-line rounded-3xl shadow-2xl overflow-hidden my-auto animate-scale-up">
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
                Authenticated Access (Dual-Token HttpOnly + RAM Bearer)
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

          {/* Remembered Profile Card Mode */}
          {rememberedProfile ? (
            <div className="space-y-4">
              <div className="p-4 bg-canvas rounded-2xl border border-line flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {getInitials(rememberedProfile.name)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-ink flex items-center gap-2">
                      <span>{rememberedProfile.name}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface border border-line text-ink-subtle">
                        {rememberedProfile.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-ink-subtle">
                      @{rememberedProfile.username}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSwitchAccount}
                  className="text-[11px] text-zinc-500 hover:text-ink font-medium inline-flex items-center gap-1 p-1 rounded hover:bg-surface transition-colors"
                  title="Switch to another staff account"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Switch</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    required
                    autoFocus
                    disabled={isAuthenticating}
                    className="w-full pl-3.5 pr-10 py-2.5 bg-canvas border border-line rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-orange-500 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink transition-colors p-0.5"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-zinc-400 hover:text-zinc-600" />
                    ) : (
                      <Eye className="w-4 h-4 text-zinc-400 hover:text-zinc-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Standard Username & Password Form */
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Staff Username or Email
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. technician or admin"
                  required
                  autoFocus
                  disabled={isAuthenticating}
                  className="w-full px-3.5 py-2.5 bg-canvas border border-line rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-orange-500 disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    required
                    disabled={isAuthenticating}
                    className="w-full pl-3.5 pr-10 py-2.5 bg-canvas border border-line rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-orange-500 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink transition-colors p-0.5"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-zinc-400 hover:text-zinc-600" />
                    ) : (
                      <Eye className="w-4 h-4 text-zinc-400 hover:text-zinc-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isAuthenticating}
            className="w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors press-fx disabled:opacity-50"
          >
            {isAuthenticating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign in to Staff Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => {
                setRecoveryStep(recoveryStep === 'none' ? 'request' : 'none');
                setRecoveryError(null);
                setRecoveryMessage(null);
              }}
              className="text-[11px] font-semibold text-orange-600 hover:text-orange-700"
            >
              {recoveryStep === 'none' ? 'Forgot password? Recover via verified email' : 'Back to Sign In'}
            </button>
          </div>
        </form>

        {recoveryStep !== 'none' && (
          <div className="px-6 pb-6 pt-0 space-y-3 border-t border-line/60 mt-1">
            <div className="pt-4 text-xs font-bold text-ink">Owner Password Recovery</div>
            {recoveryError && (
              <div role="alert" className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                {recoveryError}
              </div>
            )}
            {recoveryMessage && (
              <div role="status" className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">
                {recoveryMessage}
              </div>
            )}

            {recoveryStep === 'request' ? (
              <div className="space-y-2.5">
                <input
                  type="text"
                  value={recoveryIdentifier}
                  onChange={(e) => setRecoveryIdentifier(e.target.value)}
                  placeholder="Enter your staff username or registered email"
                  disabled={recoveryBusy}
                  className="w-full px-3.5 py-2.5 bg-canvas border border-line rounded-xl text-xs"
                />
                <button
                  type="button"
                  disabled={recoveryBusy || !recoveryIdentifier.trim()}
                  onClick={async () => {
                    setRecoveryBusy(true);
                    setRecoveryError(null);
                    try {
                      await authApi.requestPasswordRecovery({ identifier: recoveryIdentifier.trim() });
                      setRecoveryMessage('If an eligible account matches, a recovery code has been sent to your registered email.');
                      setRecoveryStep('confirm');
                    } catch (err) {
                      setRecoveryError(normalizeApiError(err, 'Unable to initiate password recovery.'));
                    } finally {
                      setRecoveryBusy(false);
                    }
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {recoveryBusy ? 'Sending Recovery Code...' : 'Send Recovery Code'}
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <input
                  type="text"
                  value={recoveryToken}
                  onChange={(e) => setRecoveryToken(e.target.value)}
                  placeholder="Enter recovery token / code"
                  disabled={recoveryBusy}
                  className="w-full px-3.5 py-2.5 bg-canvas border border-line rounded-xl text-xs font-mono"
                />
                <input
                  type="password"
                  value={recoveryPassword}
                  onChange={(e) => setRecoveryPassword(e.target.value)}
                  placeholder="New password (min. 12 characters)"
                  disabled={recoveryBusy}
                  className="w-full px-3.5 py-2.5 bg-canvas border border-line rounded-xl text-xs"
                />
                <input
                  type="password"
                  value={recoveryConfirm}
                  onChange={(e) => setRecoveryConfirm(e.target.value)}
                  placeholder="Confirm new password"
                  disabled={recoveryBusy}
                  className="w-full px-3.5 py-2.5 bg-canvas border border-line rounded-xl text-xs"
                />
                <button
                  type="button"
                  disabled={recoveryBusy}
                  onClick={async () => {
                    setRecoveryError(null);
                    if (!recoveryToken.trim()) {
                      setRecoveryError('Recovery token is required.');
                      return;
                    }
                    if (recoveryPassword.length < 12) {
                      setRecoveryError('New password must be at least 12 characters.');
                      return;
                    }
                    if (recoveryPassword !== recoveryConfirm) {
                      setRecoveryError('New password and confirmation do not match.');
                      return;
                    }
                    setRecoveryBusy(true);
                    try {
                      await authApi.confirmPasswordRecovery({
                        token: recoveryToken.trim(),
                        new_password: recoveryPassword,
                      });
                      setRecoveryMessage('Password updated. You can now sign in with your new password.');
                      setRecoveryStep('none');
                      setRecoveryToken('');
                      setRecoveryPassword('');
                      setRecoveryConfirm('');
                    } catch (err) {
                      setRecoveryError(normalizeApiError(err, 'Recovery token is invalid, expired, or already used.'));
                    } finally {
                      setRecoveryBusy(false);
                    }
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {recoveryBusy ? 'Resetting Password...' : 'Confirm Password Recovery'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
