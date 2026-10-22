import type { AppSliceCreator } from '../types';
import type { TeamMember, TeamRole, TeamMemberStatus } from '../../types/team';
import type { EmployeeProfile } from '../../types';

export interface TeamSlice {
  itTeamMembers: TeamMember[];
  createITMember: (member: {
    name: string;
    email: string;
    role: TeamRole;
    department: string;
    status: TeamMemberStatus;
    primaryLocation: string;
  }) => void;
  deleteITMember: (id: string) => void;

  verifiedEmployeesList: EmployeeProfile[];
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

  verifiedEmployeesList: [],
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
