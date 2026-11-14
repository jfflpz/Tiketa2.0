// @spec F-E3: Repeat-Requester Person -> Location/Department -> Ticket-Details Drilldown
import React, { useState, useCallback, useRef } from 'react';
import { Loader2, AlertCircle, X, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import type { ChronicRequestorRow } from '../../types/reportSchemas';
import {
  repeatRequesterApi,
  extractApiErrorMessage,
  type RepeatRequesterDrilldownResponse,
} from '../../../../api/client';
import { useAppStore } from '../../../../store/useAppStore';

export interface ChronicRequestorTableProps {
  data: ChronicRequestorRow[];
}

export const ChronicRequestorTable: React.FC<ChronicRequestorTableProps> = ({ data }) => {
  const setSelectedTicketId = useAppStore((state) => state.setSelectedTicketId);

  const [selectedPerson, setSelectedPerson] = useState<ChronicRequestorRow | null>(null);
  const [groupFilter, setGroupFilter] = useState<{ location_name?: string; department_name?: string } | null>(null);
  const [page, setPage] = useState(1);
  const [drilldown, setDrilldown] = useState<RepeatRequesterDrilldownResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadDrilldown = useCallback(
    async (
      person: ChronicRequestorRow,
      group: { location_name?: string; department_name?: string } | null,
      targetPage: number
    ) => {
      const reqId = ++requestIdRef.current;
      setIsLoading(true);
      setError(null);
      try {
        const res = await repeatRequesterApi.getDrilldown({
          requestor_name: person.requestorName,
          location_name: group?.location_name,
          department_name: group?.department_name,
          page: targetPage,
          page_size: 10,
        });
        if (reqId !== requestIdRef.current) return;
        setDrilldown(res);
      } catch (err: unknown) {
        if (reqId !== requestIdRef.current) return;
        setError(extractApiErrorMessage(err, 'Failed to load repeat-requester drilldown'));
      } finally {
        if (reqId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    []
  );

  const handleOpenDrilldown = (row: ChronicRequestorRow) => {
    setSelectedPerson(row);
    setGroupFilter(null);
    setPage(1);
    void loadDrilldown(row, null, 1);
  };

  const handleSelectGroup = (group: { location_name: string; department_name: string } | null) => {
    if (!selectedPerson) return;
    setGroupFilter(group);
    setPage(1);
    void loadDrilldown(selectedPerson, group, 1);
  };

  const handlePageChange = (nextPage: number) => {
    if (!selectedPerson) return;
    setPage(nextPage);
    void loadDrilldown(selectedPerson, groupFilter, nextPage);
  };

  // Deduplicate rows by ticket id for safety
  const uniqueItems = drilldown
    ? Array.from(new Map(drilldown.items.map((item) => [item.id, item])).values())
    : [];

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-canvas text-ink-subtle text-[11px] font-semibold border-y border-line">
              <th className="py-2.5 px-3 text-left">Requestor Name</th>
              <th className="py-2.5 px-3 text-left">Department</th>
              <th className="py-2.5 px-3 text-left">Location</th>
              <th className="py-2.5 px-3 text-right">Repeat Incidents</th>
              <th className="py-2.5 px-3 text-left">Dominant Issue</th>
              <th className="py-2.5 px-3 text-right">Remote Fix %</th>
              <th className="py-2.5 px-3 text-left">Target SOP Recommendation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {data.map((r, i) => (
              <tr key={`${r.requestorName}-${r.location}-${r.department}-${i}`} className="hover:bg-zinc-50/60 transition-colors">
                <td className="py-3 px-3 font-bold text-ink align-middle text-left">{r.requestorName}</td>
                <td className="py-3 px-3 align-middle text-left">{r.department}</td>
                <td className="py-3 px-3 font-mono align-middle text-left">{r.location}</td>
                <td className="py-3 px-3 font-mono font-bold text-amber-700 align-middle text-right">
                  <button
                    type="button"
                    onClick={() => handleOpenDrilldown(r)}
                    className="underline decoration-amber-400 hover:text-amber-900 cursor-pointer"
                    title="Drill down into location/department and ticket details"
                  >
                    {r.repeatIncidents} tickets
                  </button>
                </td>
                <td className="py-3 px-3 font-semibold align-middle text-left">{r.dominantTask}</td>
                <td className="py-3 px-3 font-mono align-middle text-right">{r.remoteResolutionRate}%</td>
                <td className="py-3 px-3 text-orange-600 font-medium align-middle text-left">{r.sopTrainingTarget}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Person -> Location/Department -> Ticket Details Drilldown */}
      {selectedPerson && (
        <div
          data-testid="repeat-requester-drilldown"
          className="bg-canvas border border-line rounded-2xl p-4 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-bold text-ink">
                Drilldown: {selectedPerson.requestorName}
              </h4>
              {drilldown && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white border border-line text-ink">
                  Reconciled Total: {drilldown.total_count}
                </span>
              )}
              {drilldown?.is_uncertain_legacy && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                  <AlertTriangle className="w-3 h-3" />
                  Uncertain Legacy Name Group (Unmerged)
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelectedPerson(null)}
              aria-label="Close drilldown"
              className="p-1 text-zinc-400 hover:text-zinc-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {isLoading ? (
            <div className="py-6 flex items-center justify-center gap-2 text-xs text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
              <span>Loading drilldown records...</span>
            </div>
          ) : error ? (
            <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => void loadDrilldown(selectedPerson, groupFilter, page)}
                className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-xs font-semibold"
              >
                Retry
              </button>
            </div>
          ) : drilldown ? (
            <>
              {/* Location / Department Group Filter Chips */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSelectGroup(null)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                    !groupFilter
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-white text-ink border-line'
                  }`}
                >
                  All Groups ({drilldown.total_count})
                </button>
                {drilldown.groups.map((g) => {
                  const isActive =
                    groupFilter?.location_name === g.location_name &&
                    groupFilter?.department_name === g.department_name;
                  return (
                    <button
                      key={`${g.location_name}-${g.department_name}`}
                      type="button"
                      onClick={() => handleSelectGroup(g)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                        isActive
                          ? 'bg-orange-600 text-white border-orange-600'
                          : 'bg-white text-ink border-line hover:bg-zinc-50'
                      }`}
                    >
                      {g.location_name} · {g.department_name} ({g.count})
                    </button>
                  );
                })}
              </div>

              {/* Ticket Details Table */}
              <div className="overflow-x-auto bg-white border border-line rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F8F9FA] text-zinc-500 text-[11px] font-bold border-b border-line">
                      <th className="py-2 px-3">Ticket Code</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Location / Dept</th>
                      <th className="py-2 px-3">Task</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {uniqueItems.map((item) => (
                      <tr key={item.id} className="hover:bg-zinc-50">
                        <td className="py-2 px-3 font-mono font-bold">
                          <button
                            type="button"
                            onClick={() => setSelectedTicketId(item.id)}
                            className="text-orange-600 hover:underline"
                          >
                            {item.ticket_code}
                          </button>
                        </td>
                        <td className="py-2 px-3 font-mono">{item.date_started}</td>
                        <td className="py-2 px-3">{item.location_name} · {item.department_name}</td>
                        <td className="py-2 px-3">{item.task_name}</td>
                        <td className="py-2 px-3 font-semibold">{item.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span>Page {drilldown.page}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => handlePageChange(page - 1)}
                    className="px-2.5 py-1 rounded-lg bg-white border border-line disabled:opacity-40 inline-flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3 h-3" /> Prev
                  </button>
                  <button
                    type="button"
                    disabled={!drilldown.has_more}
                    onClick={() => handlePageChange(page + 1)}
                    className="px-2.5 py-1 rounded-lg bg-white border border-line disabled:opacity-40 inline-flex items-center gap-1"
                  >
                    Next <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};
