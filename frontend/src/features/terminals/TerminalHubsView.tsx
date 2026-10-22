// @spec FR-REPT-06: 15 Bus Terminal Station Monitor, Active Tickets, Hardware Hotspots & History (PMS Removed)
import React, { useState } from 'react';
import {
  Building2,
  Wrench,
  Search,
  Clock,
  Check,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { LOCATIONS } from '../../constants/domain';
import { StatusBadge } from '../../components/common/StatusBadge';
import { TerminalHubDetailModal, TerminalMeta } from './TerminalHubDetailModal';

const TERMINAL_HUB_METADATA: TerminalMeta[] = LOCATIONS.map((loc, idx) => {
  const hotspots = [
    'Epson Thermal Receipt Printer',
    'POS Ticketing Booth LAN',
    'CCTV NVR & Camera Feed',
    'Cashier PC Power / UPS',
    'Wi-Fi AP & Dispatch Router',
  ];
  const devices = 14 + ((idx * 3) % 12);

  return {
    code: loc.code,
    name: loc.name,
    region: idx < 5 ? 'Metro Manila & Central Hub' : 'Provincial Terminal Hub',
    devicesCount: devices,
    hotspot: hotspots[idx % hotspots.length],
    networkStatus: 'VLAN 20 Online • <2ms ping',
  };
});

export const TerminalHubsView: React.FC = () => {
  const tickets = useAppStore((state) => state.tickets);
  const setSelectedTicketId = useAppStore((state) => state.setSelectedTicketId);
  const [hubSearch, setHubSearch] = useState('');
  const [selectedHub, setSelectedHub] = useState<TerminalMeta | null>(null);

  const filteredHubs = TERMINAL_HUB_METADATA.filter(
    (h) =>
      !hubSearch.trim() ||
      h.name.toLowerCase().includes(hubSearch.toLowerCase()) ||
      h.code.toLowerCase().includes(hubSearch.toLowerCase()) ||
      h.hotspot.toLowerCase().includes(hubSearch.toLowerCase())
  );

  return (
    <div className="space-y-5 pb-8">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink tracking-tight">
            15 Bus Terminal Hubs Monitor
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Real-time status of 15 transit stations: active repair dispatches, hardware hotspots, and ticket history.
          </p>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={hubSearch}
            onChange={(e) => setHubSearch(e.target.value)}
            placeholder="Search 15 terminals..."
            className="pl-8 pr-3 py-2 bg-white border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-400 w-64 shadow-card"
          />
        </div>
      </div>

      {/* 15 Station Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredHubs.map((hub) => {
          // Hub tickets
          const hubTickets = tickets.filter((t) => t.locationCode === hub.code);
          const activeHubTickets = hubTickets.filter((t) => t.status !== 'CLSD');
          const resolvedHubTickets = hubTickets.filter((t) => t.status === 'CLSD' || t.status === 'RESL');

          return (
            <div
              key={hub.code}
              onClick={() => setSelectedHub(hub)}
              className="bg-white border border-[#ECEEF2] rounded-2xl p-5 shadow-card flex flex-col justify-between space-y-4 hover:border-orange-400 hover:shadow-lg transition-all cursor-pointer group"
            >
              <div className="space-y-3.5">
                {/* Card Top: Code + Name + Region */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-200/60 flex items-center justify-center font-mono text-xs font-extrabold shrink-0 group-hover:scale-105 transition-transform">
                      {hub.code}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-ink group-hover:text-orange-600 transition-colors">
                        {hub.name}
                      </h3>
                      <p className="text-[11px] text-zinc-400">{hub.region}</p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                </div>

                {/* Hub Hardware & Device Counts */}
                <div className="grid grid-cols-2 gap-2 bg-[#F4F6F9] rounded-xl p-3 text-xs">
                  <div>
                    <span className="text-[10px] font-semibold text-zinc-400 block">
                      Active Tickets
                    </span>
                    <span className="font-mono font-bold text-ink text-sm">
                      {activeHubTickets.length} Open
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-zinc-400 block">
                      Workstations &amp; POS
                    </span>
                    <span className="font-mono font-bold text-ink text-sm">
                      {hub.devicesCount} Units
                    </span>
                  </div>
                </div>

                {/* Hardware Hotspot Line */}
                <div className="flex items-center justify-between text-xs py-1 border-b border-[#ECEEF2]">
                  <span className="text-zinc-500 flex items-center gap-1.5 font-medium">
                    <Wrench className="w-3.5 h-3.5 text-orange-500" />
                    Primary Hotspot:
                  </span>
                  <span className="font-semibold text-ink truncate max-w-[170px]">
                    {hub.hotspot}
                  </span>
                </div>

                {/* Active Tickets List (Preview) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold uppercase tracking-wider text-zinc-400">
                      Active Tickets ({activeHubTickets.length})
                    </span>
                    {activeHubTickets.length > 0 && (
                      <span className="text-[10px] text-orange-600 font-semibold flex items-center gap-0.5">
                        <Info className="w-3 h-3" />
                        Click to inspect
                      </span>
                    )}
                  </div>

                  {activeHubTickets.length === 0 ? (
                    <div className="p-3 bg-zinc-50 rounded-xl text-center text-[11px] text-zinc-500">
                      <p className="font-medium text-emerald-700 flex items-center justify-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" />
                        All terminal systems operational
                      </p>
                    </div>
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

                {/* Ticket Resolution History */}
                <div className="pt-1 flex items-center justify-between text-[11px] text-zinc-500">
                  <span className="flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    Resolved History:
                  </span>
                  <span className="font-bold text-ink">
                    {resolvedHubTickets.length} closed this month
                  </span>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-[#ECEEF2] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedHub(hub);
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

      {/* Terminal Hub Details Modal */}
      <TerminalHubDetailModal
        hub={selectedHub}
        onClose={() => setSelectedHub(null)}
      />
    </div>
  );
};
