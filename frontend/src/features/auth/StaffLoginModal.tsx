// @spec FR-AUTH-02: Staff Authentication Modal for IT Support and Administrators
import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Wrench, Lock, ArrowRight } from 'lucide-react';
import { useAppStore, StaffRole } from '../../store/useAppStore';

export const StaffLoginModal: React.FC = () => {
  const { loginModalRole, closeLoginModal, loginAsStaff } = useAppStore();

  const [role, setRole] = useState<StaffRole>('admin');
  const [username, setUsername] = useState('stephen@fivestarbus.com');
  const [password, setPassword] = useState('••••••••••••');

  useEffect(() => {
    if (loginModalRole) {
      setRole(loginModalRole);
      setUsername(
        loginModalRole === 'admin'
          ? 'stephen@fivestarbus.com'
          : 'nathaniel@fivestarbus.com'
      );
    }
  }, [loginModalRole]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && loginModalRole) {
        closeLoginModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [loginModalRole, closeLoginModal]);

  if (!loginModalRole) return null;

  const handleRoleSwitch = (newRole: StaffRole) => {
    setRole(newRole);
    setUsername(
      newRole === 'admin'
        ? 'stephen@fivestarbus.com'
        : 'nathaniel@fivestarbus.com'
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginAsStaff(role);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-[2px]">
      <div
        className="fixed inset-0"
        onClick={closeLoginModal}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-md bg-surface border border-line rounded-3xl shadow-2xl overflow-hidden">
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
                2-Tier Authenticated Access (Argon2id + JWT)
              </p>
            </div>
          </div>
          <button
            onClick={closeLoginModal}
            className="p-1.5 rounded-xl bg-surface border border-line text-ink-subtle hover:text-ink press-fx"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                className="w-full px-3.5 py-2.5 bg-canvas border border-line rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-zinc-500"
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
                required
                className="w-full px-3.5 py-2.5 bg-canvas border border-line rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-zinc-500"
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

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors press-fx"
          >
            <span>
              {role === 'admin'
                ? 'Launch Admin Dashboard'
                : 'Launch IT Support Workbench'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
