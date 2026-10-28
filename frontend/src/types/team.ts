// @spec UI-TEAM-01: Team, Roles, and Dispatch Models (Matching Reference Screenshot)

export type StaffRole = 'intern' | 'it' | 'supervisor' | 'admin' | 'analyst';

export type TeamMemberStatus = 'active' | 'away' | 'offline' | 'pending';

export type TeamRole =
  | 'Owner'
  | 'Admin'
  | 'Senior Analyst'
  | 'Field Technician'
  | 'Hardware Specialist'
  | 'Network Engineer'
  | 'Devops'
  | 'Helpdesk Dispatch';

export interface TeamMember {
  id: string;
  name: string;
  username?: string;
  email: string;
  role: TeamRole;
  systemRole?: StaffRole;
  avatar: string;
  department: string;
  status: TeamMemberStatus;
  primaryLocation: string;
  ticketsClosed: number;
  activeTickets: number;
  flameScore: number;
  is_active?: boolean;
}

export interface WorkflowActivityItem {
  id: string;
  no: string; // 001, 002, etc.
  name: string;
  category: string;
  iconBg: string;
  trigger: 'Webhook' | 'Schedule' | 'Manual';
  runs: number;
  successRate: number;
  creator: {
    name: string;
    avatar: string;
    role: string;
  };
}

export interface TopContributor {
  id: string;
  rank: number;
  name: string;
  role: string;
  department: string;
  flameCount: number;
  avatar: string;
  medal?: 'gold' | 'silver' | 'bronze';
}
