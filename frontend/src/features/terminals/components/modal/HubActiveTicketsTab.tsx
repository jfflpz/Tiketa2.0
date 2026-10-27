import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Plus,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import type { Ticket } from '../../../../types/ticket';
import { ticketsApi } from '../../../../api/client';
import { mapStaffTicket } from '../../../../utils/mapStaffTicket';
import { useAppStore } from '../../../../store/useAppStore';
import { StatusBadge } from '../../../../components/common/StatusBadge';

export interface HubActiveTicketsTabProps {
  hubId: string;
  hubName: string;
  totalActiveCount: number;
  onOpenTicketDrawer: (ticketId: string) => void;
  onOpenWorkbenchForTicket: (ticketId: string) => void;
  onQuickIntake: () => void;
}

export const HubActiveTicketsTab: React.FC<HubActiveTicketsTabProps> = ({
  hubId,
  hubName,
  totalActiveCount,
  onOpenTicketDrawer,
  onOpenWorkbenchForTicket,
  onQuickIntake,
}) => {
  const serverDictionaries = useAppStore((state) => state.serverDictionaries);
  const itTeamMembers = useAppStore((state) => state.itTeamMembers);
  const hubSummariesVersion = useAppStore((state) => state.hubSummariesVersion);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isStale, setIsStale] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'PROG' | 'RESL'>('ALL');
  const pageSize = 10;
  const [hasMore, setHasMore] = useState<boolean>(false);

  // Request sequence guard to discard out-of-order responses
  const seqRef = useRef<number>(0);

  // Query cache strictly associating results with `${hubId}:${statusFilter}:${page}`
  const queryCacheRef = useRef<Map<string, { tickets: Ticket[]; hasMore: boolean }>>(new Map());

  // Invalidate in-flight requests on unmount
  useEffect(() => {
    return () => {
      seqRef.current++;
    };
  }, []);

  const loadActiveTickets = useCallback(async (isManual = false) => {
    const currentSeq = ++seqRef.current;
    const currentQueryKey = `${hubId}:${statusFilter}:${page}`;
    if (isManual) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await ticketsApi.getQueue({
        location_id: hubId,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        order: 'desc',
        limit: pageSize + 1,
        offset: (page - 1) * pageSize,
      });

      if (currentSeq !== seqRef.current) return;

      if (Array.isArray(data)) {
        const more = data.length > pageSize;
        const pageItems = more ? data.slice(0, pageSize) : data;
        const mapped = pageItems.map((row) =>
          mapStaffTicket(
            row,
            serverDictionaries,
            itTeamMembers.find((m) => m.id === row.assigned_tech_id)?.name,
          )
        );
        queryCacheRef.current.set(currentQueryKey, { tickets: mapped, hasMore: more });
        setTickets(mapped);
        setHasMore(more);
        setIsStale(false);
      } else {
        queryCacheRef.current.set(currentQueryKey, { tickets: [], hasMore: false });
        setTickets([]);
        setHasMore(false);
        setIsStale(false);
      }
    } catch (err: unknown) {
      if (currentSeq !== seqRef.current) return;
      const msg = err instanceof Error ? err.message : 'Failed to load active tickets';
      setError(msg);

      // Associate cached results strictly with their exact queryKey
      const cached = queryCacheRef.current.get(currentQueryKey);
      if (cached) {
        setTickets(cached.tickets);
        setHasMore(cached.hasMore);
        setIsStale(true);
      } else {
        // Different query failed: do not display previous query's rows
        setTickets([]);
        setHasMore(false);
        setIsStale(false);
      }
    } finally {
      if (currentSeq === seqRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [hubId, page, statusFilter, serverDictionaries, itTeamMembers]);

  // Reset page when hubId or filter changes
  const handleStatusFilterChange = (newStatus: 'ALL' | 'OPEN' | 'PROG' | 'RESL') => {
    setStatusFilter(newStatus);
    setPage(1);
  };

  useEffect(() => {
    setPage(1);
  }, [hubId]);

  useEffect(() => {
    queryCacheRef.current.clear();
    loadActiveTickets();
  }, [loadActiveTickets, hubSummariesVersion]);

  useEffect(() => {
    if (!isLoading && page > 1 && tickets.length === 0) {
      setPage((p) => Math.max(1, p - 1));
    }
  }, [isLoading, page, tickets.length]);

  const startIndex = (page - 1) * pageSize + 1;
  const endIndex = (page - 1) * pageSize + tickets.length;

  return (
    <div className="space-y-4">
      {/* Tab Controls & Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-ink">
              Active Tickets at {hubName}
            </h3>
            <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-bold">
              {totalActiveCount} Total Active
            </span>
            {isStale && (
              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                Cached Data
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Real-time server-paginated active tickets for this terminal station.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Sub-Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              handleStatusFilterChange(e.target.value as 'ALL' | 'OPEN' | 'PROG' | 'RESL');
            }}
            className="text-xs py-1.5 px-2.5 bg-white border border-[#ECEEF2] rounded-xl text-ink focus:outline-none focus:border-orange-400 shadow-sm"
          >
            <option value="ALL">All Active Statuses</option>
            <option value="OPEN">Open Only</option>
            <option value="PROG">In Progress</option>
            <option value="RESL">Awaiting Confirmation</option>
          </select>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => loadActiveTickets(true)}
            disabled={isRefreshing || isLoading}
            className="p-1.5 rounded-xl bg-white border border-[#ECEEF2] text-zinc-600 hover:text-orange-600 transition-colors"
            title="Refresh active tickets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-500' : ''}`} />
          </button>

          {/* New Ticket Intake */}
          <button
            type="button"
            onClick={onQuickIntake}
            className="py-1.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors press-fx"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Ticket Intake</span>
          </button>
        </div>
      </div>

      {/* Stale Warning Banner (when refresh failed but old data retained) */}
      {isStale && error && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Showing cached active tickets ({error}).</span>
          </div>
          <button
            type="button"
            onClick={() => loadActiveTickets(true)}
            className="text-[11px] font-bold text-amber-800 underline hover:text-amber-950"
          >
            Retry Refresh
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="p-12 bg-white border border-[#ECEEF2] rounded-2xl text-center space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-orange-500" />
          <p className="text-xs font-semibold text-zinc-600">Loading active tickets...</p>
        </div>
      ) : error && tickets.length === 0 ? (
        <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-2">
          <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
          <p className="text-xs font-semibold text-rose-900">{error}</p>
          <button
            type="button"
            onClick={() => loadActiveTickets(false)}
            className="text-xs px-3 py-1 bg-white border border-rose-300 rounded-lg text-rose-800 font-bold hover:bg-rose-100"
          >
            Retry Loading
          </button>
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white border border-[#ECEEF2] rounded-2xl p-8 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-ink">No Active Tickets</h4>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            {statusFilter !== 'ALL'
              ? `No ${statusFilter} tickets found for ${hubName}.`
              : `All repair queues and service requests for ${hubName} are currently resolved or clear.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Page vs Total Indicator */}
          <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
            <span>
              Showing <strong className="text-ink">{startIndex}–{endIndex}</strong> of{' '}
              <strong className="text-ink">{totalActiveCount}</strong> total active tickets
            </span>
            {statusFilter !== 'ALL' && (
              <span className="text-[11px] text-zinc-400 font-mono">
                Filtered: {statusFilter}
              </span>
            )}
          </div>

          {/* Ticket Items */}
          {tickets.map((t) => (
            <div
              key={t.id}
              className="bg-white border border-[#ECEEF2] rounded-2xl p-4 shadow-sm hover:border-orange-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-zinc-900 text-white">
                    {t.ticketCode}
                  </span>
                  <span className="text-xs font-bold text-ink truncate max-w-[220px]">
                    {t.task}
                  </span>
                  <StatusBadge status={t.status} size="sm" />
                  {t.mode && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 uppercase">
                      {t.mode === 'SITE' ? 'Onsite' : 'Remote'}
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-600 line-clamp-2">
                  {t.description || 'No description provided.'}
                </p>

                <div className="flex items-center gap-3 text-[11px] text-zinc-400 flex-wrap">
                  <span>
                    Requestor: <strong className="text-zinc-700">{t.requestor}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Dept: <strong className="text-zinc-700">{t.department}</strong>
                  </span>
                  <span>•</span>
                  <span>Started: {t.dateStarted} {t.timeStarted ? t.timeStarted.slice(0, 5) : ''}</span>
                  {t.workedBy && (
                    <>
                      <span>•</span>
                      <span>
                        Assigned: <strong className="text-emerald-700">{t.workedBy}</strong>
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0">
                <button
                  type="button"
                  onClick={() => onOpenTicketDrawer(t.id)}
                  className="py-1.5 px-3 rounded-xl bg-[#F4F6F9] hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition-colors press-fx inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3 text-zinc-400" />
                  <span>Inspect Log</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenWorkbenchForTicket(t.id)}
                  className="py-1.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors press-fx flex items-center gap-1"
                >
                  <span>Open in Bench</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {/* Pagination Controls */}
          {(page > 1 || hasMore) && (
            <div className="flex items-center justify-between pt-2 border-t border-[#ECEEF2]">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="py-1.5 px-3 rounded-xl border border-[#ECEEF2] text-xs font-bold text-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 inline-flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous Page</span>
              </button>

              <span className="text-xs text-zinc-500 font-mono">
                Page {page}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore || isLoading}
                className="py-1.5 px-3 rounded-xl border border-[#ECEEF2] text-xs font-bold text-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 inline-flex items-center gap-1"
              >
                <span>Next Page</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
