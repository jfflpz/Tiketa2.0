import React, { useState } from 'react';
import { UserPlus, X, Eye, EyeOff, AlertCircle, Loader2, ShieldCheck, Wrench } from 'lucide-react';
import type { TeamRole } from '../../../types/team';
import { LOCATIONS } from '../../../constants/domain';
import { useAppStore } from '../../../store/useAppStore';

export interface CreateITStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    username: string;
    password: string;
    name: string;
    email: string;
    role: TeamRole;
    systemRole: 'it' | 'admin';
    department: string;
    primaryLocation: string;
    locationId?: string | null;
  }) => Promise<boolean>;
}

export const CreateITStaffModal: React.FC<CreateITStaffModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const serverDictionaries = useAppStore((state) => state.serverDictionaries);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [systemRole, setSystemRole] = useState<'it' | 'admin'>('it');
  const [role, setRole] = useState<TeamRole>('Field Technician');
  const [locationCode, setLocationCode] = useState('PSY');
  const [department, setDepartment] = useState('Terminal Operations & PMS');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Use live server locations if available, fallback to domain constants
  const availableLocations = serverDictionaries?.locations && serverDictionaries.locations.length > 0
    ? serverDictionaries.locations
    : LOCATIONS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanUsername || cleanUsername.length < 3) {
      setFormError('Username must be at least 3 characters.');
      return;
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      setFormError('Username can only contain letters, numbers, underscores, dots, and hyphens.');
      return;
    }

    if (!password || password.length < 12) {
      setFormError('Password must be at least 12 characters long.');
      return;
    }

    if (!cleanEmail || !cleanName) {
      setFormError('Full name and email are required.');
      return;
    }

    const selectedLoc = availableLocations.find((l) => l.code === locationCode);
    const primaryLocationLabel = selectedLoc ? `${selectedLoc.name} (${selectedLoc.code})` : locationCode;

    setIsSubmitting(true);
    try {
      const success = await onSubmit({
        username: cleanUsername,
        password,
        name: cleanName,
        email: cleanEmail,
        role,
        systemRole,
        department: department.trim(),
        primaryLocation: primaryLocationLabel,
        locationId: (selectedLoc && 'id' in selectedLoc ? (selectedLoc as { id: string }).id : null),
      });

      if (success) {
        setUsername('');
        setPassword('');
        setName('');
        setEmail('');
        setFormError(null);
        onClose();
      } else {
        // Modal deliberately stays open so user can fix issues and does not lose input
        setFormError('Could not create account. Please check the error toast or server connection.');
      }
    } catch (err: any) {
      setFormError(err?.message || 'A network error occurred while communicating with the backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="fixed inset-0" onClick={isSubmitting ? undefined : onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-lg bg-white border border-[#ECEEF2] rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#ECEEF2] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink">Create Authorized Staff Account</h3>
              <p className="text-[11px] text-zinc-400">Add an authorized staff member with real PostgreSQL RBAC credentials.</p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{formError}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* RBAC Role Selection */}
          <div>
            <label className="font-semibold text-zinc-700 block mb-1.5">System Access Role (RBAC)</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setSystemRole('it');
                  setRole('Field Technician');
                }}
                className={`flex items-center gap-2 p-3 rounded-2xl border text-left transition-all ${
                  systemRole === 'it'
                    ? 'border-orange-500 bg-orange-50/50 text-orange-950 font-bold'
                    : 'border-[#ECEEF2] bg-[#F8F9FA] text-zinc-600'
                }`}
              >
                <div className={`p-1.5 rounded-xl ${systemRole === 'it' ? 'bg-orange-500 text-white' : 'bg-zinc-200 text-zinc-600'}`}>
                  <Wrench className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs">IT Support</div>
                  <div className="text-[10px] text-zinc-500 font-normal">Triage queue &amp; repairs</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSystemRole('admin');
                  setRole('Admin');
                }}
                className={`flex items-center gap-2 p-3 rounded-2xl border text-left transition-all ${
                  systemRole === 'admin'
                    ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 font-bold'
                    : 'border-[#ECEEF2] bg-[#F8F9FA] text-zinc-600'
                }`}
              >
                <div className={`p-1.5 rounded-xl ${systemRole === 'admin' ? 'bg-emerald-600 text-white' : 'bg-zinc-200 text-zinc-600'}`}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs">Administrator</div>
                  <div className="text-[10px] text-zinc-500 font-normal">Governance &amp; reports</div>
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-zinc-700 block mb-1">
                Username <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={50}
                placeholder="e.g. j.doe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs font-mono text-ink focus:outline-none focus:border-orange-500"
              />
              <span className="text-[10px] text-zinc-400 block mt-0.5">3-50 letters, numbers, dots, hyphens</span>
            </div>

            <div>
              <label className="font-semibold text-zinc-700 block mb-1">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={12}
                  maxLength={128}
                  placeholder="Min. 12 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-9 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs font-mono text-ink focus:outline-none focus:border-orange-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <span className="text-[10px] text-zinc-400 block mt-0.5">Must be at least 12 characters</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-zinc-700 block mb-1">
                Specialist Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Angelo P. Cruz"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="font-semibold text-zinc-700 block mb-1">
                Company Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="a.cruz@fivestar.com.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-zinc-700 block mb-1">Operational Role Title</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as TeamRole)}
                className="w-full px-2.5 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500"
              >
                {systemRole === 'admin' ? (
                  <>
                    <option value="Admin">IT Administrator</option>
                    <option value="Owner">IT Executive / Head</option>
                    <option value="Devops">Infrastructure Lead</option>
                  </>
                ) : (
                  <>
                    <option value="Field Technician">Field Technician</option>
                    <option value="Hardware Specialist">Hardware Specialist</option>
                    <option value="Network Engineer">Network Engineer</option>
                    <option value="Senior Analyst">Senior Analyst</option>
                    <option value="Helpdesk Dispatch">Helpdesk Dispatch</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="font-semibold text-zinc-700 block mb-1">Primary Terminal Hub</label>
              <select
                value={locationCode}
                onChange={(e) => setLocationCode(e.target.value)}
                className="w-full px-2.5 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500"
              >
                {availableLocations.map((loc) => (
                  <option key={loc.code} value={loc.code}>
                    {loc.name} ({loc.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-zinc-700 block mb-1">Department Unit</label>
            <input
              type="text"
              placeholder="e.g. POS &amp; Depot Hardware Repair"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="pt-3 border-t border-[#ECEEF2] flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold transition-colors press-fx inline-flex items-center gap-2 disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSubmitting ? 'Creating Account...' : 'Create Account'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
