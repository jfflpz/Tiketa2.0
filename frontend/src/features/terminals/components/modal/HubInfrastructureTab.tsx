import React from 'react';
import { Wrench, Wifi, HardDrive } from 'lucide-react';
import type { TerminalMeta } from '../../TerminalHubDetailModal';

export interface HubInfrastructureTabProps {
  hub: TerminalMeta;
}

export const HubInfrastructureTab: React.FC<HubInfrastructureTabProps> = ({ hub }) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-ink">
          Hardware &amp; Infrastructure Hotspots
        </h3>
        <p className="text-xs text-zinc-500">
          Network gateway status, primary failure points, and hardware topology.
        </p>
      </div>

      {/* Primary Hotspot Banner */}
      <div className="bg-orange-50/70 border border-orange-200 rounded-2xl p-4 flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
          <Wrench className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 block">
            Primary Station Hotspot
          </span>
          <h4 className="text-sm font-bold text-ink mt-0.5">
            {hub.hotspot}
          </h4>
          <p className="text-xs text-zinc-600 mt-1">
            Historically subject to frequent dispatch tickets due to continuous passenger ticketing volume, paper roll dust, and thermal duty cycle.
          </p>
        </div>
      </div>

      {/* Network & Infrastructure Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div className="bg-white border border-[#ECEEF2] rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-ink">
            <Wifi className="w-4 h-4 text-emerald-600" />
            <span>Station Network Connectivity</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-[#ECEEF2]">
              <span className="text-zinc-500">VLAN Segment</span>
              <span className="font-mono font-bold text-ink">VLAN 20 (Transit Ops)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#ECEEF2]">
              <span className="text-zinc-500">Gateway Latency</span>
              <span className="font-mono font-bold text-emerald-600">&lt;2ms (Optical fiber)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#ECEEF2]">
              <span className="text-zinc-500">Core Switch Uplink</span>
              <span className="font-mono font-bold text-ink">Port Gi0/1 - Trunk 1Gbps</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-zinc-500">Wi-Fi AP Coverage</span>
              <span className="font-mono font-bold text-ink">2x Ubiquiti U6 Pro Active</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#ECEEF2] rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-ink">
            <HardDrive className="w-4 h-4 text-zinc-700" />
            <span>Hardware Assets Breakdown</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-[#ECEEF2]">
              <span className="text-zinc-500">Total Workstations</span>
              <span className="font-mono font-bold text-ink">{hub.devicesCount} Units</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#ECEEF2]">
              <span className="text-zinc-500">Ticketing Thermal Printers</span>
              <span className="font-mono font-bold text-ink">6x Epson TM-T82</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#ECEEF2]">
              <span className="text-zinc-500">CCTV NVR Server</span>
              <span className="font-mono font-bold text-ink">1x Hikvision 16-ch (8TB)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-zinc-500">Backup Power (UPS)</span>
              <span className="font-mono font-bold text-emerald-600">3x APC 1500VA Online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
