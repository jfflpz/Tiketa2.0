// @spec BF-08: IT account creation with username/password, authorized role selection & server validation
import React, { useState, useEffect } from 'react';
import { UserPlus, X, Lock, Shield, User, Mail, Loader2, AlertCircle } from 'lucide-react';

export interface CreateITStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    username: string;
    email: string;
    full_name: string;
    role: 'it' | 'admin';
    password: string;
  }) => Promise<boolean> | boolean | void;
}

export const CreateITStaffModal: React.FC<CreateITStaffModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'it' | 'admin'>('it');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUsername('');
      setFullName('');
      setEmail('');
      setRole('it');
      setPassword('');
      setConfirmPassword('');
      setErrorMsg(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Keyboard accessibility: dismiss on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedUser = username.trim().toLowerCase();
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    // 1. Username validation (aligns with backend ^[a-zA-Z0-9_.-]+$)
    if (!/^[a-zA-Z0-9_.-]{3,50}$/.test(trimmedUser)) {
      setErrorMsg('Username must be 3-50 characters using only letters, numbers, dot, dash, or underscore.');
      return;
    }

    // 2. Full name validation
    if (trimmedName.length < 2) {
      setErrorMsg('Full name must be at least 2 characters.');
      return;
    }

    // 3. Password validation (aligns with server min_length=12)
    if (password.length < 12) {
      setErrorMsg('Password must be at least 12 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onSubmit({
        username: trimmedUser,
        full_name: trimmedName,
        email: trimmedEmail,
        role,
        password,
      });

      // Clear password from memory immediately
      setPassword('');
      setConfirmPassword('');

      if (res !== false) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-it-modal-title"
    >
      <div className="fixed inset-0" onClick={() => !isSubmitting && onClose()} aria-hidden="true" />

      <div className="relative z-10 w-full max-w-md bg-white border border-[#ECEEF2] rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4 my-auto max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#ECEEF2] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shadow-xs">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 id="create-it-modal-title" className="text-sm font-bold text-ink">
                Create Staff Account
              </h3>
              <p className="text-[11px] text-zinc-400">
                Authorize technician or administrator with secure credentials.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors press-fx"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Role Selection (Strictly 'it' | 'admin') */}
          <div>
            <label className="font-semibold text-zinc-700 block mb-1">
              Authorization Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('it')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  role === 'it'
                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                    : 'bg-[#F8F9FA] text-zinc-600 border-[#ECEEF2] hover:bg-zinc-100'
                }`}
              >
                <User className="w-3.5 h-3.5 text-orange-400" />
                <span>IT Specialist (it)</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  role === 'admin'
                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                    : 'bg-[#F8F9FA] text-zinc-600 border-[#ECEEF2] hover:bg-zinc-100'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Administrator (admin)</span>
              </button>
            </div>
          </div>

          {/* Username & Full Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-zinc-700 block mb-1">
                Username
              </label>
              <input
                type="text"
                required
                placeholder="e.g. c.esguerra"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs font-mono font-medium text-ink focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="font-semibold text-zinc-700 block mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Christian Esguerra"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label className="font-semibold text-zinc-700 block mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                placeholder="c.esguerra@fivestar.com.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Password (min 12 characters per server contract) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-zinc-700 block mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  required
                  placeholder="Min 12 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs font-mono text-ink focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-zinc-700 block mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  required
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs font-mono text-ink focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          <p className="text-[10px] text-zinc-400 leading-tight">
            Security policy: passwords are never stored in plain text or rendered in tables. Minimum 12 characters required.
          </p>

          {/* Form Actions */}
          <div className="pt-3 border-t border-[#ECEEF2] flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold press-fx"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white font-bold inline-flex items-center gap-1.5 transition-colors press-fx shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
