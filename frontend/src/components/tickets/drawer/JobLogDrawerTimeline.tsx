import React, { useCallback, useEffect, useRef, useState } from 'react';
import { History, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { ticketsApi } from '../../../api/client';
import { normalizeApiError } from '../../../utils/errorUtils';

export interface TicketActivityEntry {
  id: string;
  actor_name: string;
  actor_role?: string;
  action: string;
  created_at: string;
  changes?: Array<{ field: string; from?: string | null; to?: string | null }>;
}

export interface JobLogDrawerTimelineProps {
  ticketId: string;
}

const PAGE_SIZE = 20;

export const JobLogDrawerTimeline: React.FC<JobLogDrawerTimelineProps> = ({ ticketId }) => {
  const [items, setItems] = useState<TicketActivityEntry[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadPage = useCallback(
    async (targetPage: number, append: boolean) => {
      const reqId = ++requestIdRef.current;
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      try {
        const res = await ticketsApi.getTicketActivity(ticketId, {
          page: targetPage,
          page_size: PAGE_SIZE,
        });
        if (reqId !== requestIdRef.current) return;
        const nextItems = Array.isArray(res?.items) ? res.items : [];
        setItems((prev) => (append ? [...prev, ...nextItems] : nextItems));
        setPage(res?.page ?? targetPage);
        const total = res?.total ?? 0;
        setHasMore(
          typeof res?.has_more === 'boolean'
            ? res.has_more
            : targetPage * PAGE_SIZE < total
        );
      } catch (err) {
        if (reqId !== requestIdRef.current) return;
        setError(normalizeApiError(err, 'Unable to load ticket activity history.'));
      } finally {
        if (reqId === requestIdRef.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [ticketId]
  );

  useEffect(() => {
    setItems([]);
    setPage(1);
    loadPage(1, false);
  }, [loadPage]);

  if (isLoading) {
    return (
      <div className="py-10 flex items-center justify-center gap-2 text-xs text-ink-subtle">
        <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
        <span>Loading activity history...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 space-y-2">
        <div className="flex items-center gap-2 font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
        <button
          type="button"
          onClick={() => loadPage(1, false)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-rose-300 text-rose-700 font-semibold hover:bg-rose-100"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-10 text-center space-y-1.5 text-xs text-ink-subtle">
        <History className="w-5 h-5 mx-auto text-zinc-400" />
        <p className="font-semibold text-ink">No recorded activity yet</p>
        <p>Server-recorded ticket mutations will appear here in chronological order.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" aria-label="Read-only ticket activity timeline">
      <div className="flex items-center justify-between text-[11px] text-ink-subtle">
        <span className="font-semibold uppercase tracking-wider">Audit Timeline (Read-Only)</span>
        <span>{items.length} event(s)</span>
      </div>

      <ol className="space-y-2.5">
        {items.map((entry) => (
          <li
            key={entry.id}
            className="p-3 rounded-xl bg-surface border border-line text-xs space-y-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold text-ink">
                {entry.actor_name}
                {entry.actor_role && (
                  <span className="ml-1.5 text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">
                    {entry.actor_role}
                  </span>
                )}
              </div>
              <time className="text-[11px] font-mono text-ink-subtle" dateTime={entry.created_at}>
                {new Date(entry.created_at).toLocaleString()}
              </time>
            </div>
            <p className="text-zinc-700">{entry.action}</p>
            {entry.changes && entry.changes.length > 0 && (
              <ul className="space-y-0.5 pt-1 border-t border-line/60 text-[11px] text-zinc-600 font-mono">
                {entry.changes.map((c, idx) => (
                  <li key={`${entry.id}-${c.field}-${idx}`}>
                    {c.field}: {c.from ?? '—'} → {c.to ?? '—'}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>

      {hasMore && (
        <button
          type="button"
          disabled={isLoadingMore}
          onClick={() => loadPage(page + 1, true)}
          className="w-full py-2 px-3 rounded-xl bg-surface border border-line hover:bg-zinc-100 text-xs font-semibold text-ink disabled:opacity-50"
        >
          {isLoadingMore ? 'Loading more...' : 'Load older activity'}
        </button>
      )}
    </div>
  );
};
