import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Search,
  Clock,
  Check,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Flame,
  AlertTriangle,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { StatusBadge } from '../../components/common/StatusBadge';
import { TerminalHubDetailModal } from './TerminalHubDetailModal';
import { locationApi, type HubSummaryOut } from '../../api/client';

export const TerminalHubsView: React.FC = () => {
  const tickets = useAppStore((state) => state.tickets);
  const setSelectedTicketId = useAppStore((state) => state.setSelectedTicketId);
  const fetchQueueApi = useAppStore((state) => state.fetchQueueApi);
  const hubSummariesVersion = useAppStore((state) => state.hubSummariesVersion);

  const [hubs, setHubs] = useState<HubSummaryOut[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [hubSearch, setHubSearch] = useState('');
  const [selectedHubCode, setSelectedHubCode] = useState<string | null>(null);

  // Link selectedHub dynamically to the latest hubs data
  const selectedHub = hubs.find((h) => h.code === selectedHubCode) ?? null;

  // Request sequence guard to discard out-of-order responses
  const seqRef = React.useRef<number>(0);

  // Invalidate in-flight requests on unmount
  useEffect(() => {
    return () => {
      seqRef.current++;
    };
  }, []);

  const fetchHubs = useCallback(async (isManualRefresh = false) => {
    const currentSeq = ++seqRef.current;
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const [summariesRes, queueRes] = await Promise.allSettled([
        locationApi.getHubSummaries(),
        fetchQueueApi(),
      ]);

      if (currentSeq !== seqRef.current) return;

      if (summariesRes.status === 'fulfilled') {
        setHubs(summariesRes.value);
        setIsStale(false);
        setLastUpdated(new Date());

        if (queueRes.status === 'rejected' || (queueRes.status === 'fulfilled' && queueRes.value === false)) {
          const qErr =
            queueRes.status === 'rejected' && queueRes.reason instanceof Error
              ? queueRes.reason.message
              : 'Failed to update queue preview';
          setError(`Hub summaries refreshed, but ticket queue preview failed: ${qErr}`);
          setIsStale(true);
        } else {
          setError(null);
        }
      } else {
        const msg = summariesRes.reason instanceof Error ? summariesRes.reason.message : 'Failed to load terminal hub summaries';
        setError(msg);
        setHubs((prev) => {
          if (prev.length > 0) {
            setIsStale(true);
          }
          return prev;
        });
      }
    } catch (err: unknown) {
      if (currentSeq !== seqRef.current) return;
      const msg = err instanceof Error ? err.message : 'Failed to load terminal hub summaries';
      setError(msg);
      setHubs((prev) => {
        if (prev.length > 0) {
          setIsStale(true);
        }
        return prev;
      });
    } finally {
      if (currentSeq === seqRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [fetchQueueApi]);

  useEffect(() => {
    fetchHubs();
  }, [fetchHubs, hubSummariesVersion]);

  const filteredHubs = hubs.filter(
    (h) =>
      !hubSearch.trim() ||
      h.name.toLowerCase().includes(hubSearch.toLowerCase()) ||
      h.code.toLowerCase().includes(hubSearch.toLowerCase()) ||
      (h.top_issue_task_name && h.top_issue_task_name.toLowerCase().includes(hubSearch.toLowerCase()))
  );

  return (
    <div className="space-y-5 pb-8">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-ink tracking-tight">
              {hubs.length > 0 ? `${hubs.length} Bus Terminal Hubs Monitor` : 'Bus Terminal Hubs Monitor'}
            </h1>
            {isStale && (
              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                Cached Data
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Authoritative operational overview of transit terminal stations, active repair workloads, and closure metrics.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Last Updated Label */}
          {lastUpdated && (
            <span className="text-[11px] text-zinc-400 hidden md:inline">
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchHubs(true)}
            disabled={isRefreshing || isLoading}
            className="py-2 px-3 rounded-xl bg-white hover:bg-orange-50 text-zinc-700 hover:text-orange-600 border border-[#ECEEF2] text-xs font-semibold inline-flex items-center gap-1.5 shadow-card transition-colors press-fx"
            title="Refresh terminal summaries"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-500' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={hubSearch}
              onChange={(e) => setHubSearch(e.target.value)}
              placeholder="Search terminal hubs..."
              className="pl-8 pr-3 py-2 bg-white border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-400 w-56 sm:w-64 shadow-card"
            />
          </div>
        </div>
      </div>

      {/* Stale Warning Banner (when refresh failed but old data retained) */}
      {isStale && error && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Refresh Failed:</strong> Showing previously cached terminal data ({error}).
            </span>
          </div>
          <button
            type="button"
            onClick={() => fetchHubs(true)}
            className="text-[11px] font-bold text-amber-800 underline hover:text-amber-950"
          >
            Retry Now
          </button>
        </div>
      )}

      {/* Primary Loading State */}
      {isLoading ? (
        <div className="p-16 bg-white border border-[#ECEEF2] rounded-3xl text-center space-y-3 shadow-card">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-orange-500" />
          <h3 className="text-sm font-bold text-ink">Loading Terminal Hub Summaries</h3>
          <p className="text-xs text-zinc-500">Querying authoritative ticket metrics and department mappings...</p>
        </div>
      ) : error && hubs.length === 0 ? (
        <div className="p-12 bg-white border border-rose-200 rounded-3xl text-center space-y-3 shadow-card">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h3 className="text-sm font-bold text-ink">Failed to Load Terminal Hubs</h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">{error}</p>
          <button
            type="button"
            onClick={() => fetchHubs(false)}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-colors press-fx"
          >
            Retry Loading
          </button>
        </div>
      ) : filteredHubs.length === 0 ? (
        <div className="p-12 bg-white border border-[#ECEEF2] rounded-3xl text-center space-y-2 shadow-card">
          <Building2 className="w-10 h-10 text-zinc-300 mx-auto" />
          <h3 className="text-sm font-bold text-ink">No Terminals Found</h3>
          <p className="text-xs text-zinc-500">No terminal hub stations match "{hubSearch}".</p>
        </div>
      ) : (
        /* Station Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredHubs.map((hub) => {
            // Filter live tickets matching this terminal from the active queue
            const activeHubTickets = tickets.filter(
              (t) => t.locationCode === hub.code && t.status !== 'CLSD'
            );

            return (
              <div
                key={hub.id || hub.code}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedHubCode(hub.code)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedHubCode(hub.code);
                  }
                }}
                aria-label={`View ${hub.name} terminal station details: ${hub.total_active_count} active tickets`}
                className="bg-white border border-[#ECEEF2] rounded-2xl p-5 shadow-card flex flex-col justify-between space-y-4 hover:border-orange-400 hover:shadow-lg transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <div className="space-y-3.5">
                  {/* Card Top: Code + Name */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-200/60 flex items-center justify-center font-mono text-xs font-extrabold shrink-0 group-hover:scale-105 transition-transform">
                        {hub.code}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-ink group-hover:text-orange-600 transition-colors truncate">
                          {hub.name}
                        </h3>
                        <p className="text-[11px] text-zinc-400 font-mono">
                          {hub.departments.length} Operating Dept{hub.departments.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    {hub.total_active_count > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold shrink-0">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        {hub.total_active_count} Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold shrink-0">
                        <Check className="w-3 h-3 text-emerald-600" />
                        Queue Clear
                      </span>
                    )}
                  </div>

                  {/* Workload Breakdown Grid */}
                  <div className="grid grid-cols-3 gap-2 bg-[#F4F6F9] rounded-xl p-3 text-xs text-center">
                    <div>
                      <span className="text-[10px] font-semibold text-zinc-400 block">
                        Open
                      </span>
                      <span className="font-mono font-bold text-sky-700 text-sm">
                        {hub.open_count}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-zinc-400 block">
                        In Progress
                      </span>
                      <span className="font-mono font-bold text-orange-600 text-sm">
                        {hub.in_progress_count}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-zinc-400 block">
                        Awaiting Conf
                      </span>
                      <span className="font-mono font-bold text-amber-600 text-sm">
                        {hub.resolved_count}
                      </span>
                    </div>
                  </div>

                  {/* Top Reported Issue Category */}
                  <div className="flex items-center justify-between text-xs py-1 border-b border-[#ECEEF2]">
                    <span className="text-zinc-500 flex items-center gap-1 font-medium shrink-0">
                      <Flame className="w-3.5 h-3.5 text-orange-500" />
                      Top Issue (30d):
                    </span>
                    <span className="font-semibold text-ink truncate text-right ml-2" title={hub.top_issue_task_name ?? 'None'}>
                      {hub.top_issue_task_name ? `${hub.top_issue_task_name} (${hub.top_issue_count})` : 'No recent issues'}
                    </span>
                  </div>

                  {/* Active Tickets List (Preview) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold uppercase tracking-wider text-zinc-400">
                        Active Tickets Preview ({activeHubTickets.length} of {hub.total_active_count})
                      </span>
                    </div>

                    {activeHubTickets.length === 0 ? (
                      hub.total_active_count > 0 ? (
                        <div className="p-2.5 bg-amber-50/50 border border-amber-200/50 rounded-xl text-center text-[11px] text-amber-800">
                          <p className="font-medium">
                            {hub.total_active_count} active ticket{hub.total_active_count !== 1 ? 's' : ''} at station (open details to inspect)
                          </p>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-zinc-50 rounded-xl text-center text-[11px] text-zinc-500">
                          <p className="font-medium text-emerald-700 flex items-center justify-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            No active tickets
                          </p>
                        </div>
                      )
                    ) : (
                      activeHubTickets.slice(0, 2).map((t) => (
                        <div
                          key={t.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTicketId(t.id);
                          }}
                          className="p-2 rounded-xl bg-orange-50/50 hover:bg-orange-100/60 border border-orange-200/60 cursor-pointer flex items-center justify-between gap-2 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-zinc-900 text-white">
                                {t.ticketCode}
                              </span>
                              <span className="font-bold text-xs text-ink truncate">
                                {t.task}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                              {t.requestor} ({t.department})
                            </p>
                          </div>
                          <StatusBadge status={t.status} size="sm" />
                        </div>
                      ))
                    )}
                  </div>

                  {/* Monthly Resolution Metric */}
                  <div className="pt-1 flex items-center justify-between text-[11px] text-zinc-500">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      Closed This Month:
                    </span>
                    <span className="font-bold font-mono text-ink">
                      {hub.closed_this_month_count} tickets
                    </span>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-[#ECEEF2] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedHubCode(hub.code);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-[#F4F6F9] group-hover:bg-orange-50 group-hover:text-orange-600 text-zinc-700 text-xs font-bold inline-flex items-center justify-between gap-1.5 transition-colors press-fx"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-zinc-500 group-hover:text-orange-500" />
                      <span>View Station Details &amp; History</span>
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Terminal Hub Details Modal */}
      {selectedHub && (
        <TerminalHubDetailModal
          hub={selectedHub}
          onClose={() => setSelectedHubCode(null)}
          onRefreshHubs={() => fetchHubs(true)}
        />
      )}
    </div>
  );
};
