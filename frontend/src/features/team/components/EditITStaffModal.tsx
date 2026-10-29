import React, { useState, useEffect } from 'react';
import { UserCheck, X, Eye, EyeOff, AlertCircle, Loader2, ShieldCheck, Wrench, Shield, CheckCircle2 } from 'lucide-react';
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
      role: TeamRole;
      systemRole: StaffRole;
      department: string;
      primaryLocation: string;
      locationId?: string | null;
      is_active: boolean;
      password?: string;
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
  const [email, setEmail] = useState('');
  const [systemRole, setSystemRole] = useState<StaffRole>('it');
  const [role, setRole] = useState<TeamRole>('Field Technician');
  const [locationCode, setLocationCode] = useState('PSY');
  const [department, setDepartment] = useState('Terminal Operations & PMS');
  const [isActive, setIsActive] = useState(true);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Sync state when member changes or modal opens
  useEffect(() => {
    if (member && isOpen) {
      setName(member.name || '');
      setEmail(member.email || '');
      setSystemRole(member.systemRole || 'it');
      setRole(member.role || 'Field Technician');
      setDepartment(member.department || 'Terminal Operations & PMS');
      setIsActive(member.is_active !== false && member.status !== 'offline');
      setPassword('');
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

    if (!cleanName) {
      setFormError('Full name is required.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setFormError('A valid email address is required.');
      return;
    }

    if (password && password.length < 12) {
      setFormError('New password must be at least 12 characters long if provided.');
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
        role,
        systemRole,
        department: department.trim(),
        primaryLocation: primaryLocationLabel,
        locationId:
          selectedLoc && 'id' in selectedLoc ? (selectedLoc as { id: string }).id : null,
        is_active: isActive,
        password: password.trim() ? password.trim() : undefined,
      });

      if (success) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div
        className="fixed inset-0"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-lg bg-white border border-[#ECEEF2] rounded-3xl shadow-2xl overflow-hidden my-auto animate-scale-up">
        {/* Header */}
        <div className="px-6 py-4 bg-[#F8F9FA] border-b border-[#ECEEF2] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink">
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Read-only Username Banner */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs">
            <span className="text-zinc-500 font-medium">System Username:</span>
            <span className="font-mono font-bold text-zinc-800">
              @{member.username || member.email.split('@')[0]}
            </span>
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

          {/* System RBAC Tier (4-Tier + Analyst) */}
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

          {/* Optional Password Reset */}
          <div className="p-3.5 rounded-2xl bg-orange-50/50 border border-orange-200/60 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-ink">
                Reset Password (Optional)
              </label>
              <span className="text-[10px] text-zinc-400">Leave blank to retain current password</span>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password (min. 12 characters)"
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

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#ECEEF2]">
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
              className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-sm transition-colors press-fx inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
