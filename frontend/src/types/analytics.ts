// @spec SR-02: 8 Standardized Executive Reports & KPI Metric Types
// @spec FR-REPT-01..08: Report schemas

export interface MonthlySlaReportRow {
  month: string;
  totalRequests: number;
  completed: number;
  pending: number;
  completionRate: number;
  remoteMode: number;
  siteMode: number;
  avgResolutionHours: number;
  sameDayResolutionRate: number;
}

export interface StaffUtilizationReportRow {
  technician: string;
  totalAssigned: number;
  completed: number;
  pending: number;
  totalHoursLogged: number;
  avgTimePerTask: number;
  primaryLocation: string;
  mostFrequentTask: string;
}

export interface DepartmentDemandReportRow {
  company: string;
  department: string;
  location: string;
  totalTickets: number;
  totalHoursConsumed: number;
  topRequestor: string;
  primaryTask: string;
}

export interface AgingBacklogReportRow {
  dateStarted: string;
  daysOpen: number;
  companyDept: string;
  requestor: string;
  taskDescription: string;
  location: string;
  workedBy: string;
  status: string;
}

export interface TransitLagReportRow {
  location: string;
  supportMode: string;
  completedTickets: number;
  meanLaborMins: number;
  meanTurnaroundDays: number;
  meanTransitLagDays: number;
  lagToLaborRatio: number;
  recommendedAction: string;
}

export interface HardwareVulnerabilityRow {
  location: string;
  company: string;
  topFailureTask: string;
  incidentsLogged: number;
  totalDownTimeHours: number;
  severityRiskScore: number;
  stagingRecommendation: string;
}

export interface PmsComplianceRow {
  terminalLocation: string;
  department: string;
  totalDevices: number;
  pmsConducted: number;
  complianceRate: number;
  lastCompletedDate: string;
  servicedBy: string;
  status: 'Compliant' | 'Due' | 'Critical Overdue';
}

export interface ChronicRequestorRow {
  requestorName: string;
  department: string;
  location: string;
  repeatIncidents: number;
  dominantTask: string;
  remoteResolutionRate: number;
  sopTrainingTarget: string;
}
