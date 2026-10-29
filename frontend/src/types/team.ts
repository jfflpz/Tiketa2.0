// @spec UI-TEAM-01: Team, Roles, and Dispatch Models (Matching Reference Screenshot)
export type SystemRole = 'intern' | 'it' | 'admin' | 'supervisor';

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

  export interface AccountRequest {
    id: string;
    username: string;
    email: string;
    full_name: string;
    role: 'intern' | 'it';
    department?: string | null;
    location_id?: string | null;
    location_name?: string | null;
    status: 'pending' | 'approved' | 'rejected';
    rejection_reason?: string | null;
    requested_by_id: string;
    requester_name?: string | null;
    reviewed_by_id?: string | null;
    reviewer_name?: string | null;
    reviewed_at?: string | null;
    created_at: string;
  }