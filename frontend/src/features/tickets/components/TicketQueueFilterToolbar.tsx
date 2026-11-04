import React from 'react';
import { Search } from 'lucide-react';
import type { QueueFilterTab } from '../../../store/useAppStore';
import { LOCATIONS } from '../../../constants/domain';
import type { Location } from '../../../types';

export interface TicketQueueFilterToolbarProps {
  filterTab: QueueFilterTab;
  onSelectFilterTab: (tab: QueueFilterTab) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  locationFilter: string;
  onLocationFilterChange: (location: string) => void;
  ticketCounts: {
    all: number;
    open: number;
    myActive: number;
    resl: number;
    clsd: number;
  };
}

export const TicketQueueFilterToolbar: React.FC<TicketQueueFilterToolbarProps> = ({
  filterTab,
  onSelectFilterTab,
  searchQuery,
  onSearchChange,
  locationFilter,
  onLocationFilterChange,
  ticketCounts,
}) => {
  const tabs = [
    { id: 'ALL' as const, label: 'All Tickets', count: ticketCounts.all },
    { id: 'OPEN' as const, label: 'Unassigned Pool', count: ticketCounts.open },
    { id: 'MY_ACTIVE' as const, label: 'Active Repairs', count: ticketCounts.myActive },
    { id: 'RESL' as const, label: 'Pending Sign-Off', count: ticketCounts.resl },
    { id: 'CLSD' as const, label: 'Verified Closed', count: ticketCounts.clsd },
  ];

  return (
    <div className="bg-white border border-[#ECEEF2] rounded-2xl p-4 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-3">
      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectFilterTab(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 press-fx ${
              filterTab === tab.id
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                filterTab === tab.id ? 'bg-zinc-700 text-white' : 'bg-zinc-100 text-zinc-600'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search & Location Filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 md:w-60">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search code, task, requestor..."
            className="w-full pl-8 pr-3 py-1.5 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink placeholder:text-zinc-400 focus:outline-none focus:border-orange-500"
          />
        </div>

        <select
          value={locationFilter}
          onChange={(e) => onLocationFilterChange(e.target.value)}
          className="px-2.5 py-1.5 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500"
        >
          <option value="ALL">All 15 Hubs</option>
          {LOCATIONS.map((loc: Location | { code: string; name: string }) => (
            <option key={loc.code} value={loc.code}>
              {loc.code} - {loc.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
