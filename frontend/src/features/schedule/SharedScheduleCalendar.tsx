// @spec F-D3: Shared Dated-Assignment Calendar, Own-Profile Rescheduling & Approval Controls
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Check,
  X,
  AlertCircle,
  Loader2,
  MoveHorizontal,
  ExternalLink,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import {
  scheduleApi,
  extractApiErrorMessage,
  type CalendarAssignment,
  type RescheduleRequest,
} from '../../api/client';
import { StaffAvatar } from '../../components/common/StaffAvatar';

export interface SharedScheduleCalendarProps {
  onViewUndated?: () => void;
}

const getMonthString = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const buildMonthDays = (year: number, monthIndex: number): string[] => {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const days: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(
      `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    );
  }
  return days;
};

export const SharedScheduleCalendar: React.FC<SharedScheduleCalendarProps> = ({
  onViewUndated,
}) => {
  const currentUser = useAppStore((state) => state.currentUser);
  const setSelectedTicketId = useAppStore((state) => state.setSelectedTicketId);
  const addToast = useAppStore((state) => state.addToast);

  const [cursorDate, setCursorDate] = useState(() => new Date());
  const [assignments, setAssignments] = useState<CalendarAssignment[]>([]);
  const [requests, setRequests] = useState<RescheduleRequest[]>([]);
  const [undatedCount, setUndatedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedAssignment, setSelectedAssignment] = useState<CalendarAssignment | null>(null);
  const [draggedAssignmentId, setDraggedAssignmentId] = useState<string | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<CalendarAssignment | null>(null);
  const [proposedDate, setProposedDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [isSubmittingMove, setIsSubmittingMove] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  const [decidingRequestId, setDecidingRequestId] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  const monthKey = getMonthString(cursorDate);
  const isApprover =
    currentUser?.role === 'admin' || currentUser?.role === 'supervisor';

  const loadCalendar = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const data = await scheduleApi.getCalendarAssignments({ month: monthKey });
      if (reqId !== requestIdRef.current) return;
      setAssignments(Array.isArray(data.assignments) ? data.assignments : []);
      setRequests(Array.isArray(data.reschedule_requests) ? data.reschedule_requests : []);
      setUndatedCount(data.undated_tickets_count ?? 0);
    } catch (err: unknown) {
      if (reqId !== requestIdRef.current) return;
      setError(extractApiErrorMessage(err, 'Failed to load shared schedule calendar'));
    } finally {
      if (reqId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [monthKey]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  const submitMove = async (assignment: CalendarAssignment, targetDate: string, reason?: string) => {
    if (!currentUser || assignment.staff_id !== currentUser.id) {
      setMoveError('You can only reschedule your own scheduled profile.');
      return;
    }
    if (!targetDate || targetDate === assignment.scheduled_date || isSubmittingMove) {
      return;
    }
    setIsSubmittingMove(true);
    setMoveError(null);
    try {
      const res = await scheduleApi.submitRescheduleRequest({
        assignment_id: assignment.id,
        proposed_date: targetDate,
        reason: reason?.trim() || undefined,
      });

      if (res.applied_directly && res.assignment) {
        setAssignments((prev) =>
          prev.map((a) => (a.id === assignment.id ? res.assignment! : a))
        );
        addToast(
          'Schedule Updated',
          `${assignment.ticket_code} moved to ${res.assignment.scheduled_date}.`,
          'success'
        );
      } else if (res.request) {
        setRequests((prev) => [
          res.request!,
          ...prev.filter((r) => r.id !== res.request!.id),
        ]);
        addToast(
          'Reschedule Requested',
          `${assignment.ticket_code} remains on ${assignment.scheduled_date} pending approval for ${targetDate}.`,
          'info'
        );
      }
      setRescheduleTarget(null);
      setProposedDate('');
      setRescheduleReason('');
    } catch (err: unknown) {
      const msg = extractApiErrorMessage(err, 'Failed to submit reschedule request');
      setMoveError(msg);
      addToast('Reschedule Failed', msg, 'warning');
    } finally {
      setIsSubmittingMove(false);
      setDraggedAssignmentId(null);
    }
  };

  const handleDecision = async (req: RescheduleRequest, decision: 'approved' | 'rejected') => {
    if (!isApprover || decidingRequestId) return;
    setDecidingRequestId(req.id);
    setDecisionError(null);
    try {
      const updated = await scheduleApi.decideRescheduleRequest(req.id, { decision });
      setRequests((prev) => prev.map((r) => (r.id === req.id ? updated : r)));
      if (decision === 'approved') {
        setAssignments((prev) =>
          prev.map((a) =>
            a.id === req.assignment_id
              ? { ...a, scheduled_date: updated.proposed_date }
              : a
          )
        );
      }
      addToast(
        decision === 'approved' ? 'Reschedule Approved' : 'Reschedule Rejected',
        `${req.ticket_code} ${decision}.`,
        decision === 'approved' ? 'success' : 'info'
      );
    } catch (err: unknown) {
      const msg = extractApiErrorMessage(err, 'Failed to save reschedule decision');
      setDecisionError(msg);
      addToast('Decision Failed', msg, 'warning');
    } finally {
      setDecidingRequestId(null);
    }
  };

  const days = buildMonthDays(cursorDate.getFullYear(), cursorDate.getMonth());
  const pendingByAssignment = new Map<string, RescheduleRequest>();
  for (const r of requests) {
    if (r.status === 'pending') {
      pendingByAssignment.set(r.assignment_id, r);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#ECEEF2] rounded-2xl p-4 sm:p-5 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#ECEEF2]">
          <div className="flex items-center gap-2.5">
            <CalendarIcon className="w-4 h-4 text-orange-500" />
            <div>
              <h2 className="text-sm font-bold text-ink">Shared Assignment Schedule</h2>
              <p className="text-[11px] text-zinc-500">
                Drag your own profile or use Reschedule to propose a new date.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onViewUndated && (
              <button
                type="button"
                onClick={onViewUndated}
                className="px-3 py-1.5 rounded-xl bg-canvas border border-[#ECEEF2] hover:bg-zinc-100 text-xs font-semibold text-ink"
              >
                Undated Work ({undatedCount})
              </button>
            )}
            <div className="inline-flex items-center gap-1 bg-canvas border border-[#ECEEF2] rounded-xl p-1">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() =>
                  setCursorDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
                }
                className="p-1 rounded-lg hover:bg-white text-zinc-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-xs font-bold text-ink min-w-[110px] text-center">
                {cursorDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button
                type="button"
                aria-label="Next month"
                onClick={() =>
                  setCursorDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
                }
                className="p-1 rounded-lg hover:bg-white text-zinc-600"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {moveError && (
          <div role="alert" className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{moveError}</span>
          </div>
        )}

        {isLoading ? (
          <div className="py-12 flex items-center justify-center gap-2 text-xs text-zinc-500">
            <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
            <span>Loading schedule calendar...</span>
          </div>
        ) : error ? (
          <div role="alert" className="py-8 text-center space-y-2">
            <p className="text-xs font-semibold text-rose-600">{error}</p>
            <button
              type="button"
              onClick={loadCalendar}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 text-white text-xs font-semibold"
            >
              Retry
            </button>
          </div>
        ) : assignments.length === 0 ? (
          <div className="py-10 text-center space-y-1 text-xs text-zinc-500">
            <p className="font-semibold text-ink">No dated assignments scheduled for {monthKey}</p>
            <p>Undated tickets remain accessible in the Job Logs Ledger and Ticket Queue.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {days.map((day) => {
              const dayItems = assignments.filter((a) => a.scheduled_date === day);
              return (
                <div
                  key={day}
                  data-testid={`calendar-day-${day}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    const dragged = assignments.find((a) => a.id === draggedAssignmentId);
                    if (dragged) {
                      void submitMove(dragged, day);
                    }
                  }}
                  className="min-h-[110px] rounded-xl border border-[#ECEEF2] bg-[#F8F9FA] p-2 space-y-1.5"
                >
                  <div className="text-[11px] font-mono font-bold text-zinc-500">
                    {day.slice(-2)}
                  </div>
                  {dayItems.map((item) => {
                    const isOwn = Boolean(currentUser && item.staff_id === currentUser.id);
                    const pendingReq = pendingByAssignment.get(item.id);
                    return (
                      <div
                        key={item.id}
                        data-testid={`assignment-card-${item.id}`}
                        draggable={isOwn}
                        onDragStart={() => {
                          if (isOwn) setDraggedAssignmentId(item.id);
                        }}
                        className={`p-1.5 rounded-lg border text-[11px] space-y-1 transition-colors ${
                          isOwn
                            ? 'bg-white border-orange-300 cursor-grab'
                            : 'bg-white/90 border-[#ECEEF2]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedAssignment(item)}
                          className="w-full text-left flex items-center gap-1.5"
                        >
                          <StaffAvatar name={item.staff_name} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-ink truncate">{item.staff_name}</div>
                            <div className="text-[10px] font-mono text-zinc-500 truncate">
                              {item.ticket_code}
                            </div>
                          </div>
                        </button>
                        {pendingReq && (
                          <div className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-[9px] font-bold text-amber-800">
                            Pending → {pendingReq.proposed_date}
                          </div>
                        )}
                        {isOwn && (
                          <button
                            type="button"
                            onClick={() => {
                              setRescheduleTarget(item);
                              setProposedDate(item.scheduled_date);
                              setMoveError(null);
                            }}
                            className="w-full py-0.5 px-1.5 rounded bg-orange-50 hover:bg-orange-100 text-orange-700 text-[10px] font-semibold inline-flex items-center justify-center gap-1"
                          >
                            <MoveHorizontal className="w-3 h-3" />
                            <span>Reschedule</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Keyboard / Mobile Reschedule Form */}
      {rescheduleTarget && (
        <div className="bg-white border border-orange-200 rounded-2xl p-4 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-ink">
              Reschedule {rescheduleTarget.ticket_code} (Current: {rescheduleTarget.scheduled_date})
            </h3>
            <button
              type="button"
              onClick={() => setRescheduleTarget(null)}
              className="text-zinc-400 hover:text-zinc-700"
              aria-label="Cancel reschedule"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="text-xs font-semibold text-ink">
              Proposed Date
              <input
                type="date"
                value={proposedDate}
                onChange={(e) => setProposedDate(e.target.value)}
                className="mt-1 w-full px-3 py-1.5 bg-canvas border border-line rounded-xl text-xs"
              />
            </label>
            <label className="text-xs font-semibold text-ink">
              Reason (Optional)
              <input
                type="text"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="e.g. Terminal hardware delivery delayed"
                className="mt-1 w-full px-3 py-1.5 bg-canvas border border-line rounded-xl text-xs"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={isSubmittingMove || !proposedDate || proposedDate === rescheduleTarget.scheduled_date}
              onClick={() => void submitMove(rescheduleTarget, proposedDate, rescheduleReason)}
              className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white text-xs font-bold"
            >
              {isSubmittingMove ? 'Submitting...' : 'Submit Move'}
            </button>
          </div>
        </div>
      )}

      {/* Permission-Scoped Task Popup */}
      {selectedAssignment && (
        <div
          data-testid="schedule-task-popup"
          className="bg-white border border-[#ECEEF2] rounded-2xl p-4 shadow-card space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-ink">
              {selectedAssignment.ticket_code} — {selectedAssignment.task_name}
            </div>
            <button
              type="button"
              onClick={() => setSelectedAssignment(null)}
              className="text-zinc-400 hover:text-zinc-700"
              aria-label="Close task popup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-zinc-600">
            Assigned: <strong>{selectedAssignment.staff_name}</strong> · Scheduled:{' '}
            <span className="font-mono">{selectedAssignment.scheduled_date}</span>
          </p>
          {(isApprover || selectedAssignment.staff_id === currentUser?.id) ? (
            <button
              type="button"
              onClick={() => setSelectedTicketId(selectedAssignment.ticket_id)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 text-white text-xs font-semibold"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Ticket Details</span>
            </button>
          ) : (
            <p className="text-[11px] text-zinc-400">
              Ticket details and conversations are restricted to the assigned technician, Supervisor, or Admin.
            </p>
          )}
        </div>
      )}

      {/* Reschedule Requests & Approver Controls */}
      {requests.length > 0 && (
        <div className="bg-white border border-[#ECEEF2] rounded-2xl p-4 shadow-card space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
              Reschedule Requests ({requests.length})
            </h3>
          </div>
          {decisionError && (
            <div role="alert" className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {decisionError}
            </div>
          )}
          <div className="divide-y divide-[#ECEEF2]">
            {requests.map((req) => (
              <div
                key={req.id}
                data-testid={`reschedule-request-${req.id}`}
                className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-ink">
                    {req.ticket_code} · {req.requester_name}
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {req.original_date} → <strong>{req.proposed_date}</strong>
                    {req.reason ? ` · "${req.reason}"` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      req.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : req.status === 'rejected'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {req.status}
                  </span>
                  {isApprover && req.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        disabled={decidingRequestId === req.id}
                        onClick={() => void handleDecision(req, 'approved')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-[11px] font-bold inline-flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>Approve</span>
                      </button>
                      <button
                        type="button"
                        disabled={decidingRequestId === req.id}
                        onClick={() => void handleDecision(req, 'rejected')}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-[11px] font-bold inline-flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        <span>Reject</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
