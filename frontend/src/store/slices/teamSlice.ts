// @spec BF-08: IT accounts, employee directory profiles & server dictionaries
import type { AppSliceCreator } from '../types';
import type { TeamMember, TeamRole, TeamMemberStatus } from '../../types/team';
import type { EmployeeProfile } from '../../types';
import {
  directoryApi,
  ServerDictionaries,
  AdminUserItem,
  AdminEmployeeItem,
} from '../../api/client';
import { normalizeApiError } from '../../utils/errorUtils';

export interface TeamSlice {
  itTeamMembers: TeamMember[];
  verifiedEmployeesList: EmployeeProfile[];
  serverDictionaries: ServerDictionaries | null;
  isLoadingTeam: boolean;
  teamError: string | null;

  fetchDictionariesApi: () => Promise<void>;
  fetchTeamDataApi: () => Promise<void>;
  createITMemberApi: (member: {
    username: string;
    email: string;
    full_name: string;
    role: 'it' | 'admin';
    password: string;
  }) => Promise<boolean>;
  createEmployeeApi: (emp: {
    employee_id: string;
    full_name: string;
    email: string;
    company_id: string;
    location_id: string;
    department_id: string;
  }) => Promise<boolean>;

  // Synchronous / local convenience actions
  createITMember: (member: {
    name: string;
    email: string;
    role: TeamRole;
    department: string;
    status: TeamMemberStatus;
    primaryLocation: string;
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

function mapUserToMember(user: AdminUserItem): TeamMember {
  return {
    id: user.id,
    name: user.full_name,
    email: user.email,
    role: user.role === 'admin' ? 'Admin' : 'Field Technician',
    department:
      user.role === 'admin'
        ? 'IT Administration & Governance'
        : 'Terminal Operations & PMS',
    status: user.is_active ? 'active' : 'offline',
    primaryLocation: 'Pasay Terminal (PSY)',
    ticketsClosed: 0,
    activeTickets: 0,
    flameScore: 25,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
      user.username
    )}&backgroundColor=b6e3f4`,
  };
}

function mapEmployeeToProfile(emp: AdminEmployeeItem): EmployeeProfile {
  return {
    id: emp.id,
    employee_id: emp.employee_id,
    full_name: emp.full_name,
    email: emp.email,
    company_id: emp.company_id,
    company_name: emp.company_name || 'Pangasinan Five Star Bus Co.',
    location_id: emp.location_id,
    location_name: emp.location_name || 'Pasay Terminal',
    department_id: emp.department_id,
    department_name: emp.department_name || 'Terminal Operations',
  };
}

export const createTeamSlice: AppSliceCreator<TeamSlice> = (set, get) => ({
  itTeamMembers: [
    {
      id: 'tm-1',
      name: 'Stephen I. Miralles',
      email: 's.miralles@fivestar.com.ph',
      role: 'Senior Analyst',
      department: 'IT Infrastructure & Server Ops',
      status: 'active',
      primaryLocation: 'Pasay Terminal (PSY)',
      ticketsClosed: 41,
      activeTickets: 2,
      flameScore: 28,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=William&backgroundColor=b6e3f4',
    },
    {
      id: 'tm-2',
      name: 'Nathaniel D. Esguerra',
      email: 'n.esguerra@fivestar.com.ph',
      role: 'Field Technician',
      department: 'Terminal Operations & PMS',
      status: 'active',
      primaryLocation: 'Caloocan Terminal (CAL)',
      ticketsClosed: 34,
      activeTickets: 3,
      flameScore: 24,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Edward&backgroundColor=c0aede',
    },
  ],
  verifiedEmployeesList: [
    {
      id: 'emp-1042',
      employee_id: 'FS-1042',
      full_name: 'Maria Santos',
      email: 'm.santos@transit.ph',
      company_id: 'FS',
      company_name: 'Pangasinan Five Star Bus Co.',
      location_id: 'PSY',
      location_name: 'Pasay Terminal',
      department_id: 'CASH',
      department_name: 'Cashiering & Revenue',
    },
    {
      id: 'emp-1088',
      employee_id: 'FS-1088',
      full_name: 'Juan Dela Cruz',
      email: 'j.delacruz@transit.ph',
      company_id: 'FS',
      company_name: 'Pangasinan Five Star Bus Co.',
      location_id: 'CAL',
      location_name: 'Caloocan Terminal',
      department_id: 'OPS',
      department_name: 'Operations & Dispatch',
    },
  ],
  serverDictionaries: null,
  isLoadingTeam: false,
  teamError: null,

  fetchDictionariesApi: async () => {
    try {
      const data = await directoryApi.getDictionaries();
      set({ serverDictionaries: data });
    } catch {
      // Dictionaries fallback to client constants if offline
    }
  },

  fetchTeamDataApi: async () => {
    set({ isLoadingTeam: true, teamError: null });
    try {
      const [users, employees] = await Promise.all([
        directoryApi.getAdminUsers({ limit: 100 }),
        directoryApi.getAdminEmployees({ limit: 100 }),
      ]);

      set((state) => ({
        isLoadingTeam: false,
        itTeamMembers: users.length > 0 ? users.map(mapUserToMember) : state.itTeamMembers,
        verifiedEmployeesList:
          employees.length > 0
            ? employees.map(mapEmployeeToProfile)
            : state.verifiedEmployeesList,
      }));
    } catch (err: unknown) {
      const msg = normalizeApiError(err, 'Failed to sync team and employee directory');
      set({ isLoadingTeam: false, teamError: msg });
    }
  },

  createITMemberApi: async (memberData) => {
    try {
      const created = await directoryApi.createAdminUser(memberData);
      const mapped = mapUserToMember(created);
      set((state) => ({
        itTeamMembers: [mapped, ...state.itTeamMembers.filter((m) => m.id !== mapped.id)],
      }));
      get().addToast(
        'Account Created',
        `Provisioned ${memberData.role.toUpperCase()} staff account for ${created.full_name} (${created.username}).`,
        'success'
      );
      await get().fetchTeamDataApi();
      return true;
    } catch (err: unknown) {
      const msg = normalizeApiError(err, 'Failed to create IT support account');
      get().addToast('Account Creation Failed', msg, 'warning');
      return false;
    }
  },

  createEmployeeApi: async (empData) => {
    try {
      const created = await directoryApi.createAdminEmployee({
        ...empData,
        is_active: true,
      });
      const mapped = mapEmployeeToProfile(created);
      set((state) => ({
        verifiedEmployeesList: [
          mapped,
          ...state.verifiedEmployeesList.filter((e) => e.employee_id !== mapped.employee_id),
        ],
      }));
      get().addToast(
        'Profile Saved',
        `Registered ${created.full_name} (${created.employee_id}) in company directory.`,
        'success'
      );
      await get().fetchTeamDataApi();
      return true;
    } catch (err: unknown) {
      const msg = normalizeApiError(err, 'Failed to create employee profile');
      get().addToast('Employee Registration Failed', msg, 'warning');
      return false;
    }
  },

  createITMember: (memberData) => {
    const newMember: TeamMember = {
      id: 'tm-' + Date.now(),
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
        memberData.name
      )}&backgroundColor=b6e3f4`,
      ticketsClosed: 0,
      activeTickets: 0,
      flameScore: 10,
      ...memberData,
    };
    set((state) => ({
      itTeamMembers: [newMember, ...state.itTeamMembers],
    }));
    get().addToast(
      'IT Specialist Account Created',
      `${newMember.name} added to Five Star IT staff.`,
      'success'
    );
  },

  deleteITMember: (id) => {
    const member = get().itTeamMembers.find((m) => m.id === id);
    set((state) => ({
      itTeamMembers: state.itTeamMembers.filter((m) => m.id !== id),
    }));
    get().addToast(
      'Account Removed',
      `${member?.name ?? 'Specialist'} removed from active IT staff.`,
      'info'
    );
  },

  createEmployee: (empData) => {
    const newEmp: EmployeeProfile = {
      id: 'emp-' + Date.now(),
      ...empData,
    };
    set((state) => ({
      verifiedEmployeesList: [newEmp, ...state.verifiedEmployeesList],
    }));
    get().addToast(
      'Employee Profile Created',
      `${newEmp.full_name} (${newEmp.employee_id}) added to company directory.`,
      'success'
    );
  },

  deleteEmployee: (employeeId) => {
    set((state) => ({
      verifiedEmployeesList: state.verifiedEmployeesList.filter(
        (e) => e.employee_id !== employeeId
      ),
    }));
    get().addToast(
      'Employee Removed',
      `Employee ID ${employeeId} removed from directory.`,
      'info'
    );
  },
});
