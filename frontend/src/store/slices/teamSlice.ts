// @spec BF-08: IT accounts, employee directory profiles & server dictionaries
import type { AppSliceCreator } from '../types';
import type { TeamMember, TeamRole, TeamMemberStatus, StaffAvailabilityStatus } from '../../types/team';
import type { EmployeeProfile, StaffRole } from '../../types';
import {
  adminApi,
  accountRequestsApi,
  extractApiErrorMessage,
  setAccessToken,
  BackendUser,
  UserCreateInput,
  EmployeeCreateInput,
  DictionariesResponse,
  AdminEmployeeItem,
} from '../../api/client';

export interface TeamSlice {
  itTeamMembers: TeamMember[];
  verifiedEmployeesList: EmployeeProfile[];
  serverDictionaries: DictionariesResponse | null;
  isLoadingTeam: boolean;
  teamError: string | null;

  fetchITMembers: () => Promise<void>;
  createITMemberApi: (payload: UserCreateInput) => Promise<boolean>;
  updateITMemberApi: (
    id: string,
    payload: {
      name: string;
      email: string;
      username?: string;
      role?: TeamRole;
      systemRole: StaffRole;
      status?: TeamMemberStatus;
      availability_status?: StaffAvailabilityStatus;
      availability_note?: string | null;
      custom_permissions?: string[];
      department: string;
      primaryLocation: string;
      locationId?: string | null;
      is_active: boolean;
      password?: string;
      acting_admin_password?: string;
    }
  ) => Promise<boolean>;
  deleteITMemberApi: (id: string, name?: string) => Promise<boolean>;
  deactivateITMemberApi: (id: string, name?: string) => Promise<boolean>;

  fetchEmployees: () => Promise<void>;
  createEmployeeApi: (payload: EmployeeCreateInput) => Promise<boolean>;
  updateEmployeeApi: (
    id: string,
    payload: Partial<AdminEmployeeItem>
  ) => Promise<boolean>;
  deleteEmployeeApi: (id: string, name?: string) => Promise<boolean>;
  deactivateEmployeeApi: (id: string, name?: string) => Promise<boolean>;

  fetchDictionaries: () => Promise<void>;

  createITMember: (member: {
    name: string;
    email: string;
    role: TeamRole;
    department: string;
    status: TeamMemberStatus;
    primaryLocation: string;
    username?: string;
    password?: string;
  }) => void;
  deleteITMember: (id: string) => void;
  createEmployee: (emp: {
    employee_id: string;
    full_name: string;
    email: string;
    company_id: string;
    company_name: string;
    location_id: string;
    location_name: string;
    department_id: string;
    department_name: string;
  }) => void;
  deleteEmployee: (employeeId: string) => void;
}

