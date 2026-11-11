import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  UserCheck,
  X,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  Wrench,
  Shield,
  Lock,
  Clock,
  Send,
  CheckSquare,
  Check,
  Loader2,
} from 'lucide-react';
import type { TeamMember, TeamMemberStatus, TeamRole } from '../../../types/team';
import type { StaffRole } from '../../../types';
import { useAppStore } from '../../../store/useAppStore';

export const AVAILABLE_PERMISSIONS = [
  {
    key: 'workbench:access',
    label: 'Assigned Repair Workbench',
    desc: 'Access assigned tickets and diagnostic repair checklists',
  },
  {
    key: 'notes:view',
    label: 'Saved Repair Notes (Read-Only)',
    desc: 'Browse standardized SOP repair guides and past fixes',
  },
  {
    key: 'notes:edit',
    label: 'Create & Edit Saved Repair Guides',
    desc: 'Author and update standardized SOP repair guides',
  },
  {
    key: 'tickets:view',
    label: 'Full Ticket Queues & Dispatch',
    desc: 'Access global queue, dispatch boards, and unassigned pool',
  },
  {
    key: 'tickets:claim',
    label: 'Claim Tickets from General Pool',
    desc: 'Self-assign and claim unassigned terminal tickets',
  },
  {
    key: 'terminals:view',
    label: '15 Terminal Hubs Monitor',
    desc: 'Real-time telemetry and station workload across 15 provincial hubs',
  },
  {
    key: 'analytics:view',
    label: 'Analytics & Operational KPIs',
    desc: 'Access executive analytics and resolution velocity metrics',
  },
  {
    key: 'reports:export',
    label: 'Reports & Audit Logs Export',
    desc: 'Generate and export official incident reports',
  },
  {
    key: 'team:manage',
    label: 'IT Team Roster & Directory',
    desc: 'Manage staff profiles, station assignments, and account proposals',
  },
] as const;

