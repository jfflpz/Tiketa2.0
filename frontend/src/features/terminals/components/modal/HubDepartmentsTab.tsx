import React from 'react';
import {
  Printer,
  Radio,
  Users,
  ShieldAlert,
  Building2,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import type { Ticket } from '../../../../types/ticket';
import type { TerminalMeta } from '../../TerminalHubDetailModal';

export interface HubDepartmentInfo {
  code: string;
  name: string;
  workstationsCount: number;
  primaryEquipment: string;
  icon: React.ElementType;
}

export const HUB_DEPARTMENTS_CONFIG: HubDepartmentInfo[] = [
  {
    code: 'CASH',
    name: 'Cash Management & Ticketing Booths',
    workstationsCount: 6,
    primaryEquipment: 'Epson TM-T82 Thermal Printers, Cash Drawers, Honeywell 2D Scanners, Cashier PCs',
    icon: Printer,
  },
  {
    code: 'OPS',
    name: 'Operations & Fleet Dispatch',
    workstationsCount: 4,
    primaryEquipment: 'Dispatch Server PC, Fleet GPS Tracking Monitors, UHF Base Station Radio, Trip Manifest Printers',
    icon: Radio,
  },
  {
    code: 'CS',
    name: 'Customer Service & Passenger Information',
    workstationsCount: 2,
    primaryEquipment: 'Passenger Inquiries Workstation, PA Audio System, Departure Schedule TV Monitors',
    icon: Users,
  },
  {
    code: 'SEC',
    name: 'Security & CCTV Surveillance',
    workstationsCount: 2,
    primaryEquipment: 'Hikvision 16-ch NVR Server, 4x CCTV Multi-Screen Monitor Wall, Gate Intercom',
    icon: ShieldAlert,
  },
  {
    code: 'ADMIN',
    name: 'Station Administration & Accounting',
    workstationsCount: 3,
    primaryEquipment: 'Terminal Manager PC, ZKTeco Biometrics Attendance Clock, HP LaserJet Pro, VoIP Desk Phones',
    icon: Building2,
  },
  {
    code: 'MAINT',
    name: 'Terminal Maintenance & Technical Bay',
    workstationsCount: 1,
    primaryEquipment: 'Bus OBD-II Diagnostic Laptop, Tool Inventory PC, Backup Power Inverter Monitor',
    icon: Wrench,
  },
];

export interface HubDepartmentsTabProps {
  hub: TerminalMeta;
  activeTickets: Ticket[];
  onOpenTicketDrawer: (ticketId: string) => void;
}

export const HubDepartmentsTab: React.FC<HubDepartmentsTabProps> = ({
  hub,
  activeTickets,
  onOpenTicketDrawer,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-ink">
            Operating Departments at {hub.name}
          </h3>
          <p className="text-xs text-zinc-500">
            Active terminal stations, workstation allocations, and assigned peripheral hardware.
          </p>
        </div>
        <span className="text-xs text-zinc-400 font-medium">
          {HUB_DEPARTMENTS_CONFIG.length} on-site units
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {HUB_DEPARTMENTS_CONFIG.map((dept) => {
          const Icon = dept.icon;
          const deptTickets = activeTickets.filter(
            (t) =>
              t.departmentCode === dept.code ||
              t.department.toLowerCase().includes(dept.code.toLowerCase())
          );
          const hasIssue = deptTickets.length > 0;

          return (
            <div
              key={dept.code}
              className={`p-4 rounded-2xl border transition-all ${
                hasIssue
                  ? 'bg-amber-50/40 border-amber-200'
                  : 'bg-white border-[#ECEEF2] hover:border-zinc-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      hasIssue
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-zinc-100 text-zinc-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-ink leading-tight">
                      {dept.name}
                    </h4>
                    <span className="font-mono text-[10px] text-zinc-400 font-semibold">
                      {dept.code} • {dept.workstationsCount} Workstations
                    </span>
                  </div>
                </div>

                {hasIssue ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold shrink-0">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    {deptTickets.length} Open
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Normal
                  </span>
                )}
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#ECEEF2] text-[11px] text-zinc-500">
                <span className="font-semibold text-zinc-700 block mb-0.5">
                  Assigned Equipment:
                </span>
                <p className="line-clamp-2 text-zinc-600 text-[11px] leading-relaxed">
                  {dept.primaryEquipment}
                </p>
              </div>

              {hasIssue && (
                <div className="mt-2.5 pt-2 border-t border-amber-200/80">
                  {deptTickets.map((dt) => (
                    <button
                      key={dt.id}
                      type="button"
                      onClick={() => onOpenTicketDrawer(dt.id)}
                      className="w-full text-left p-1.5 rounded-lg bg-white/90 hover:bg-white text-[11px] flex items-center justify-between border border-amber-200 text-ink press-fx"
                    >
                      <span className="font-mono font-bold text-orange-600">
                        {dt.ticketCode}
                      </span>
                      <span className="font-medium truncate max-w-[170px] text-zinc-700">
                        {dt.task}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
