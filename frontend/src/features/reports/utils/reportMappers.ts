import type {
  MonthlySlaRow,
  StaffUtilizationRow,
  DeptDemandRow,
  AgingBacklogRow,
  TransitLagRow,
  HardwareVulnerabilityRow,
  PmsComplianceRow,
  ChronicRequestorRow,
} from '../types/reportSchemas';

type RawRow = Record<string, unknown>;

export function mapMonthlySlaRows(rows: unknown[]): MonthlySlaRow[] {
  return (rows as RawRow[]).map((r) => ({
    month: String(r.month || 'Current Month'),
    totalRequests: Number(r.total_tickets ?? r.totalRequests ?? 0),
    completed: Number(r.completed ?? 0),
    pending: Number(r.active_tickets ?? r.pending ?? 0),
    completionRate: r.completion_rate_pct != null ? Number(r.completion_rate_pct) : (r.completionRate != null ? Number(r.completionRate) : null),
    remoteMode: Number(r.remote ?? r.remoteMode ?? 0),
    siteMode: Number(r.site ?? r.siteMode ?? 0),
    avgResolutionHours: r.avg_labor_hours != null ? Number(r.avg_labor_hours) : (r.avgResolutionHours != null ? Number(r.avgResolutionHours) : null),
    sameDayResolutionRate: r.same_day_resolution_pct != null ? Number(r.same_day_resolution_pct) : (r.sameDayResolutionRate != null ? Number(r.sameDayResolutionRate) : null),
    slaComplianceRate: r.sla_compliance_pct != null ? Number(r.sla_compliance_pct) : null,
  }));
}

export function mapStaffUtilizationRows(rows: unknown[]): StaffUtilizationRow[] {
  return (rows as RawRow[]).map((r) => ({
    technician: String(r.technician || 'IT Specialist'),
    totalAssigned: Number(r.total_assigned ?? r.totalAssigned ?? 0),
    completed: Number(r.completed ?? 0),
    pending: Number(r.pending ?? 0),
    totalHoursLogged: Number(r.total_hours ?? r.totalHoursLogged ?? 0),
    avgTimePerTask: r.avg_hours != null ? Number(r.avg_hours) : (r.avgTimePerTask != null ? Number(r.avgTimePerTask) : null),
    primaryLocation: String(r.primary_location || r.primaryLocation || 'Depot'),
    mostFrequentTask: String(r.most_frequent_task || r.mostFrequentTask || 'General Support'),
  }));
}

export function mapDeptDemandRows(rows: unknown[]): DeptDemandRow[] {
  return (rows as RawRow[]).map((r) => ({
    company: String(r.company || 'Five Star Bus Co.'),
    department: String(r.department || 'Operations'),
    location: String(r.location || 'Pasay Terminal'),
    totalTickets: Number(r.total_tickets ?? r.totalTickets ?? 0),
    totalHoursConsumed: Number(r.total_hours ?? r.totalHoursConsumed ?? 0),
    topRequestor: String(r.top_requester || r.topRequestor || 'Terminal Staff'),
    primaryTask: String(r.primary_issue || r.primaryTask || 'Printer Troubleshoot'),
  }));
}

export function mapAgingBacklogRows(rows: unknown[]): AgingBacklogRow[] {
  return (rows as RawRow[]).map((r) => ({
    dateStarted: String(r.date_started || r.dateStarted || ''),
    daysOpen: Number(r.days_open ?? r.daysOpen ?? 0),
    companyDept:
      r.company && r.department
        ? `${r.company} • ${r.department}`
        : String(r.companyDept || 'Five Star'),
    requestor: String(r.requester || r.requestor || 'Staff'),
    taskDescription: String(r.description || r.taskDescription || r.task || 'Support Issue'),
    location: String(r.location || 'Pasay Terminal'),
    workedBy: String(r.technician || r.workedBy || 'Unassigned'),
    status: String(r.status || 'OPEN'),
  }));
}

