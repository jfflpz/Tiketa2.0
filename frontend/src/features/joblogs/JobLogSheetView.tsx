// @spec SR-03 & F-08: Authoritative IT Specialist Job Logs Sheet & Safe CSV Export
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Search,
  UserCheck,
  Loader2,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { COMPANIES } from '../../constants/domain';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ticketsApi } from '../../api/client';
import { mapStaffTicket } from '../../utils/mapStaffTicket';
import { sanitizeCsvCell } from './utils/csvSanitizer';
import type { Ticket } from '../../types/ticket';

export const JobLogSheetView: React.FC = () => {
  const currentUser = useAppStore((state) => state.currentUser);
  const queueTickets = useAppStore((state) => state.tickets);
  const setSelectedTicketId = useAppStore((state) => state.setSelectedTicketId);
  const addToast = useAppStore((state) => state.addToast);
  const serverDictionaries = useAppStore((state) => state.serverDictionaries);
  const fetchDictionaries = useAppStore((state) => state.fetchDictionaries);

  const [historyTickets, setHistoryTickets] = useState<Ticket[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [companyFilter, setCompanyFilter] = useState('ALL');
  const [modeFilter, setModeFilter] = useState<'ALL' | 'SITE' | 'REM'>('ALL');
  const [sheetSearch, setSheetSearch] = useState('');

  const isAdmin = currentUser?.role === 'admin';
  const accountEmployeeName = currentUser?.name ?? 'IT Specialist';

  // @spec F-08: Load authoritative job history ledger including closed tickets via GET /api/v1/tickets/history
  const loadAuthoritativeHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      if (!serverDictionaries) {
        await fetchDictionaries();
      }

      const dicts = useAppStore.getState().serverDictionaries;
      const currentStaff = useAppStore.getState().itTeamMembers;

      const techIdParam = isAdmin ? undefined : currentUser?.id;
      const data = await ticketsApi.getHistory({
        technician_id: techIdParam,
        limit: 200,
        status: 'ALL',
      });

      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map((row) =>
          mapStaffTicket(
            row,
            dicts,
            (currentStaff || []).find((m: any) => m.id === row.assigned_tech_id)?.name
          )
        );
        setHistoryTickets(mapped);
      } else {
        // Fallback to queue state if backend mock or empty
        setHistoryTickets([]);
      }
    } catch {
      // Graceful fallback to store queue state
      setHistoryTickets([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [isAdmin, currentUser?.id, serverDictionaries, fetchDictionaries]);

  useEffect(() => {
    loadAuthoritativeHistory();
  }, [loadAuthoritativeHistory]);

  // Combine authoritative history with local queue tickets (deduplicated by UUID)
  const allCandidateTickets = useMemo(() => {
    const list = historyTickets.length > 0 ? historyTickets : queueTickets;
    const map = new Map<string, Ticket>();
    for (const t of list) {
      map.set(t.id, t);
    }
    // Also include any queue tickets not yet in history
    for (const t of queueTickets) {
      if (!map.has(t.id)) {
        map.set(t.id, t);
      }
    }
    return Array.from(map.values());
  }, [historyTickets, queueTickets]);

  // @spec F-08: Scope personal history strictly by staff UUID without first-name substring matches
  const personalOrAdminTickets = useMemo(() => {
    if (isAdmin) {
      return allCandidateTickets.filter((t) =>
        Boolean(t.workedBy || t.workedById || t.assigned_tech_id)
      );
    }
    return allCandidateTickets.filter((t) => {
      if (!currentUser?.id) return false;
      return (
        t.workedById === currentUser.id ||
        t.assigned_tech_id === currentUser.id
      );
    });
  }, [isAdmin, currentUser?.id, allCandidateTickets]);

  const filteredLogs = useMemo(() => {
    return personalOrAdminTickets.filter((t) => {
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
  }, [personalOrAdminTickets, companyFilter, modeFilter, sheetSearch]);

  // @spec F-08: Safe CSV Export with Formula Injection Neutralization & Actual Worker Attribution
  const exportJobLogsCsv = () => {
    const headers = [
      '01_Company',
      '02_Mode',
      '03_Department',
      '04_Requestor',
      '05_Task',
      '06_Description',
      '07_Month',
      '08_Date_Started',
      '09_Time_Started',
      '10_Time_Finished',
      '11_Duration_Hrs',
      '12_Date_Finished',
      '13_Status',
      '14_Location',
      '15_Worked_By',
    ].join(',');

    const rows = filteredLogs.map((t) => {
      // Use each row's actual worker; never stamp the viewer as technician for others
      const actualWorker = t.workedBy || (isAdmin ? 'Unassigned' : accountEmployeeName);

      return [
        sanitizeCsvCell(`${t.company} (${t.companyCode})`),
        sanitizeCsvCell(t.mode),
        sanitizeCsvCell(t.department),
        sanitizeCsvCell(t.requestor),
        sanitizeCsvCell(t.task),
        sanitizeCsvCell(t.description),
        sanitizeCsvCell(t.month),
        sanitizeCsvCell(t.dateStarted),
        sanitizeCsvCell(t.timeStarted ?? ''),
        sanitizeCsvCell(t.timeFinished ?? ''),
        sanitizeCsvCell(t.duration != null ? t.duration.toFixed(2) : ''),
        sanitizeCsvCell(t.dateFinished ?? ''),
        sanitizeCsvCell(t.status),
        sanitizeCsvCell(`${t.location} (${t.locationCode})`),
        sanitizeCsvCell(actualWorker),
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const fileName = isAdmin
      ? `all_staff_job_logs_${Date.now()}.csv`
      : `${(currentUser?.username || 'my')}_job_logs.csv`;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast(
      'Export Complete',
      `Exported ${filteredLogs.length} verified job log records to ${fileName}`,
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
              ? 'Authoritative 15-column IT service job log ledger across all terminals (includes closed & resolved work).'
              : `Personal 15-column job log sheet scoped to UUID ${currentUser?.id || 'active account'} (includes closed work).`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={exportJobLogsCsv}
            disabled={filteredLogs.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-bold shadow-sm transition-colors press-fx"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Filtered Job Logs (CSV) • {filteredLogs.length} Records</span>
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
            {isLoadingHistory && (
              <span className="flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
                <Loader2 className="w-3 h-3 animate-spin text-orange-500" />
                Loading ledger...
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={sheetSearch}
                onChange={(e) => setSheetSearch(e.target.value)}
                placeholder="Filter job logs..."
                className="pl-8 pr-3 py-1.5 bg-[#F4F6F9] rounded-lg text-xs text-ink focus:outline-none focus:bg-white focus:ring-1 focus:ring-orange-400 w-48"
              />
            </div>

            <select
              aria-label="Filter by company"
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
              aria-label="Filter by support mode"
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
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={16} className="py-8 text-center text-zinc-400 text-xs">
                    {isLoadingHistory
                      ? 'Loading job history records...'
                      : 'No job logs matched the current filters.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((t) => (
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
                      {t.workedBy || (isAdmin ? 'Unassigned' : accountEmployeeName)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
