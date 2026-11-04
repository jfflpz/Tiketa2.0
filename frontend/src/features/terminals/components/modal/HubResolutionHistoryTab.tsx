import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Clock, RefreshCw, ChevronLeft, ChevronRight, AlertCircle, FileText, ExternalLink } from 'lucide-react';
import type { Ticket } from '../../../../types/ticket';
import { ticketsApi } from '../../../../api/client';
import { mapStaffTicket } from '../../../../utils/mapStaffTicket';
import { useAppStore } from '../../../../store/useAppStore';
import { StatusBadge } from '../../../../components/common/StatusBadge';

export interface HubResolutionHistoryTabProps {
  hubId: string;
  hubName: string;
  onOpenTicketDrawer: (ticketId: string) => void;
}

export const HubResolutionHistoryTab: React.FC<HubResolutionHistoryTabProps> = ({
  hubId,
  hubName,
  onOpenTicketDrawer,
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
  const [statusFilter, setStatusFilter] = useState<'CLSD' | 'RESL' | 'ALL'>('CLSD');
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

  const loadHistory = useCallback(async (isManual = false) => {
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
            itTeamMembers.find((m) => m.id === row.assigned_tech_id)?.name
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
      const msg = err instanceof Error ? err.message : 'Failed to load resolution history';
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
  const handleStatusFilterChange = (newStatus: 'CLSD' | 'RESL' | 'ALL') => {
    setStatusFilter(newStatus);
    setPage(1);
  };

  useEffect(() => {
    setPage(1);
  }, [hubId]);

  useEffect(() => {
    queryCacheRef.current.clear();
    loadHistory();
  }, [loadHistory, hubSummariesVersion]);

  useEffect(() => {
    if (!isLoading && page > 1 && tickets.length === 0) {
      setPage((p) => Math.max(1, p - 1));
    }
  }, [isLoading, page, tickets.length]);

  return (
    <div className="space-y-4">
      {/* Tab Controls & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-ink">
              Ticket Resolution History for {hubName}
            </h3>
            {isStale && (
              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                Cached Data
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Historical records loaded directly from the database for this terminal.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              handleStatusFilterChange(e.target.value as 'CLSD' | 'RESL' | 'ALL');
            }}
            className="text-xs py-1.5 px-2.5 bg-white border border-[#ECEEF2] rounded-xl text-ink focus:outline-none focus:border-orange-400 shadow-sm"
          >
            <option value="CLSD">Closed Tickets Only</option>
            <option value="RESL">Resolved (Awaiting Conf)</option>
            <option value="ALL">All Past Tickets</option>
          </select>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => loadHistory(true)}
            disabled={isRefreshing || isLoading}
            className="p-1.5 rounded-xl bg-white border border-[#ECEEF2] text-zinc-600 hover:text-orange-600 transition-colors"
            title="Refresh history records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stale Warning Banner (when refresh failed but old data retained) */}
      {isStale && error && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Showing cached history records ({error}).</span>
          </div>
          <button
            type="button"
            onClick={() => loadHistory(true)}
            className="text-[11px] font-bold text-amber-800 underline hover:text-amber-950"
          >
            Retry Refresh
          </button>
        </div>
      )}

      {/* Primary Loading State */}
      {isLoading ? (
        <div className="p-12 bg-white border border-[#ECEEF2] rounded-2xl text-center space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-orange-500" />
          <p className="text-xs font-semibold text-zinc-600">Loading resolution history...</p>
        </div>
      ) : error && tickets.length === 0 ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-2">
          <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
          <p className="text-xs font-semibold text-rose-900">{error}</p>
          <button
            type="button"
            onClick={() => loadHistory(false)}
            className="text-xs px-3 py-1 bg-white border border-rose-300 rounded-lg text-rose-800 font-bold hover:bg-rose-100"
          >
            Retry Query
          </button>
        </div>
      ) : tickets.length === 0 ? (
        <div className="p-12 bg-zinc-50 border border-[#ECEEF2] rounded-2xl text-center space-y-2">
          <FileText className="w-8 h-8 text-zinc-400 mx-auto" />
          <h4 className="text-xs font-bold text-ink">No Historical Records Found</h4>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            There are no {statusFilter === 'CLSD' ? 'closed' : statusFilter === 'RESL' ? 'resolved' : ''} tickets on record for {hubName}.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              onClick={() => onOpenTicketDrawer(t.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenTicketDrawer(t.id);
                }
              }}
              aria-label={`Inspect ticket ${t.ticketCode}: ${t.task}`}
              className="bg-white border border-[#ECEEF2] rounded-2xl p-4 shadow-sm hover:border-orange-300 transition-all cursor-pointer space-y-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-zinc-800 text-white">
                    {t.ticketCode}
                  </span>
                  <h4 className="text-xs font-bold text-ink">{t.task}</h4>
                  <StatusBadge status={t.status} size="sm" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-zinc-400">
                    {t.dateFinished ? `Closed ${t.dateFinished}` : `Started ${t.dateStarted}`}
                  </span>
                  <span className="py-1 px-2 rounded-lg bg-zinc-50 text-zinc-600 text-[10px] font-semibold inline-flex items-center gap-1 hover:bg-orange-50 hover:text-orange-600 transition-colors">
                    <ExternalLink className="w-3 h-3 text-zinc-400" />
                    <span>Inspect</span>
                  </span>
                </div>
              </div>

              <p className="text-xs text-zinc-600 line-clamp-2">
                {t.description || 'No description provided.'}
              </p>

              <div className="pt-2 border-t border-[#ECEEF2] flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500">
                <div className="flex items-center gap-2">
                  <span>
                    Requestor: <strong>{t.requestor}</strong> ({t.department})
                  </span>
                  <span>•</span>
                  <span>
                    Worked By: <strong className="text-emerald-700">{t.workedBy || 'Unassigned'}</strong>
                  </span>
                </div>
                {t.duration && (
                  <span className="font-mono font-bold text-zinc-700 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-400" />
                    Labor: {t.duration}h
                  </span>
                )}
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
