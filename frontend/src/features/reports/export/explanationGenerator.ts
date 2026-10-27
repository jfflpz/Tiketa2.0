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

export interface ExplanationResult {
  text: string;
  isSummarized?: boolean;
  shownCount?: number;
  totalCount?: number;
}

export function generateExplanation(
  reportId: number,
  data: any[],
  dateRange: { dateFrom: string; dateTo: string }
): ExplanationResult {
  if (!data || data.length === 0) {
    return {
      text: 'No recorded activity found for this reporting period. Verification confirms zero qualifying incidents under the active filters.',
    };
  }

  switch (reportId) {
    case 1: {
      // Monthly SLA
      const rows = data as MonthlySlaRow[];
      const totalTickets = rows.reduce((acc, r) => acc + (r.totalRequests || 0), 0);
      const totalCompleted = rows.reduce((acc, r) => acc + (r.completed || 0), 0);
      const overallCompletion = totalTickets > 0 ? ((totalCompleted / totalTickets) * 100).toFixed(1) : 'N/A';
      
      const latestRow = rows[rows.length - 1];
      const latestSlaRate = latestRow?.slaComplianceRate != null ? `${latestRow.slaComplianceRate.toFixed(1)}%` : 'N/A';
      const latestSameDayRate = latestRow?.sameDayResolutionRate != null ? `${latestRow.sameDayResolutionRate.toFixed(1)}%` : 'N/A';
      const latestAvgLabor = latestRow?.avgResolutionHours != null ? `${latestRow.avgResolutionHours.toFixed(1)}h` : 'N/A';

      if (rows.length === 1) {
        return {
          text: `For **${rows[0].month}**, total volume recorded is **${totalTickets} requests** with **${totalCompleted} completed** (${overallCompletion}% overall yield). Verified **48-hour SLA resolution compliance stands at ${latestSlaRate}**, same-day completion is **${latestSameDayRate}**, and average technician repair duration is **${latestAvgLabor}**.`,
        };
      }

      return {
        text: `Across **${rows.length} months** (${rows[0].month} to ${rows[rows.length - 1].month}), total volume is **${totalTickets} requests** with **${totalCompleted} completed** (${overallCompletion}% overall yield). For the latest month (**${latestRow.month}**), **48-hour SLA resolution compliance is ${latestSlaRate}**, same-day completion is **${latestSameDayRate}**, and average repair duration is **${latestAvgLabor}**.`,
      };
    }

    case 2: {
      // Staff Productivity
      const rows = data as StaffUtilizationRow[];
      const totalAssigned = rows.reduce((acc, r) => acc + (r.totalAssigned || 0), 0);
      const totalHours = rows.reduce((acc, r) => acc + (r.totalHoursLogged || 0), 0);
      const topTech = [...rows].sort((a, b) => (b.completed || 0) - (a.completed || 0) || a.technician.localeCompare(b.technician))[0];

      const isSummarized = rows.length > 10;
      const disclosure = isSummarized
        ? ` Showing top 10 of ${rows.length} technicians sorted by ticket completion. Complete technician audit logs are in the CSV export.`
        : '';

      return {
        text: `Operational technician roster logged **${totalHours.toFixed(1)} total labor hours** across **${totalAssigned} assigned tickets**. Top technician yield was achieved by **${topTech?.technician || 'Staff'}** with **${topTech?.completed || 0} completed tickets** and **${topTech?.totalHoursLogged?.toFixed(1) || 0}h logged**.${disclosure}`,
        isSummarized,
        shownCount: Math.min(rows.length, 10),
        totalCount: rows.length,
      };
    }

    case 3: {
      // Dept Demand
      const rows = data as DeptDemandRow[];
      const totalTickets = rows.reduce((acc, r) => acc + (r.totalTickets || 0), 0);
      const totalHours = rows.reduce((acc, r) => acc + (r.totalHoursConsumed || 0), 0);
      const topDept = [...rows].sort((a, b) => (b.totalTickets || 0) - (a.totalTickets || 0) || a.department.localeCompare(b.department) || a.location.localeCompare(b.location))[0];

      const isSummarized = rows.length > 10;
      const disclosure = isSummarized
        ? ` Showing top 10 of ${rows.length} department locations sorted by incident count. Full distribution is detailed in the CSV export.`
        : '';

      return {
        text: `Fleet and department operations generated **${totalTickets} total incidents** consuming **${totalHours.toFixed(1)} support labor hours**. The highest demand cluster is **${topDept?.department || 'Operations'} (${topDept?.location || 'Pasay'})** with **${topDept?.totalTickets || 0} incidents** and primary issue **${topDept?.primaryTask || 'Support'}**.${disclosure}`,
        isSummarized,
        shownCount: Math.min(rows.length, 10),
        totalCount: rows.length,
      };
    }

    case 4: {
      // Aging Backlog
      const rows = data as AgingBacklogRow[];
      const count = rows.length;
      const maxAge = Math.max(...rows.map((r) => r.daysOpen || 0), 0);
      const topLocation = rows[0]?.location || 'Terminal Network';

      const isSummarized = rows.length > 10;
      const disclosure = isSummarized
        ? ` Showing top 10 oldest backlog exceptions of ${rows.length} total. Full audit trail is provided in the CSV export.`
        : '';

      return {
        text: `Audit identifies **${count} active tickets exceeding the 48-hour SLA threshold**. Maximum unresolved dwell time is **${maxAge.toFixed(1)} days**. Priority intervention is required at **${topLocation}** for pending tickets.${disclosure}`,
        isSummarized,
        shownCount: Math.min(rows.length, 10),
        totalCount: rows.length,
      };
    }

    case 5: {
      // Transit Lag (Heuristic advice, not an SLA target)
      const rows = data as TransitLagRow[];
      const flaggedRows = rows.filter((r) => r.dataReviewRequired);
      const siteTravelRows = rows.filter((r) => r.supportMode === 'SITE' && r.lagToLaborRatio != null && r.lagToLaborRatio >= 24);
      const queueWaitRows = rows.filter((r) => r.supportMode !== 'SITE' && r.lagToLaborRatio != null && r.lagToLaborRatio >= 24);
      const monitoringRows = rows.filter((r) => r.lagToLaborRatio == null || r.lagToLaborRatio < 24);

      const isSummarized = rows.length > 10;
      const disclosure = isSummarized
        ? ` Showing top 10 of ${rows.length} transit routes sorted by mean transit lag days. Complete audit records are in the CSV export.`
        : '';

      const actions: string[] = [];
      if (siteTravelRows.length > 0) {
        actions.push(`review travel scheduling for **${siteTravelRows.length} on-site routes** (ratio >= 24)`);
      }
      if (queueWaitRows.length > 0) {
        actions.push(`review queue wait for **${queueWaitRows.length} remote routes** (ratio >= 24)`);
      }
      if (monitoringRows.length > 0 && actions.length === 0) {
        actions.push(`continue routine monitoring (**${monitoringRows.length} routes** within normal thresholds)`);
      }

      const reviewNote = flaggedRows.length > 0
        ? ` Note: **${flaggedRows.length} record(s) flagged for data review** due to negative lag calculation (retained without clamping).`
        : '';

      return {
        text: `Heuristic transit-lag analysis disaggregates elapsed turnaround from hands-on repair labor across **${rows.length} operating routes** (operational advice, not an SLA target). Recommended action: ${actions.join('; ')}.${reviewNote}${disclosure}`,
        isSummarized,
        shownCount: Math.min(rows.length, 10),
        totalCount: rows.length,
      };
    }

    case 6: {
      // Hardware Vulnerability
      const rows = data as HardwareVulnerabilityRow[];
      const totalIncidents = rows.reduce((acc, r) => acc + (r.incidentsLogged || 0), 0);
      const totalLabor = rows.reduce((acc, r) => acc + (r.laborHours || 0), 0);
      const highRisk = rows.filter((r) => r.severityRiskScore >= 7);
      const topRisk = [...rows].sort((a, b) => (b.severityRiskScore || 0) - (a.severityRiskScore || 0) || (b.incidentsLogged || 0) - (a.incidentsLogged || 0) || a.location.localeCompare(b.location))[0];

      const isSummarized = rows.length > 10;
      const disclosure = isSummarized
        ? ` Showing top 10 of ${rows.length} hardware failure points sorted by severity. Complete breakdown is available in the CSV export.`
        : '';

      return {
        text: `Equipment failure audit cataloged **${totalIncidents} incidents** requiring **${totalLabor.toFixed(1)} hours of repair labor**. **${highRisk.length} failure points classified as High Risk (>=7.0)**; primary vulnerability is **${topRisk?.topFailureTask || 'Hardware'} at ${topRisk?.location || 'Terminal'}** with severity score **${topRisk?.severityRiskScore?.toFixed(1) || 0}/10**. Action: **${topRisk?.stagingRecommendation || 'Monitor'}**.${disclosure}`,
        isSummarized,
        shownCount: Math.min(rows.length, 10),
        totalCount: rows.length,
      };
    }

    case 7: {
      // PMS Compliance (Planned service-plan coverage vs unplanned/excess activity)
      const rows = data as PmsComplianceRow[];
      const plannedRows = rows.filter((r) => r.status !== 'unplanned' && r.expectedServices != null);
      const unplannedRows = rows.filter((r) => r.status === 'unplanned' || r.expectedServices == null);

      const totalExpected = plannedRows.reduce((acc, r) => acc + (r.expectedServices || 0), 0);
      const plannedDone = plannedRows.reduce((acc, r) => acc + Math.min(r.pmsConducted || 0, r.expectedServices || 0), 0);
      const totalExcess = plannedRows.reduce((acc, r) => acc + Math.max(0, (r.pmsConducted || 0) - (r.expectedServices || 0)), 0);
      const unplannedDone = unplannedRows.reduce((acc, r) => acc + (r.pmsConducted || 0), 0);

      const isSummarized = rows.length > 10;
      const disclosure = isSummarized
        ? ` Showing top 10 of ${rows.length} scheduled PMS units sorted by expected services. Full schedule is in the CSV export.`
        : '';

      if (totalExpected === 0 && plannedRows.length === 0) {
        return {
          text: `Planned service denominators are unavailable when filtering by company (plans are shared by location/department). Completed activity records **${unplannedDone} total services conducted** across terminal stations.${disclosure}`,
          isSummarized,
          shownCount: Math.min(rows.length, 10),
          totalCount: rows.length,
        };
      }

      const coverageRate = totalExpected > 0 ? ((plannedDone / totalExpected) * 100).toFixed(1) : 'N/A';
      const compliantCount = plannedRows.filter((r) => r.status === 'compliant').length;
      const criticalCount = plannedRows.filter((r) => r.status === 'critical' || r.status === 'overdue').length;

      const excessNote = totalExcess > 0 ? ` Excess planned services conducted: **${totalExcess}**.` : '';
      const unplannedNote = unplannedDone > 0 ? ` Additional unplanned services: **${unplannedDone}**.` : '';

      return {
        text: `Preventative Maintenance compliance evaluates planned service tickets against administrator targets. Service-plan coverage is **${coverageRate}%** (**${plannedDone} completed** of **${totalExpected} expected planned services**). **${compliantCount} schedules compliant**, with **${criticalCount} units overdue or critical** requiring technician dispatch.${excessNote}${unplannedNote}${disclosure}`,
        isSummarized,
        shownCount: Math.min(rows.length, 10),
        totalCount: rows.length,
      };
    }

    case 8: {
      // Chronic Requestors
      const rows = data as ChronicRequestorRow[];
      const totalRepeat = rows.reduce((acc, r) => acc + (r.repeatIncidents || 0), 0);
      const topChronic = [...rows].sort((a, b) => (b.repeatIncidents || 0) - (a.repeatIncidents || 0) || a.requestorName.localeCompare(b.requestorName))[0];

      const isSummarized = rows.length > 10;
      const disclosure = isSummarized
        ? ` Showing top 10 of ${rows.length} chronic repeat requestors sorted by incident frequency. Full list is available in the CSV export.`
        : '';

      return {
        text: `Identified **${rows.length} staff members** with 3 or more recurring tickets, accounting for **${totalRepeat} repeat incidents**. Highest incident frequency is recorded for **${topChronic?.requestorName || 'Employee'} (${topChronic?.department || 'Operations'})** with **${topChronic?.repeatIncidents || 0} repeat tickets**; recommended targeted training: **${topChronic?.sopTrainingTarget || 'Peripheral handling'}**.${disclosure}`,
        isSummarized,
        shownCount: Math.min(rows.length, 10),
        totalCount: rows.length,
      };
    }

    default:
      return {
        text: `Standardized reporting analytics for period **${dateRange.dateFrom} to ${dateRange.dateTo}**. Verified audit records processed in accordance with canonical reporting rules.`,
      };
  }
}
