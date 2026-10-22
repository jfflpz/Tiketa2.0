import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, ChevronRight, ArrowRight } from 'lucide-react';
import type { Ticket } from '../../../types/ticket';

export interface HeaderGlobalSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  tickets: Ticket[];
  onSelectTicket: (ticketId: string) => void;
  onViewQueue: () => void;
}

const getStatusBadge = (status: Ticket['status']) => {
  switch (status) {
    case 'OPEN':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'PROG':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'RESL':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'CLSD':
      return 'bg-zinc-100 text-zinc-600 border-zinc-200';
  }
};

const getPriorityBadge = (priority: Ticket['priority']) => {
  switch (priority) {
    case 'Critical':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'High':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Medium':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'Low':
      return 'bg-zinc-100 text-zinc-600 border-zinc-200';
  }
};

export const HeaderGlobalSearch: React.FC<HeaderGlobalSearchProps> = ({
  searchQuery,
  onSearchChange,
  tickets,
  onSelectTicket,
  onViewQueue,
}) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
      if (
        (e.ctrlKey && e.key.toLowerCase() === 'k') ||
        (e.key === '/' &&
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA')
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tickets.slice(0, 5);
    return tickets
      .filter(
        (t) =>
          t.ticketCode.toLowerCase().includes(q) ||
          t.requestor.toLowerCase().includes(q) ||
          t.task.toLowerCase().includes(q) ||
          t.location.toLowerCase().includes(q) ||
          t.department.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [tickets, searchQuery]);

  return (
    <div className="relative hidden sm:block" ref={searchRef}>
      <div className="relative flex items-center">
        <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 pointer-events-none" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onFocus={() => setSearchOpen(true)}
          onChange={(e) => {
            onSearchChange(e.target.value);
            setSearchOpen(true);
          }}
          placeholder="Search tickets, names, hubs... ( / )"
          className="pl-9 pr-8 py-1.5 bg-[#F4F6F9] border border-transparent focus:border-orange-400 focus:bg-white rounded-lg text-xs text-ink placeholder:text-zinc-400 focus:outline-none w-64 lg:w-72 transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              onSearchChange('');
              searchInputRef.current?.focus();
            }}
            className="absolute right-2.5 text-zinc-400 hover:text-zinc-600 p-0.5 rounded transition-colors"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {searchOpen && (
        <div className="absolute left-0 top-full mt-2 w-96 max-w-[90vw] bg-white rounded-xl shadow-2xl border border-zinc-200/90 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3.5 py-2.5 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between text-[11px] font-semibold text-zinc-600">
            <span>
              {searchQuery.trim()
                ? `Results for "${searchQuery}" (${searchResults.length})`
                : 'Recent Active Tickets'}
            </span>
            <span className="text-zinc-400 font-normal">Esc to close</span>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100">
            {searchResults.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500">
                <p className="font-semibold text-zinc-700">No matching tickets found</p>
                <p className="text-[11px] mt-1 text-zinc-400">
                  Try searching by ticket code (e.g. T-261042), requestor, or terminal hub.
                </p>
              </div>
            ) : (
              searchResults.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => {
                    onSelectTicket(ticket.id);
                    setSearchOpen(false);
                  }}
                  className="w-full text-left p-3 hover:bg-orange-50/50 active:bg-orange-50 transition-colors flex items-start gap-3 group"
                >
                  <div className="mt-0.5 shrink-0">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-900 text-white group-hover:bg-orange-600 transition-colors">
                      {ticket.ticketCode}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-ink truncate">
                        {ticket.task}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getStatusBadge(
                          ticket.status
                        )}`}
                      >
                        {ticket.status}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getPriorityBadge(
                          ticket.priority
                        )}`}
                      >
                        {ticket.priority}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
                      {ticket.requestor} • {ticket.location} • {ticket.department}
                    </p>
                    {ticket.description && (
                      <p className="text-[11px] text-zinc-400 mt-1 line-clamp-1 italic">
                        "{ticket.description}"
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-orange-500 shrink-0 self-center transition-colors" />
                </button>
              ))
            )}
          </div>

          {searchQuery.trim() && (
            <div className="p-2 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between text-[11px]">
              <span className="text-zinc-500">Showing top matches</span>
              <button
                type="button"
                onClick={() => {
                  onViewQueue();
                  setSearchOpen(false);
                }}
                className="text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1"
              >
                View in Ticket Queue <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
