import React from 'react';
import {
  Calendar,
  Users,
  Building2,
  Clock,
  Truck,
  Wrench,
  CheckSquare,
  AlertTriangle,
} from 'lucide-react';

export interface MonthlySlaRow {
  month: string;
  totalRequests: number;
  completed: number;
  pending: number;
  completionRate: number | null;
  remoteMode: number;
  siteMode: number;
  avgResolutionHours: number | null;
  sameDayResolutionRate: number | null;
  slaComplianceRate: number | null;
}

export interface StaffUtilizationRow {
  technician: string;
  totalAssigned: number;
  completed: number;
  pending: number;
  totalHoursLogged: number;
  avgTimePerTask: number | null;
  primaryLocation: string;
  mostFrequentTask: string;
}

export interface DeptDemandRow {
  company: string;
  department: string;
  location: string;
  totalTickets: number;
  totalHoursConsumed: number;
  topRequestor: string;
  primaryTask: string;
}

export interface AgingBacklogRow {
  dateStarted: string;
  daysOpen: number;
  companyDept: string;
  requestor: string;
  taskDescription: string;
  location: string;
  workedBy: string;
  status: string;
}

export interface TransitLagRow {
  location: string;
  supportMode: string;
  completedTickets: number;
  meanLaborMins: number | null;
  meanTurnaroundDays: number | null;
  meanTransitLagDays: number | null;
  lagToLaborRatio: number | null;
  dataReviewRequired: boolean;
  recommendedAction: string;
}

export interface HardwareVulnerabilityRow {
  location: string;
  company: string;
  topFailureTask: string;
  incidentsLogged: number;
  laborHours: number;
  severityRiskScore: number;
  stagingRecommendation: string;
}

export interface PmsComplianceRow {
  terminalLocation: string;
  department: string;
  expectedServices: number | null;
  pmsConducted: number;
  complianceRate: number | null;
  lastCompletedDate: string | null;
  servicedBy: string | null;
  status: 'compliant' | 'due' | 'overdue' | 'critical' | 'unplanned' | 'company-filtered';
}

export interface ChronicRequestorRow {
  requestorName: string;
  department: string;
  location: string;
  repeatIncidents: number;
  dominantTask: string;
  remoteResolutionRate: number | null;
  sopTrainingTarget: string;
}

export interface ReportMeta {
  id: number;
  code: string;
  title: string;
  shortTitle: string;
  icon: React.ElementType;
  description: string;
}

export const REPORT_TABS: ReportMeta[] = [
  {
    id: 1,
    code: 'FR-REPT-01',
    title: '1. Monthly SLA & Volume Summary',
    shortTitle: 'Monthly SLA',
    icon: Calendar,
    description: 'Volume throughput, remote vs. on-site ratios, and same-day resolution compliance across months.',
  },
  {
    id: 2,
    code: 'FR-REPT-02',
    title: '2. Staff Utilization & Labor Efficiency',
    shortTitle: 'Staff Labor',
    icon: Users,
    description: 'Assigned vs. completed ticket yields, total labor hours logged, and dominant task specializations per technician.',
  },
  {
    id: 3,
    code: 'FR-REPT-03',
    title: '3. Department & Fleet Demand Breakdown',
    shortTitle: 'Dept Demand',
    icon: Building2,
    description: 'Incident ticket density and labor consumption across 13 operating departments in Five Star and partner transit fleets.',
  },
  {
    id: 4,
    code: 'FR-REPT-04',
    title: '4. Critical Aging Backlog (>48h SLA)',
    shortTitle: 'Aging Backlog',
    icon: Clock,
    description: 'Tickets exceeding the 48-hour SLA resolution threshold requiring immediate supervisor intervention or spare parts.',
  },
  {
    id: 5,
    code: 'FR-REPT-05',
    title: '5. Logistical Transit Lag Disaggregation',
    shortTitle: 'Transit Lag',
    icon: Truck,
    description: 'Separates courier inter-station transit delay from true hands-on technician labor to isolate supply chain bottlenecks.',
  },
  {
    id: 6,
    code: 'FR-REPT-06',
    title: '6. Hardware Vulnerability & Failure Hotspots',
    shortTitle: 'Hardware Hotspots',
    icon: Wrench,
    description: 'Frequency of hardware breakdowns, downtime hours, and severity risk scores per terminal station and equipment type.',
  },
  {
    id: 7,
    code: 'FR-REPT-07',
    title: '7. Fleet PMS Compliance Audit',
    shortTitle: 'PMS Compliance',
    icon: CheckSquare,
    description: 'Quarterly preventative maintenance adherence across 15 terminal stations and POS cashier workstations.',
  },
  {
    id: 8,
    code: 'FR-REPT-08',
    title: '8. Chronic Repeat Requestor Index',
    shortTitle: 'Repeat Requestors',
    icon: AlertTriangle,
    description: 'Employees with recurring trouble tickets, identifying candidates for targeted SOP training or user-error mitigation.',
  },
];

export const REPORT_SLUGS: Record<number, string> = {
  1: 'monthly-sla',
  2: 'staff-productivity',
  3: 'department-demand',
  4: 'backlog-exception',
  5: 'transit-lag',
  6: 'hardware-vulnerability',
  7: 'pms-compliance',
  8: 'chronic-requestors',
};
