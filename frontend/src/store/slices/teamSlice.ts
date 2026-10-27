// @spec BF-08: IT accounts, employee directory profiles & server dictionaries
import type { AppSliceCreator } from '../types';
import type { TeamMember, TeamRole, TeamMemberStatus } from '../../types/team';
import type { EmployeeProfile } from '../../types';
import {
  adminApi,
  extractApiErrorMessage,
  BackendUser,
  UserCreateInput,
  EmployeeCreateInput,
  DictionariesResponse,
} from '../../api/client';

export interface TeamSlice {
  itTeamMembers: TeamMember[];
  verifiedEmployeesList: EmployeeProfile[];
  serverDictionaries: DictionariesResponse | null;
  isLoadingTeam: boolean;
  teamError: string | null;

  fetchITMembers: () => Promise<void>;
  createITMemberApi: (payload: UserCreateInput) => Promise<boolean>;
  deleteITMemberApi: (id: string, name?: string) => Promise<boolean>;

  fetchEmployees: () => Promise<void>;
  createEmployeeApi: (payload: EmployeeCreateInput) => Promise<boolean>;
  deleteEmployeeApi: (id: string, name?: string) => Promise<boolean>;

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
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
      u.username
    )}&backgroundColor=${isAdm ? 'fed7aa' : 'b6e3f4'}`,
    department: dept,
    status: u.is_active ? 'active' : 'offline',
    primaryLocation: locationName,
    ticketsClosed: u.closed_repairs ?? 0,
    activeTickets: u.active_bench ?? 0,
    flameScore: 0,
    is_active: u.is_active,
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
    set({ isLoadingTeam: true, teamError: null });
    try {
      const dicts = get().serverDictionaries;
      const users = await adminApi.getUsers({ offset: 0, limit: 100 });
      const mapped = users.map((u) => mapBackendUserToTeamMember(u, dicts));
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

  deleteITMemberApi: async (id: string, name?: string) => {
    try {
      await adminApi.updateUser(id, { is_active: false });
      await get().fetchITMembers();
      get().addToast(
        'Account Deactivated',
        `${name ?? 'Specialist'} account marked inactive.`,
        'info'
      );
      return true;
    } catch (err: unknown) {
      const msg = extractApiErrorMessage(err, 'Failed to deactivate account');
      get().addToast('Deactivation Failed', msg, 'warning');
      return false;
    }
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

  deleteEmployeeApi: async (id: string, name?: string) => {
    try {
      get().addToast('Employee Removed', `${name ?? id} removed from view.`, 'info');
      set((state) => ({
        verifiedEmployeesList: state.verifiedEmployeesList.filter((e) => e.id !== id),
      }));
      return true;
    } catch (err: unknown) {
      return false;
    }
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