export const DEFAULT_ROLE_PERMISSIONS: Record<StaffRole, string[]> = {
  intern: ['workbench:access', 'notes:view'],
  it: ['workbench:access', 'notes:view', 'tickets:view', 'tickets:claim', 'terminals:view'],
  supervisor: ['notes:view', 'terminals:view', 'analytics:view', 'reports:export', 'team:manage'],
  admin: [
    'workbench:access',
    'notes:view',
    'notes:edit',
    'tickets:view',
    'tickets:claim',
    'terminals:view',
    'analytics:view',
    'reports:export',
    'team:manage',
  ],
};

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
      role?: TeamRole;
      systemRole: StaffRole;
      status?: TeamMemberStatus;
      custom_permissions?: string[];
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
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [systemRole, setSystemRole] = useState<StaffRole>('it');
  const [selectedStatus, setSelectedStatus] = useState<'active' | 'on_leave' | 'inactive'>('active');
  const [customPermissions, setCustomPermissions] = useState<string[]>([]);

  // Administrative Password Reset (S5-12)
  const [actingAdminPassword, setActingAdminPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showActingPassword, setShowActingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Separate Admin Password Authorization Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authPassword, setAuthPassword] = useState('');
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [authModalError, setAuthModalError] = useState<string | null>(null);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);

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
      setSelectedStatus(
        member.is_active === false || member.status === 'inactive' || member.status === 'offline'
          ? 'inactive'
          : member.status === 'on_leave'
          ? 'on_leave'
          : 'active'
      );
      setCustomPermissions(member.custom_permissions || []);
      setActingAdminPassword('');
      setAuthPassword('');
      setIsAuthModalOpen(false);
      setAuthModalError(null);
      setPassword('');
      setConfirmPassword('');
      setFormError(null);
    }
  }, [member, isOpen]);

  // Handle ESC key dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting && !isAuthSubmitting) {
        if (isAuthModalOpen) {
          setIsAuthModalOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, isAuthSubmitting, isAuthModalOpen, onClose]);

  if (!isOpen || !member) return null;
  if (typeof document === 'undefined') return null;

  const isRoleChanged = Boolean(member && systemRole !== member.systemRole);
  const isDeactivated = selectedStatus === 'inactive' && member.is_active !== false;
  const isGovernedAction = isRoleChanged || isDeactivated;

  const wantsPasswordReset = Boolean(
    password.trim() || confirmPassword.trim() || (actingAdminPassword.trim() && (password || confirmPassword))
  );

  const roleDefaultKeys = DEFAULT_ROLE_PERMISSIONS[systemRole] || [];
  const defaultPermissions = AVAILABLE_PERMISSIONS.filter((p) => roleDefaultKeys.includes(p.key));
  const additionalPermissions = AVAILABLE_PERMISSIONS.filter((p) => !roleDefaultKeys.includes(p.key));

  const executeSave = async (adminPasswordToUse?: string) => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();

    setIsSubmitting(true);
    try {
      const success = await onSubmit(member.id, {
        name: cleanName,
        email: cleanEmail,
        username: !isCooldownActive && cleanUsername ? cleanUsername : undefined,
        systemRole,
        status: selectedStatus,
        custom_permissions: customPermissions,
        department: member.department || 'Terminal Operations & PMS',
        primaryLocation: member.primaryLocation || 'Pasay (PSY)',
        locationId: null,
        is_active: selectedStatus !== 'inactive',
        password: wantsPasswordReset ? password.trim() : undefined,
        acting_admin_password: adminPasswordToUse?.trim() || (wantsPasswordReset ? actingAdminPassword.trim() : undefined),
      });

      if (success) {
        setActingAdminPassword('');
        setAuthPassword('');
        setPassword('');
        setConfirmPassword('');
        setIsAuthModalOpen(false);
        onClose();
        return true;
      } else {
        const storeError = useAppStore.getState().teamError;
        const msg = storeError || 'Failed to update credentials. Please check your admin password.';
        setFormError(msg);
        setAuthModalError(msg);
        return false;
      }
    } finally {
      setIsSubmitting(false);
      setIsAuthSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setAuthModalError(null);

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

    if (!isCooldownActive && cleanUsername) {
      if (cleanUsername.length < 3) {
        setFormError('Username must be at least 3 characters.');
        return;
      }
      if (!/^[a-z0-9_.-]+$/.test(cleanUsername)) {
        setFormError('Username can only contain lowercase letters, numbers, underscores, dots, and hyphens.');
        return;
      }
    }

    // Password reset validation (S5-12)
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
      await executeSave(actingAdminPassword);
      return;
    }

    // Governed action (B-03): Submit proposal directly for Supervisor review
    if (isGovernedAction) {
      await executeSave();
      return;
    }

    // Direct account changes: trigger separate Admin Password Authorization modal popup
    setAuthPassword('');
    setAuthModalError(null);
    setIsAuthModalOpen(true);
  };

  const handleConfirmAuthSave = async () => {
    if (!authPassword.trim()) {
      setAuthModalError('Your current Admin password is required to save account changes.');
      return;
    }
    setIsAuthSubmitting(true);
    setAuthModalError(null);
    await executeSave(authPassword);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-staff-modal-title"
    >
      <div
        className="fixed inset-0"
        onClick={() => !isSubmitting && !isAuthModalOpen && onClose()}
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
                Edit Staff Account 
              </h3>
              <p className="text-[11px] text-zinc-500">
                Update credentials &amp; RBAC access tier
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isAuthSubmitting}
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
              {isRoleChanged && (
                <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-[11px] text-amber-800 animate-fade-in">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Governed Action (B-03):</strong> Direct RBAC tier changes require an account proposal submitted to the <strong>Pending Approvals Queue</strong> for Supervisor confirmation.
                  </span>
                </div>
              )}
            </div>

            {/* Account Status (Tri-State Lifecycle: Active, On-leave, Deactivated) */}
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">
                Account Status
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-[#F8F9FA] p-1 rounded-2xl border border-[#ECEEF2]">
                {[
                  { id: 'active', label: 'Active', desc: 'Full operational access' },
                  { id: 'on_leave', label: 'On-leave', desc: 'Temporary duty pause' },
                  { id: 'inactive', label: 'Deactivated', desc: 'Login suspended' },
                ].map((st) => {
                  const isSelected = selectedStatus === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setSelectedStatus(st.id as any)}
                      disabled={isSubmitting}
                      className={`py-2 px-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-0.5 transition-all press-fx ${
                        isSelected
                          ? 'bg-white text-ink shadow-sm border border-[#ECEEF2]'
                          : 'text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            st.id === 'active'
                              ? 'bg-emerald-500'
                              : st.id === 'on_leave'
                              ? 'bg-amber-500'
                              : 'bg-zinc-400'
                          }`}
                        />
                        <span>{st.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {isDeactivated && (
                <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-[11px] text-amber-800 animate-fade-in">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Governed Action (B-03):</strong> Direct deactivation requires an account proposal submitted to the <strong>Pending Approvals Queue</strong> for Supervisor confirmation.
                  </span>
                </div>
              )}
            </div>

            {/* Feature Access & Permissions: Separated into Default Access vs Other Features */}
            <div className="p-3.5 rounded-2xl bg-zinc-50 border border-[#ECEEF2] space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-bold text-ink">Feature Access &amp; Permissions</span>
                </div>
                <span className="text-[10px] text-zinc-400">
                  Role defaults &amp; overrides
                </span>
              </div>

              {/* Group 1: Default Role Access */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">
                    Default Access ({systemRole.toUpperCase()})
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold">
                    Automatically Active
                  </span>
                </div>
                {defaultPermissions.length === 0 ? (
                  <p className="text-[11px] text-zinc-400 italic bg-white p-2.5 rounded-xl border border-[#ECEEF2]">
                    No elevated features included by default for this role.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {defaultPermissions.map((perm) => (
                      <div
                        key={perm.key}
                        className="flex items-start gap-2.5 p-2 rounded-xl bg-white border border-[#ECEEF2] text-xs text-zinc-700 select-none"
                      >
                        <div className="w-4 h-4 rounded-md bg-emerald-50 border border-emerald-300 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-ink">{perm.label}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700 font-bold uppercase tracking-wider">
                              Default
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-400 leading-tight mt-0.5">{perm.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Group 2: Other Features (Checklist to Grant Override) */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">
                    Other Features (Check to Grant Access)
                  </span>
                  <span className="text-[10px] text-orange-600 font-semibold">
                    Role Overrides
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 leading-tight">
                  Check specific capabilities below to grant access to this account beyond their default role.
                </p>

                {additionalPermissions.length === 0 ? (
                  <p className="text-[11px] text-zinc-400 italic bg-white p-2.5 rounded-xl border border-[#ECEEF2]">
                    All platform features are already included by default for Administrator.
                  </p>
                ) : (
                  <div className="space-y-1.5 pt-0.5">
                    {additionalPermissions.map((perm) => {
                      const isChecked = customPermissions.includes(perm.key);
                      return (
                        <label
                          key={perm.key}
                          className={`flex items-start gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-orange-50/50 border-orange-300 text-ink'
                              : 'bg-white border-[#ECEEF2] text-zinc-600 hover:border-zinc-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCustomPermissions([...customPermissions, perm.key]);
                              } else {
                                setCustomPermissions(customPermissions.filter((k) => k !== perm.key));
                              }
                            }}
                            disabled={isSubmitting}
                            className="mt-0.5 rounded border-zinc-300 text-orange-600 focus:ring-orange-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-ink">{perm.label}</span>
                              {isChecked && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-orange-100 text-orange-700 font-bold uppercase tracking-wider">
                                  Granted
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-400 leading-tight mt-0.5">{perm.desc}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Administrative Password Reset (S5-12) */}
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
            {isGovernedAction ? (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors press-fx shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit for Approval</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-colors press-fx shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                Save Account Changes
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Separate Admin Password Authorization Modal Pop-up */}
      {isAuthModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
        >
          <div className="w-full max-w-sm bg-white border border-[#ECEEF2] rounded-3xl shadow-2xl p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 id="auth-modal-title" className="text-sm font-bold text-ink">
                    Admin Authorization
                  </h4>
                  <p className="text-[11px] text-zinc-500">Confirm changes to staff account</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(false)}
                disabled={isAuthSubmitting}
                className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600"
                aria-label="Close authorization modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              Please enter your current Administrator password to confirm and apply modifications for <strong>{name}</strong>.
            </p>

            {authModalError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>{authModalError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-zinc-700">
                Admin Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showAuthPassword ? 'text' : 'password'}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Enter your current admin password"
                  autoFocus
                  disabled={isAuthSubmitting}
                  className="w-full pl-3 pr-9 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-orange-500 disabled:opacity-60"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleConfirmAuthSave();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowAuthPassword(!showAuthPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  {showAuthPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(false)}
                disabled={isAuthSubmitting}
                className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold press-fx"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAuthSave}
                disabled={isAuthSubmitting || !authPassword.trim()}
                className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold press-fx shadow-sm flex items-center gap-1.5"
              >
                {isAuthSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                <span>Authorize &amp; Save</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
