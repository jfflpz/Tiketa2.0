// @spec FR-REPT-06 & FR-REPT-07: 15 Bus Terminal Station Monitor, Hardware Hotspots & PMS Compliance Tracker
import React, { useState } from 'react';
import {
  Building2,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Plus,
  Search,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { LOCATIONS } from '../../data/mockTicketsData';

interface TerminalMeta {
  code: string;
  name: string;
  region: string;
  devicesCount: number;
  pmsCompleted: number;
  hotspot: string;
  lastPmsDate: string;
}

const TERMINAL_HUB_METADATA: TerminalMeta[] = LOCATIONS.map((loc, idx) => {
  const hotspots = [
    'Epson Thermal Receipt Printer',
    'POS Ticketing Booth LAN',
    'CCTV NVR & Camera Feed',
    'Cashier PC Power / UPS',
    'Wi-Fi AP & Dispatch Router',
  ];
  const devices = 14 + ((idx * 3) % 12);
  const completed =
    idx % 5 === 0
      ? Math.max(4, devices - 6)
      : idx % 3 === 0
      ? devices - 2
      : devices;

  return {
    code: loc.code,
    name: loc.name,
    region: idx < 5 ? 'Metro Manila & Central Hub' : 'Provincial Terminal Hub',
    devicesCount: devices,
    pmsCompleted: completed,
    hotspot: hotspots[idx % hotspots.length],
    lastPmsDate: `2026-10-${String(1 + (idx % 15)).padStart(2, '0')}`,
  };
});

export const TerminalHubsView: React.FC = () => {
  const { tickets, createTicket, setActiveView } = useAppStore();
  const [hubSearch, setHubSearch] = useState('');

  const filteredHubs = TERMINAL_HUB_METADATA.filter(
    (h) =>
      !hubSearch.trim() ||
      h.name.toLowerCase().includes(hubSearch.toLowerCase()) ||
      h.code.toLowerCase().includes(hubSearch.toLowerCase()) ||
      h.hotspot.toLowerCase().includes(hubSearch.toLowerCase())
  );

  const handleLogRoutinePms = (hub: TerminalMeta) => {
    createTicket({
      company: 'Pangasinan Five Star Bus Co.',
      companyCode: 'FS',
      location: hub.name,
      locationCode: hub.code,
      department: 'Operation',
      departmentCode: 'OPS',
      requestor: `${hub.name} Dispatcher`,
      taskCode: 'PC-PMS',
      description: `Scheduled Preventive Maintenance (PMS) checkup for ${hub.devicesCount} terminal workstations and ${hub.hotspot}.`,
      mode: 'SITE',
      intakeSource: 'Walk-in / Viber',
    });
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink tracking-tight">
            15 Bus Terminal Hubs &amp; PMS Compliance
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Monitor station ticket load, recurring hardware hotspots (FR-REPT-06), and Preventive Maintenance schedules (FR-REPT-07).
          </p>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={hubSearch}
            onChange={(e) => setHubSearch(e.target.value)}
            placeholder="Search 15 terminals..."
            className="pl-8 pr-3 py-2 bg-white border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-400 w-56 shadow-card"
          />
        </div>
      </div>

      {/* 15 Station Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredHubs.map((hub) => {
          const activeHubTickets = tickets.filter(
            (t) => t.locationCode === hub.code && t.status !== 'CLSD'
          );
          const compliancePct = Math.round(
            (hub.pmsCompleted / hub.devicesCount) * 100
          );

          const isOverdue = compliancePct < 75;
          const isDueSoon = compliancePct >= 75 && compliancePct < 95;

          return (
            <div
              key={hub.code}
              className="bg-white border border-[#ECEEF2] rounded-2xl p-5 shadow-card flex flex-col justify-between space-y-4 hover:border-orange-300 transition-all"
            >
              {/* Card Top */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 border border-orange-200/60 flex items-center justify-center font-mono text-xs font-extrabold shrink-0">
                      {hub.code}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-ink">{hub.name}</h3>
                      <p className="text-[11px] text-zinc-400">{hub.region}</p>
                    </div>
                  </div>

                  {/* PMS Status Badge */}
                  {isOverdue ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                      <ShieldAlert className="w-3 h-3" />
                      PMS Overdue
                    </span>
                  ) : isDueSoon ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                      <AlertTriangle className="w-3 h-3" />
                      PMS Due
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3" />
                      Compliant
                    </span>
                  )}
                </div>

                {/* Live Stats Box */}
                <div className="grid grid-cols-2 gap-2 bg-[#F4F6F9] rounded-xl p-3 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-400 block">
                      Active Tickets
                    </span>
                    <span className="font-mono font-bold text-ink text-sm">
                      {activeHubTickets.length} Open
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block">
                      Workstations
                    </span>
                    <span className="font-mono font-bold text-ink text-sm">
                      {hub.pmsCompleted}/{hub.devicesCount} Serviced
                    </span>
                  </div>
                </div>

                {/* Hardware Hotspot Line */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-orange-500" />
                    Primary Hotspot:
                  </span>
                  <span className="font-semibold text-ink truncate max-w-[175px]">
                    {hub.hotspot}
                  </span>
                </div>

                {/* PMS Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500 font-medium">
                      PMS Audit Compliance
                    </span>
                    <span className="font-mono font-bold text-ink">
                      {compliancePct}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
                    <div
                      style={{ width: `${compliancePct}%` }}
                      className={`h-full rounded-full ${
                        isOverdue
                          ? 'bg-rose-500'
                          : isDueSoon
                          ? 'bg-amber-500'
                          : 'bg-orange-500'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-2 border-t border-[#ECEEF2] flex items-center justify-between gap-2">
                <button
                  onClick={() => setActiveView('overview')}
                  className="px-3 py-1.5 rounded-lg bg-[#F4F6F9] hover:bg-zinc-200/70 text-zinc-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors press-fx"
                >
                  <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                  <span>View Queue</span>
                </button>

                <button
                  onClick={() => handleLogRoutinePms(hub)}
                  className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold inline-flex items-center gap-1 shadow-sm transition-colors press-fx"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log Routine PMS</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
