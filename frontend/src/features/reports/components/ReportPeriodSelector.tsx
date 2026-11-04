import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import {
  MONTH_NAMES,
  getCurrentManilaPeriod,
} from '../utils/periodUtils';

export const ReportPeriodSelector: React.FC = () => {
  const selectedYear = useAppStore((state) => state.selectedYear);
  const selectedMonth = useAppStore((state) => state.selectedMonth);
  const setSelectedPeriod = useAppStore((state) => state.setSelectedPeriod);
  const isFetchingReport = useAppStore((state) => state.isFetchingReport);
  const isFetchingKPIs = useAppStore((state) => state.isFetchingKPIs);

  const currentManila = getCurrentManilaPeriod();
  const isCurrentMonthInProgress =
    selectedYear === currentManila.year && selectedMonth === currentManila.month;

  // Historical years list from 2021 through current Manila year
  const years: number[] = [];
  for (let y = currentManila.year; y >= 2021; y--) {
    years.push(y);
  }

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = Number(e.target.value);
    setSelectedPeriod(selectedYear, newMonth);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = Number(e.target.value);
    setSelectedPeriod(newYear, selectedMonth);
  };

  const isLoading = isFetchingReport || isFetchingKPIs;

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 bg-white border border-[#ECEEF2] rounded-2xl shadow-xs">
      <div className="flex items-center gap-1.5 text-xs font-bold text-ink shrink-0">
        <Calendar className="w-4 h-4 text-orange-600" />
        <span>Reporting Period:</span>
      </div>

      {/* Month Dropdown */}
      <div className="flex items-center gap-1.5">
        <label htmlFor="report-period-month" className="text-xs font-semibold text-zinc-500">
          Month:
        </label>
        <select
          id="report-period-month"
          aria-label="Select reporting month"
          value={selectedMonth}
          onChange={handleMonthChange}
          disabled={isLoading}
          className="px-2.5 py-1.5 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs font-bold text-ink focus:outline-none focus:border-orange-500 disabled:opacity-50"
        >
          {MONTH_NAMES.map((name, idx) => (
            <option key={name} value={idx + 1}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Year Dropdown */}
      <div className="flex items-center gap-1.5">
        <label htmlFor="report-period-year" className="text-xs font-semibold text-zinc-500">
          Year:
        </label>
        <select
          id="report-period-year"
          aria-label="Select reporting year"
          value={selectedYear}
          onChange={handleYearChange}
          disabled={isLoading}
          className="px-2.5 py-1.5 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs font-bold text-ink focus:outline-none focus:border-orange-500 disabled:opacity-50"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Period Progress Indicator Badge */}
      <div className="ml-auto">
        {isCurrentMonthInProgress ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
            <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
            <span>Month in Progress (Includes future days)</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-700 border border-zinc-200 text-[11px] font-semibold">
            <span>Complete Historical Month</span>
          </span>
        )}
      </div>
    </div>
  );
};
