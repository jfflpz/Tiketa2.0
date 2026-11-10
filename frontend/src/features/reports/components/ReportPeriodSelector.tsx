import React, { useState } from 'react';
import { Calendar, Check } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import {
  MONTH_NAMES,
  getCurrentManilaPeriod,
  getMonthDateRange,
} from '../utils/periodUtils';

export const ReportPeriodSelector: React.FC = () => {
  const selectedYear = useAppStore((state) => state.selectedYear);
  const selectedMonth = useAppStore((state) => state.selectedMonth);
  const reportDateRange = useAppStore((state) => state.reportDateRange);
  const setSelectedPeriod = useAppStore((state) => state.setSelectedPeriod);
  const setDateRangeApi = useAppStore((state) => state.setDateRangeApi);
  const isFetchingReport = useAppStore((state) => state.isFetchingReport);
  const isFetchingKPIs = useAppStore((state) => state.isFetchingKPIs);

  const [filterMode, setFilterMode] = useState<'MONTH' | 'RANGE'>('MONTH');
  const [rangeFrom, setRangeFrom] = useState(reportDateRange?.date_from || '2026-10-01');
  const [rangeTo, setRangeTo] = useState(reportDateRange?.date_to || '2026-10-31');

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

  const handleApplyRange = () => {
    if (rangeFrom && rangeTo && rangeFrom <= rangeTo) {
      setDateRangeApi(rangeFrom, rangeTo);
    }
  };

  const isLoading = isFetchingReport || isFetchingKPIs;

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 bg-white border border-[#ECEEF2] rounded-2xl shadow-xs">
      <div className="flex items-center gap-1.5 text-xs font-bold text-ink shrink-0">
        <Calendar className="w-4 h-4 text-orange-600" />
        <span>Reporting Period:</span>
      </div>

      {/* Mode Switcher: Specific Month vs Date Range */}
      <div className="flex items-center p-0.5 bg-zinc-100 rounded-xl text-xs font-semibold">
        <button
          type="button"
          onClick={() => {
            setFilterMode('MONTH');
            const range = getMonthDateRange(selectedYear, selectedMonth);
            setDateRangeApi(range.date_from, range.date_to);
          }}
          className={`px-2.5 py-1 rounded-lg transition-all press-fx ${
            filterMode === 'MONTH'
              ? 'bg-white text-ink shadow-xs font-bold'
              : 'text-zinc-500 hover:text-ink'
          }`}
        >
          Specific Month
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('RANGE')}
          className={`px-2.5 py-1 rounded-lg transition-all press-fx ${
            filterMode === 'RANGE'
              ? 'bg-white text-ink shadow-xs font-bold'
              : 'text-zinc-500 hover:text-ink'
          }`}
        >
          From &rarr; To Range
        </button>
      </div>

      {filterMode === 'MONTH' ? (
        <>
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
        </>
      ) : (
        /* From -> To Range Inputs */
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <label htmlFor="report-date-from" className="font-semibold text-zinc-500">From:</label>
            <input
              id="report-date-from"
              type="date"
              value={rangeFrom}
              onChange={(e) => setRangeFrom(e.target.value)}
              disabled={isLoading}
              className="px-2.5 py-1.5 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs font-bold text-ink focus:outline-none focus:border-orange-500 disabled:opacity-50"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="report-date-to" className="font-semibold text-zinc-500">To:</label>
            <input
              id="report-date-to"
              type="date"
              value={rangeTo}
              onChange={(e) => setRangeTo(e.target.value)}
              disabled={isLoading}
              className="px-2.5 py-1.5 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs font-bold text-ink focus:outline-none focus:border-orange-500 disabled:opacity-50"
            />
          </div>

          <button
            type="button"
            onClick={handleApplyRange}
            disabled={isLoading || !rangeFrom || !rangeTo || rangeFrom > rangeTo}
            className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1 shadow-xs transition-colors press-fx"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply</span>
          </button>
        </div>
      )}

      {/* Period Progress Indicator Badge */}
      <div className="ml-auto">
        {isCurrentMonthInProgress && filterMode === 'MONTH' ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Current Month in Progress
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {reportDateRange ? `${reportDateRange.date_from} → ${reportDateRange.date_to}` : 'Audited'}
          </span>
        )}
      </div>
    </div>
  );
};
