// @spec SR-03: Personal IT Specialist Job Logs Sheet (Filtered strictly to the Logged-In Account's Employee)
import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Search,
  UserCheck,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { COMPANIES } from '../../constants/domain';
import { StatusBadge } from '../../components/common/StatusBadge';

export const JobLogSheetView: React.FC = () => {
  const currentUser = useAppStore((state) => state.currentUser);
  const tickets = useAppStore((state) => state.tickets);
  const setSelectedTicketId = useAppStore((state) => state.setSelectedTicketId);
  const fetchQueueApi = useAppStore((state) => state.fetchQueueApi);
  const addToast = useAppStore((state) => state.addToast);

  const [companyFilter, setCompanyFilter] = useState('ALL');
  const [modeFilter, setModeFilter] = useState<'ALL' | 'SITE' | 'REM'>('ALL');
  const [sheetSearch, setSheetSearch] = useState('');

  // Fetch queue on mount so the table loads immediately upon direct navigation
  useEffect(() => {
    fetchQueueApi();
  }, [fetchQueueApi]);

  const isAdmin = currentUser?.role === 'admin';
  const accountEmployeeName = currentUser?.name ?? 'Nathaniel D. Esguerra';
  const accountFirstName = accountEmployeeName.split(' ')[0].toLowerCase();

  // For IT Support: strictly show the job logs claimed or assigned to the logged-in technician
  const personalOrAdminTickets = isAdmin
    ? tickets.filter((t) => Boolean(t.workedBy || t.workedById || t.assigned_tech_id))
    : tickets.filter(
        (t) =>
          Boolean(t.workedBy || t.workedById || t.assigned_tech_id) &&
          (t.workedById === currentUser?.id ||
            t.assigned_tech_id === currentUser?.id ||
            t.workedBy === accountEmployeeName ||
            t.workedBy?.toLowerCase().includes(accountFirstName))
      );

  const filteredLogs = personalOrAdminTickets.filter((t) => {
    if (companyFilter !== 'ALL' && t.companyCode !== companyFilter) return false;
    if (modeFilter !== 'ALL' && t.mode !== modeFilter) return false;
    const q = sheetSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      t.ticketCode.toLowerCase().includes(q) ||
      t.requestor.toLowerCase().includes(q) ||
      t.task.toLowerCase().includes(q) ||
      t.location.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q)
    );
  });

  const exportJobLogsCsv = () => {
    const headers = [
      '01_Company,02_Mode,03_Department,04_Requestor,05_Task,06_Description,07_Month,08_Date_Started,09_Time_Started,10_Time_Finished,11_Duration_Hrs,12_Date_Finished,13_Status,14_Location,15_Worked_By',
    ];
    const rows = filteredLogs.map(
      (t) =>
        `"${t.company} (${t.companyCode})",${t.mode},"${t.department}","${t.requestor}","${t.task}","${t.description.replace(/"/g, '""')}",${t.month},${t.dateStarted},${t.timeStarted},${t.timeFinished ?? ''},${t.duration ?? ''},${t.dateFinished ?? ''},${t.status},"${t.location}","${accountEmployeeName}"`
    );
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `${accountFirstName}_job_logs.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast(
      'Exported My Job Logs',
      `${accountFirstName}_job_logs.csv downloaded`,
      'success'
    );
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-ink tracking-tight">
              {isAdmin ? 'All Staff Job Logs Ledger' : `My Job Logs — ${accountEmployeeName}`}
            </h1>
            {!isAdmin && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200/70 text-xs font-bold">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Account: {accountEmployeeName}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            {isAdmin
              ? 'Master 15-column IT service job log ledger across all terminals.'
              : `Personal 15-column job log sheet displaying only tickets claimed and worked by ${accountEmployeeName}.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={exportJobLogsCsv}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-sm transition-colors press-fx"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export My Job Logs (CSV)</span>
          </button>
        </div>
      </div>

      {/* Main Personal Job Logs Spreadsheet Container */}
      <div className="bg-white border border-[#ECEEF2] rounded-2xl p-5 shadow-card space-y-4">
        {/* Filter Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-2 border-b border-[#ECEEF2]">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-bold text-ink">
              {isAdmin
                ? `All Job Log Records (${filteredLogs.length})`
                : `${accountEmployeeName}'s Job Log Sheet (${filteredLogs.length} Records)`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={sheetSearch}
                onChange={(e) => setSheetSearch(e.target.value)}
                placeholder="Filter my job logs..."
                className="pl-8 pr-3 py-1.5 bg-[#F4F6F9] rounded-lg text-xs text-ink focus:outline-none focus:bg-white focus:ring-1 focus:ring-orange-400 w-48"
              />
            </div>

            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[#F4F6F9] border border-[#ECEEF2] text-xs font-semibold text-ink"
            >
              <option value="ALL">All 11 Companies</option>
              {COMPANIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>

            <select
              value={modeFilter}
              onChange={(e) =>
                setModeFilter(e.target.value as 'ALL' | 'SITE' | 'REM')
              }
              className="px-3 py-1.5 rounded-lg bg-[#F4F6F9] border border-[#ECEEF2] text-xs font-semibold text-ink"
            >
              <option value="ALL">Mode: All (SITE &amp; REM)</option>
              <option value="SITE">On-Site (SITE)</option>
              <option value="REM">Remote (REM)</option>
            </select>
          </div>
        </div>

        {/* Horizontally Scrollable 15-Column Job Log Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
            <thead>
              <tr className="bg-[#F4F6F9] text-zinc-600 text-[11px] font-bold border-y border-[#ECEEF2]">
                <th className="py-2.5 px-3">Ticket ID</th>
                <th className="py-2.5 px-3">#01 Company</th>
                <th className="py-2.5 px-3">#02 Mode</th>
                <th className="py-2.5 px-3">#03 Department</th>
                <th className="py-2.5 px-3">#04 Requestor</th>
                <th className="py-2.5 px-3">#05 Task</th>
                <th className="py-2.5 px-3">#06 Description</th>
                <th className="py-2.5 px-3">#07 Month</th>
                <th className="py-2.5 px-3">#08 Date Started</th>
                <th className="py-2.5 px-3">#09 Time Started</th>
                <th className="py-2.5 px-3">#10 Time Finished</th>
                <th className="py-2.5 px-3">#11 Duration</th>
                <th className="py-2.5 px-3">#12 Date Finished</th>
                <th className="py-2.5 px-3">#13 Status</th>
                <th className="py-2.5 px-3">#14 Location</th>
                <th className="py-2.5 px-3">#15 Worked By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECEEF2]">
              {filteredLogs.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setSelectedTicketId(t.id)}
                  className="hover:bg-orange-50/40 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-3 font-mono font-bold text-orange-600">
                    {t.ticketCode}
                  </td>
                  <td className="py-3 px-3 font-semibold text-ink">
                    {t.companyCode} — {t.company}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                        t.mode === 'SITE'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-sky-100 text-sky-700'
                      }`}
                    >
                      {t.mode}
                    </span>
                  </td>
                  <td className="py-3 px-3">{t.department}</td>
                  <td className="py-3 px-3 font-semibold text-ink">
                    {t.requestor}
                  </td>
                  <td className="py-3 px-3 font-medium text-ink">{t.task}</td>
                  <td className="py-3 px-3 max-w-[260px] truncate text-zinc-500">
                    {t.description}
                  </td>
                  <td className="py-3 px-3 text-zinc-500">{t.month}</td>
                  <td className="py-3 px-3 font-mono">{t.dateStarted}</td>
                  <td className="py-3 px-3 font-mono">{t.timeStarted}</td>
                  <td className="py-3 px-3 font-mono text-zinc-500">
                    {t.timeFinished ?? '—'}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-emerald-700">
                    {t.duration !== undefined ? `${t.duration.toFixed(2)} hrs` : '—'}
                  </td>
                  <td className="py-3 px-3 font-mono text-zinc-500">
                    {t.dateFinished ?? '—'}
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={t.status} size="sm" />
                  </td>
                  <td className="py-3 px-3 font-semibold text-ink">
                    {t.location} ({t.locationCode})
                  </td>
                  <td className="py-3 px-3 font-semibold text-ink">
                    {isAdmin ? (t.workedBy || 'Awaiting Triage') : accountEmployeeName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
