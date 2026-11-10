import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UserCheck, X, Eye, EyeOff, AlertCircle, ShieldCheck, Wrench, Shield, Lock, Clock } from 'lucide-react';
import type { TeamMember, TeamRole } from '../../../types/team';
import type { StaffRole } from '../../../types';
import { LOCATIONS } from '../../../constants/domain';
import { useAppStore } from '../../../store/useAppStore';

export interface EditITStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMember | null;
  onSubmit: (
    id: string,
    data: {
      name: string;
      email: string;
      username?: string;
      role: TeamRole;
      systemRole: StaffRole;
      department: string;
      primaryLocation: string;
      locationId?: string | null;
      is_active: boolean;
      password?: string;
      acting_admin_password?: string;
    }
  ) => Promise<boolean>;
}

export const EditITStaffModal: React.FC<EditITStaffModalProps> = ({
  isOpen,
  onClose,
  member,
  onSubmit,
}) => {
  const serverDictionaries = useAppStore((state) => state.serverDictionaries);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [systemRole, setSystemRole] = useState<StaffRole>('it');
  const [role, setRole] = useState<TeamRole>('Field Technician');
  const [locationCode, setLocationCode] = useState('PSY');
  const [department, setDepartment] = useState('Terminal Operations & PMS');
  const [isActive, setIsActive] = useState(true);

  // Administrative Password Reset (S5-12)
  const [actingAdminPassword, setActingAdminPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showActingPassword, setShowActingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // 168-Hour Username Cooldown (S5-13)
  const COOLDOWN_HOURS = 168;
  const COOLDOWN_MS = COOLDOWN_HOURS * 60 * 60 * 1000;
  const lastChangeMs = member?.last_username_change_at
    ? new Date(member.last_username_change_at).getTime()
    : 0;
  const cooldownUntilMs = member?.username_cooldown_until
    ? new Date(member.username_cooldown_until).getTime()
    : lastChangeMs > 0
    ? lastChangeMs + COOLDOWN_MS
    : 0;
  const isCooldownActive = Boolean(cooldownUntilMs && cooldownUntilMs > Date.now());
  const nextEligibleDate = isCooldownActive
    ? new Date(cooldownUntilMs).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })
    : null;

  // Sync state when member changes or modal opens
  useEffect(() => {
    if (member && isOpen) {
      setName(member.name || '');
      setUsername(member.username || member.email?.split('@')[0] || '');
      setEmail(member.email || '');
      setSystemRole(member.systemRole || 'it');
      setRole(member.role || 'Field Technician');
      setDepartment(member.department || 'Terminal Operations & PMS');
      setIsActive(member.is_active !== false && member.status !== 'offline');
      setActingAdminPassword('');
      setPassword('');
      setConfirmPassword('');
      setFormError(null);

      // Extract location code if formatted as "Name (CODE)"
      const match = member.primaryLocation?.match(/\(([A-Z]+)\)/);
      if (match) {
        setLocationCode(match[1]);
      } else {
        setLocationCode('PSY');
      }
    }
  }, [member, isOpen]);

  // Handle ESC key dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !member) return null;

  const availableLocations =
    serverDictionaries?.locations && serverDictionaries.locations.length > 0
      ? serverDictionaries.locations
      : LOCATIONS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();

    if (!cleanName) {
      setFormError('Full name is required.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setFormError('A valid email address is required.');
      return;
    }

    // Username validation if not in cooldown
    if (!isCooldownActive && cleanUsername) {
      if (cleanUsername.length < 3) {
        setFormError('Username must be at least 3 characters long.');
        return;
      }
      if (!/^[a-zA-Z0-9._-]+$/.test(cleanUsername)) {
        setFormError('Username can only contain alphanumeric characters, dots, underscores, or hyphens.');
        return;
      }
    }

    // Password reset validation (S5-12)
    const wantsPasswordReset = Boolean(
      password.trim() || confirmPassword.trim() || actingAdminPassword.trim()
    );

    if (wantsPasswordReset) {
      if (!actingAdminPassword.trim()) {
        setFormError('Your current Admin password is required to reset target credentials.');
        return;
      }
      if (password.trim().length < 12) {
        setFormError('Target new password must be at least 12 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setFormError('Target new password and confirmation do not match.');
        return;
      }
    }

    // B-03 Governed Actions Validation
    if (systemRole !== member.systemRole) {
      setFormError(
        'Direct role changes are disabled (B-03 Governance). Role tier modifications must be submitted via the Pending Approvals Queue.'
      );
      return;
    }

    if (!isActive && member.is_active) {
      setFormError(
        'Direct account deactivation is disabled (B-03 Governance). Deactivation requests must be submitted via the Pending Approvals Queue.'
      );
      return;
    }

    const selectedLoc = availableLocations.find((l) => l.code === locationCode);
    const primaryLocationLabel = selectedLoc
      ? `${selectedLoc.name} (${selectedLoc.code})`
      : locationCode;

    setIsSubmitting(true);
    try {
      const success = await onSubmit(member.id, {
        name: cleanName,
        email: cleanEmail,
        username: !isCooldownActive && cleanUsername ? cleanUsername : undefined,
        role,
        systemRole,
        department: department.trim(),
        primaryLocation: primaryLocationLabel,
        locationId:
          selectedLoc && 'id' in selectedLoc ? (selectedLoc as { id: string }).id : null,
        is_active: isActive,
        password: wantsPasswordReset ? password.trim() : undefined,
        acting_admin_password: wantsPasswordReset ? actingAdminPassword.trim() : undefined,
      });

      if (success) {
        // Clear sensitive credentials from memory
        setActingAdminPassword('');
        setPassword('');
        setConfirmPassword('');
        onClose();
      } else {
        const storeError = useAppStore.getState().teamError;
        setFormError(storeError || 'Failed to update credentials. Please check your admin password.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !member) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-staff-modal-title"
    >
      <div
        className="fixed inset-0"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-lg bg-white border border-[#ECEEF2] rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-scale-up">
        {/* Header (Pinned) */}
        <div className="px-6 py-4 bg-[#F8F9FA] border-b border-[#ECEEF2] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 id="edit-staff-modal-title" className="text-sm font-bold text-ink">
                Edit Staff Account Governance
              </h3>
              <p className="text-[11px] text-zinc-500">
                Update credentials, terminal assignment &amp; RBAC access tier
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-xl bg-white border border-[#ECEEF2] text-zinc-400 hover:text-zinc-700 press-fx disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Username Governance (S5-13: Immediate Save + 168h Cooldown) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-ink">
                  System Username <span className="text-rose-500">*</span>
                </label>
                {isCooldownActive ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    <Clock className="w-3 h-3" />
                    Cooldown active until {nextEligibleDate}
                  </span>
                ) : (
                  <span className="text-[10px] text-emerald-600 font-medium">
                    Immediate update eligible (168h rule)
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-400">
                  @
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isSubmitting || isCooldownActive}
                  placeholder="e.g. jdoe_it"
                  className="w-full pl-7 pr-3 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs font-mono font-bold text-ink focus:outline-none focus:border-orange-500 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">
                {isCooldownActive
                  ? 'Usernames can only be edited once every 168 hours (7 days) per account.'
                  : 'Changing username takes effect immediately. The target user must log in with the new username.'}
              </p>
            </div>

            {/* Full Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  required
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-orange-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="specialist@fivestar.com.ph"
                  required
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-orange-500 disabled:opacity-60"
                />
              </div>
            </div>

            {/* System RBAC Tier (4-Tier) */}
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">
                Access Tier (RBAC Authority) <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-[#F8F9FA] p-1 rounded-2xl border border-[#ECEEF2]">
                {(
                  [
                    { roleId: 'intern', label: 'IT Intern', icon: Wrench },
                    { roleId: 'it', label: 'IT Support', icon: Wrench },
                    { roleId: 'supervisor', label: 'Supervisor', icon: Shield },
                    { roleId: 'admin', label: 'Admin', icon: ShieldCheck },
                  ] as const
                ).map((tier) => {
                  const Icon = tier.icon;
                  const isSelected = systemRole === tier.roleId;
                  return (
                    <button
                      key={tier.roleId}
                      type="button"
                      onClick={() => setSystemRole(tier.roleId)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all press-fx ${
                        isSelected
                          ? 'bg-white text-ink shadow-sm border border-[#ECEEF2]'
                          : 'text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-orange-500' : ''}`} />
                      <span>{tier.label}</span>
                    </button>
                  );
                })}
              </div>
              {systemRole !== member.systemRole && (
                <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-[11px] text-amber-800 animate-fade-in">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Governed Action (B-03):</strong> Direct RBAC tier changes require an account proposal submitted to the <strong>Pending Approvals Queue</strong> for Supervisor confirmation.
                  </span>
                </div>
              )}
            </div>

            {/* Operational Title & Primary Terminal Hub */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Operational Title
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as TeamRole)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-orange-500 disabled:opacity-60"
                >
                  <option value="Field Technician">Field Technician</option>
                  <option value="Network Specialist">Network Specialist</option>
                  <option value="Senior Specialist">Senior Specialist</option>
                  <option value="Supervisor">IT Supervisor</option>
                  <option value="Admin">System Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Terminal Hub Station
                </label>
                <select
                  value={locationCode}
                  onChange={(e) => setLocationCode(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-orange-500 disabled:opacity-60"
                >
                  {availableLocations.map((loc) => (
                    <option key={loc.code} value={loc.code}>
                      {loc.name} ({loc.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Department */}
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Assigned Department
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-orange-500 disabled:opacity-60"
              />
            </div>

            {/* Account Status Active Toggle */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-[#ECEEF2]">
              <div>
                <span className="text-xs font-bold text-ink block">Account Active Status</span>
                <span className="text-[11px] text-zinc-500">
                  {isActive
                    ? 'Account is authorized for active login and ticket assignments.'
                    : 'Account is soft-deactivated. Historical logs and metrics are preserved.'}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={isSubmitting}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
              </label>
            </div>
            {!isActive && member.is_active && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-[11px] text-amber-800 animate-fade-in">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Governed Action (B-03):</strong> Direct account deactivation is disabled. Please submit a deactivation proposal via the <strong>Pending Approvals Queue</strong>.
                </span>
              </div>
            )}

            {/* Administrative Password Reset (S5-12: Requires Current Admin Password + Dual New Passwords) */}
            <div className="p-3.5 rounded-2xl bg-orange-50/50 border border-orange-200/60 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-ink">
                <Lock className="w-4 h-4 text-orange-600" />
                <span>Administrative Password Reset</span>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                To reset this account's password, enter your active administrator credential followed by the target new password confirmed twice. Leave blank to retain current password.
              </p>

              {/* 1. Acting Admin Current Password */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                  Acting Admin Current Password
                </label>
                <div className="relative">
                  <input
                    type={showActingPassword ? 'text' : 'password'}
                    value={actingAdminPassword}
                    onChange={(e) => setActingAdminPassword(e.target.value)}
                    placeholder="Enter your current admin password"
                    disabled={isSubmitting}
                    className="w-full pl-3 pr-9 py-2 bg-white border border-[#ECEEF2] rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-orange-500 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowActingPassword(!showActingPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showActingPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 2. Target New Password */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                  Target New Password (min. 12 characters)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new 12+ character password"
                    disabled={isSubmitting}
                    className="w-full pl-3 pr-9 py-2 bg-white border border-[#ECEEF2] rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-orange-500 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 3. Confirm Target New Password */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                  Confirm Target New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter target new password"
                    disabled={isSubmitting}
                    className="w-full pl-3 pr-9 py-2 bg-white border border-[#ECEEF2] rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-orange-500 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Actions (Pinned) */}
          <div className="p-4 px-6 border-t border-[#ECEEF2] bg-[#F8F9FA]/80 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold transition-colors press-fx"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-colors press-fx shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              Save Account Changes
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
