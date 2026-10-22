import React from 'react';
import { MetricCard } from '../../../components/common/MetricCard';

export interface TeamKpiSummaryCardsProps {
  itStaffCount: number;
  activeTechCount: number;
  inProgressTicketsCount: number;
  closedTicketsCount: number;
  verifiedEmployeesCount: number;
}

export const TeamKpiSummaryCards: React.FC<TeamKpiSummaryCardsProps> = ({
  itStaffCount,
  activeTechCount,
  inProgressTicketsCount,
  closedTicketsCount,
  verifiedEmployeesCount,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      <MetricCard
        label="Total IT Specialists"
        value={`${itStaffCount} Staff`}
        subLabel="Assigned across 15 Hubs"
      />
      <MetricCard
        label="Online & On-Duty"
        value={`${activeTechCount} Active`}
        subLabel="Handling Live Repairs"
      />
      <MetricCard
        label="Active Repair Load"
        value={`${inProgressTicketsCount} In Progress`}
        subLabel="Dispatched on Bench"
      />
      <MetricCard
        label="Closed Resolutions"
        value={`${closedTicketsCount} Closed`}
        subLabel="Cryptographically Verified"
      />
      <MetricCard
        label="Employee Directory"
        value={`${verifiedEmployeesCount} Verified`}
        subLabel="11 Transit Companies"
      />
    </div>
  );
};