export function mapTransitLagRows(rows: unknown[]): TransitLagRow[] {
  return (rows as RawRow[]).map((r) => ({
    location: String(r.location || 'Terminal'),
    supportMode: String(r.mode || r.supportMode || 'SITE'),
    completedTickets: Number(r.completed ?? r.completedTickets ?? 0),
    meanLaborMins: r.mean_labor_minutes != null ? Number(r.mean_labor_minutes) : (r.meanLaborMins != null ? Number(r.meanLaborMins) : null),
    meanTurnaroundDays: r.mean_turnaround_days != null ? Number(r.mean_turnaround_days) : (r.meanTurnaroundDays != null ? Number(r.meanTurnaroundDays) : null),
    meanTransitLagDays: r.mean_transit_lag_days != null ? Number(r.mean_transit_lag_days) : (r.meanTransitLagDays != null ? Number(r.meanTransitLagDays) : null),
    lagToLaborRatio: r.lag_to_labor_ratio != null ? Number(r.lag_to_labor_ratio) : (r.lagToLaborRatio != null ? Number(r.lagToLaborRatio) : null),
    dataReviewRequired: Boolean(r.data_review_required),
    recommendedAction: String(r.recommended_action || r.recommendedAction || 'Normal'),
  }));
}

export function mapHardwareVulnerabilityRows(rows: unknown[]): HardwareVulnerabilityRow[] {
  return (rows as RawRow[]).map((r) => ({
    location: String(r.location || 'Terminal'),
    company: String(r.company || 'Five Star Bus Co.'),
    topFailureTask: String(r.task || r.topFailureTask || 'Printer Troubleshoot'),
    incidentsLogged: Number(r.incidents ?? r.incidentsLogged ?? 0),
    laborHours: Number(r.labor_hours ?? r.laborHours ?? 0),
    severityRiskScore: Number(r.severity_score ?? r.severityRiskScore ?? 0),
    stagingRecommendation: String(r.recommendation || r.stagingRecommendation || 'Monitor'),
  }));
}

export function mapPmsComplianceRows(rows: unknown[]): PmsComplianceRow[] {
  return (rows as RawRow[]).map((r) => {
    const rawCoverage = r.coverage_pct != null ? Number(r.coverage_pct) : (r.complianceRate != null ? Number(r.complianceRate) : null);
    const validStatus = (['compliant', 'due', 'overdue', 'critical', 'unplanned', 'company-filtered'] as const)
      .find((s) => s === String(r.status || '').toLowerCase()) || 'due';

    return {
      terminalLocation: String(r.location || r.location_id || r.terminalLocation || 'Pasay'),
      department: String(r.department || r.department_id || r.department || 'Operations'),
      expectedServices: r.expected_services != null ? Number(r.expected_services) : null,
      pmsConducted: Number(r.completed_services ?? r.pmsConducted ?? 0),
      complianceRate: rawCoverage,
      lastCompletedDate: r.last_completed ? String(r.last_completed) : (r.lastCompletedDate ? String(r.lastCompletedDate) : null),
      servicedBy: r.serviced_by ? String(r.serviced_by) : (r.servicedBy ? String(r.servicedBy) : null),
      status: validStatus,
    };
  });
}

export function mapChronicRequestorRows(rows: unknown[]): ChronicRequestorRow[] {
  return (rows as RawRow[]).map((r) => ({
    requestorName: String(r.requester || r.requestorName || 'Terminal Staff'),
    department: String(r.department || 'Operations'),
    location: String(r.location || 'Pasay Terminal'),
    repeatIncidents: Number(r.repeat_incidents ?? (Number(r.total_tickets ?? 1) - 1)),
    dominantTask: String(r.dominant_task || r.dominantTask || 'PRN-TS'),
    remoteResolutionRate: r.remote_resolution_pct != null ? Number(r.remote_resolution_pct) : null,
    sopTrainingTarget: String(
      r.training_suggestion || r.sop_training || r.sopTrainingTarget || 'Peripheral handling'
    ),
  }));
}