const mapBackendUserToTeamMember = (
  u: BackendUser,
  dictionaries: DictionariesResponse | null
): TeamMember => {
  const isAdm = u.role === 'admin';
  const loc = dictionaries?.locations.find((l) => l.id === u.location_id);
  let locationName = loc ? `${loc.name} (${loc.code})` : 'Main HQ / Regional Fleet';
  let dept = isAdm ? 'IT Systems Administration' : 'Terminal Support & Operations';
  let roleTitle: TeamRole = isAdm ? 'Admin' : 'Field Technician';

  try {
    const raw =
      localStorage.getItem(`tiketa_staff_meta_${u.username}`) ||
      localStorage.getItem(`tiketa_staff_meta_${u.id}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.primaryLocation) locationName = parsed.primaryLocation;
      if (parsed.department) dept = parsed.department;
      if (parsed.roleTitle) roleTitle = parsed.roleTitle as TeamRole;
    }
  } catch (e) {
    // Ignore storage parse error
  }

  // Pre-seed canonical technician hubs and departments if not overridden
  if (!localStorage.getItem(`tiketa_staff_meta_${u.username}`)) {
    if (u.username === 'technician') {
      dept = 'Terminal Operations & PMS';
      locationName = 'Caloocan Terminal (CAL)';
      roleTitle = 'Field Technician';
    } else if (u.username === 'tech_support') {
      dept = 'IT Infrastructure & Support';
      locationName = 'Pasay Terminal (PSY)';
      roleTitle = 'Field Technician';
    } else if (u.username === 'admin') {
      dept = 'IT Systems Administration';
      locationName = 'Main HQ / Central Fleet';
      roleTitle = 'Admin';
    }
  }

  return {
    id: u.id,
    name: u.full_name,
    username: u.username,
    email: u.email,
    role: roleTitle,
    systemRole: u.role,
    avatar:
    u.avatar_url ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
      u.username
    )}&backgroundColor=${isAdm ? 'fed7aa' : 'b6e3f4'}`,
    department: dept,
    status: !u.is_active
      ? 'offline'
      : u.status === 'on_leave'
      ? 'on_leave'
      : 'active',
    availabilityStatus:
      (u as any).availability_status === 'on_leave' || u.status === 'on_leave'
        ? 'on_leave'
        : (u as any).availability_status === 'busy'
        ? 'busy'
        : (u as any).availability_status === 'unavailable' || !u.is_active
        ? 'unavailable'
        : 'available',
    availabilityNote: (u as any).availability_note ?? null,
    isOnline: typeof (u as any).is_online === 'boolean' ? (u as any).is_online : null,
    primaryLocation: locationName,
    ticketsClosed: u.closed_repairs ?? 0,
    activeTickets: u.active_bench ?? 0,
    flameScore: 0,
    is_active: u.is_active,
    custom_permissions: u.custom_permissions || [],
  };
};

export const createTeamSlice: AppSliceCreator<TeamSlice> = (set, get) => ({
  itTeamMembers: [],
  verifiedEmployeesList: [],
  serverDictionaries: null,
  isLoadingTeam: false,
  teamError: null,

  fetchDictionaries: async () => {
    try {
      const data = await adminApi.getDictionaries();
      set({ serverDictionaries: data });
    } catch (err: unknown) {
      console.warn('Could not load dictionaries:', err);
    }
  },

  fetchITMembers: async () => {
    const currentAuthUser = get().currentUser;
    if (currentAuthUser?.role !== 'admin' && currentAuthUser?.role !== 'supervisor') {
      return;
    }
    set({ isLoadingTeam: true, teamError: null });
    try {
      const dicts = get().serverDictionaries;
      const users = await adminApi.getUsers({ offset: 0, limit: 100 });
      const mapped = users.map((u) => {
        const member = mapBackendUserToTeamMember(u, dicts);
        if (
          currentAuthUser &&
          (member.id === currentAuthUser.id ||
            member.email.toLowerCase() === currentAuthUser.email.toLowerCase()) &&
          currentAuthUser.avatarUrl
        ) {
          member.avatar = currentAuthUser.avatarUrl;
        }
        return member;
      });
      set({ itTeamMembers: mapped, isLoadingTeam: false });
    } catch (err: unknown) {
      const msg = extractApiErrorMessage(err, 'Failed to load IT team accounts from server');
      set({ teamError: msg, isLoadingTeam: false });
      get().addToast('Directory Sync Error', msg, 'warning');
    }
  },

  createITMemberApi: async (payload: UserCreateInput) => {
    set({ teamError: null });
    try {
      await adminApi.createUser(payload);
      await get().fetchITMembers();
      get().addToast(
        'IT Account Created',
        `Account @${payload.username} (${payload.full_name}) successfully created.`,
        'success'
      );
      return true;
    } catch (err: unknown) {
      const msg = extractApiErrorMessage(err, 'Account creation failed: backend unreachable or error');
      set({ teamError: msg });
      get().addToast('Account Creation Failed', msg, 'warning');
      return false;
    }
  },

  updateITMemberApi: async (id, payload) => {
    try {
      const existingMember = get().itTeamMembers.find((m) => m.id === id);
      const currentUserId = get().currentUser?.id;
      const isSelfEdit = Boolean(currentUserId && currentUserId === id);

      let passwordChanged = false;
      // 1. Administrative Password Reset (S5-12)
      if (payload.password && payload.password.trim()) {
        if (!payload.acting_admin_password || !payload.acting_admin_password.trim()) {
          throw new Error('Your current Admin password is required to reset target credentials.');
        }
        await adminApi.resetUserPassword(id, {
          admin_current_password: payload.acting_admin_password.trim(),
          new_password: payload.password.trim(),
          confirm_password: payload.password.trim(),
        });
        passwordChanged = true;
      }

      // If the admin reset their own password, the server incremented token_version += 1 and invalidated current session.
      // Do NOT fire downstream authenticated requests with dead token.
      if (isSelfEdit && passwordChanged) {
        setAccessToken(null);
        get().setCurrentUser(null);
        get().addToast(
          'Password Changed Successfully',
          'Your password has been updated. Active sessions were revoked for security; please sign in with your new password.',
          'success'
        );
        get().openLoginModal('admin');
        return true;
      }

      // 2. Governed Username Update (S5-13)
      if (
        payload.username &&
        payload.username.trim() &&
        existingMember?.username &&
        payload.username.trim().toLowerCase() !== existingMember.username.toLowerCase()
      ) {
        await adminApi.updateUsername(id, {
          username: payload.username.trim(),
          acting_admin_password: payload.acting_admin_password,
        });
      }

      // 3. Governed Actions (B-03): Role Change & Deactivation proposals
      let hasGovernedProposal = false;
      if (payload.systemRole && existingMember?.systemRole && payload.systemRole !== existingMember.systemRole) {
        await accountRequestsApi.create({
          request_type: 'role_change',
          target_user_id: id,
          role: payload.systemRole,
          department: payload.department,
        });
        hasGovernedProposal = true;
        get().addToast(
          'Proposal Submitted',
          `Role tier modification for @${payload.username || existingMember?.username} submitted to Pending Approvals Queue for Supervisor approval.`,
          'success'
        );
      }

      if (payload.is_active === false && existingMember?.is_active) {
        await accountRequestsApi.create({
          request_type: 'deactivate',
          target_user_id: id,
        });
        hasGovernedProposal = true;
        get().addToast(
          'Proposal Submitted',
          `Deactivation request for @${payload.username || existingMember?.username} submitted to Pending Approvals Queue for Supervisor approval.`,
          'success'
        );
      }

      // 4. General Direct Profile Fields (name, email, terminal, status, permissions)
      const updateData: Record<string, any> = {
        full_name: payload.name,
        email: payload.email,
        acting_admin_password: payload.acting_admin_password,
      };
      if (payload.status && payload.status !== 'inactive') {
        updateData.status = payload.status;
      }
      if (payload.custom_permissions !== undefined) {
        updateData.custom_permissions = payload.custom_permissions;
      }
      if (payload.locationId !== undefined) {
        updateData.location_id = payload.locationId;
      }

      if (payload.availability_status !== undefined) {
        await adminApi.updateStaffAvailability(id, {
          availability_status: payload.availability_status,
          availability_note: payload.availability_note ?? null,
        });
      }

      // Persist UI metadata locally
      const key = payload.username?.trim() || existingMember?.username || id;
      try {
        localStorage.setItem(
          `tiketa_staff_meta_${key}`,
          JSON.stringify({
            roleTitle: payload.role,
            department: payload.department,
            primaryLocation: payload.primaryLocation,
          })
        );
      } catch (e) {
        // ignore storage error
      }

      await get().fetchITMembers();
      if (!hasGovernedProposal) {
        get().addToast(
          'Staff Account Updated',
          `Account details for ${payload.name} saved successfully.`,
          'success'
        );
      }
      return true;
    } catch (err: unknown) {
      const msg = extractApiErrorMessage(err, 'Failed to update staff account');
      set({ teamError: msg });
      get().addToast('Account Update Failed', msg, 'warning');
      return false;
    }
  },

  deleteITMemberApi: async (id: string, name?: string) => {
    try {
      await accountRequestsApi.create({
        request_type: 'deactivate',
        target_user_id: id,
      });
      await get().fetchITMembers();
      get().addToast(
        'Deactivation Proposal Submitted',
        `Deactivation request for ${name ?? 'staff member'} submitted. Awaiting supervisor approval.`,
        'success'
      );
      return true;
    } catch (err: unknown) {
      const msg = extractApiErrorMessage(err, 'Failed to submit deactivation request');
      get().addToast('Deactivation Request Failed', msg, 'warning');
      return false;
    }
  },

  deactivateITMemberApi: async (id: string, name?: string) => {
    return get().deleteITMemberApi(id, name);
  },

  fetchEmployees: async () => {
    try {
      const employees = await adminApi.getEmployees({ offset: 0, limit: 100 });
      const mapped: EmployeeProfile[] = employees.map((e) => ({
        id: e.id,
        employee_id: e.employee_id,
        full_name: e.full_name,
        email: e.email,
        company_id: e.company_id,
        company_name: e.company_name || 'Five Star Bus Co.',
        location_id: e.location_id,
        location_name: e.location_name || 'Terminal Hub',
        department_id: e.department_id,
        department_name: e.department_name || 'Department',
        is_active: (e as any).is_active !== false,
      }));
      set({ verifiedEmployeesList: mapped });
    } catch (err: unknown) {
      console.warn('Could not load employees:', err);
    }
  },

  createEmployeeApi: async (payload: EmployeeCreateInput) => {
    try {
      await adminApi.createEmployee(payload);
      await get().fetchEmployees();
      get().addToast(
        'Employee Profile Created',
        `${payload.full_name} (${payload.employee_id}) added to company directory.`,
        'success'
      );
      return true;
    } catch (err: unknown) {
      const msg = extractApiErrorMessage(err, 'Failed to create employee profile in directory');
      get().addToast('Employee Registration Failed', msg, 'warning');
      return false;
    }
  },

  updateEmployeeApi: async (id, payload) => {
    try {
      await adminApi.updateAdminEmployee(id, payload);
      await get().fetchEmployees();
      get().addToast(
        'Employee Profile Updated',
        `Profile for ${payload.full_name || 'employee'} saved successfully.`,
        'success'
      );
      return true;
    } catch (err: unknown) {
      const msg = extractApiErrorMessage(err, 'Failed to update employee profile');
      get().addToast('Update Failed', msg, 'warning');
      return false;
    }
  },

  deleteEmployeeApi: async (id: string, name?: string) => {
    try {
      const existing = get().verifiedEmployeesList.find((e) => e.id === id || e.employee_id === id);
      const targetId = existing?.id || id;
      await adminApi.deactivateAdminEmployee(targetId, existing as any);
      await get().fetchEmployees();
      get().addToast(
        'Employee Profile Deactivated',
        `${name ?? existing?.full_name ?? id} deactivated. Historical job logs preserved.`,
        'info'
      );
      return true;
    } catch (err: unknown) {
      const msg = extractApiErrorMessage(err, 'Failed to deactivate employee profile');
      get().addToast('Deactivation Failed', msg, 'warning');
      return false;
    }
  },

  deactivateEmployeeApi: async (id: string, name?: string) => {
    return get().deleteEmployeeApi(id, name);
  },

  // Backward compatibility handlers
  createITMember: (memberData) => {
    get().createITMemberApi({
      username: memberData.username || memberData.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_.-]/g, ''),
      email: memberData.email,
      full_name: memberData.name,
      role: memberData.role === 'Admin' ? 'admin' : 'it',
      password: memberData.password || 'Tiketa2026!Pass',
    });
  },

  deleteITMember: (id) => {
    get().deleteITMemberApi(id);
  },

  createEmployee: (empData) => {
    get().createEmployeeApi({
      employee_id: empData.employee_id,
      full_name: empData.full_name,
      email: empData.email,
      company_id: empData.company_id,
      location_id: empData.location_id,
      department_id: empData.department_id,
    });
  },

  deleteEmployee: (employeeId) => {
    get().deleteEmployeeApi(employeeId);
  },
});
