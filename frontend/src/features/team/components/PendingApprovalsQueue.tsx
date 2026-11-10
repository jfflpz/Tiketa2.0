// @spec F-03: Supervisor Account Proposals & Approval Queue
import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  UserCheck,
  Copy,
  Check,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { accountRequestsApi, AccountRequestApprovalResult } from '../../../api/client';
import type { AccountRequest } from '../../../types/team';
import { useAppStore } from '../../../store/useAppStore';
import { normalizeApiError } from '../../../utils/errorUtils';

export const PendingApprovalsQueue: React.FC = () => {
  const currentUser = useAppStore((state) => state.currentUser);
  const addToast = useAppStore((state) => state.addToast);
  const fetchITMembers = useAppStore((state) => state.fetchITMembers);

  const isSupervisor = currentUser?.role === 'supervisor';

  const [requests, setRequests] = useState<AccountRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inFlightId, setInFlightId] = useState<string | null>(null);

  // Reject modal state
  const [rejectModalReq, setRejectModalReq] = useState<AccountRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Approval credential disclosure modal state
  const [credentialResult, setCredentialResult] = useState<AccountRequestApprovalResult | null>(null);
  const [hasCopiedPassword, setHasCopiedPassword] = useState(false);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const data = await accountRequestsApi.list();
      setRequests(data);
    } catch (err) {
      addToast('Error Loading Approvals', normalizeApiError(err, 'Failed to fetch account proposals'), 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (req: AccountRequest) => {
    setInFlightId(req.id);
    try {
      const result = await accountRequestsApi.approve(req.id);
      addToast('Proposal Approved', `Account for ${req.full_name} has been activated.`, 'success');
      setCredentialResult(result);
      await loadRequests();
      await fetchITMembers();
    } catch (err: any) {
      if (err?.response?.status === 409) {
        addToast('Conflict', 'This proposal was already reviewed by another supervisor.', 'warning');
        await loadRequests();
      } else {
        addToast('Approval Failed', normalizeApiError(err, 'Could not approve proposal'), 'warning');
      }
    } finally {
      setInFlightId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModalReq) return;
    if (!rejectReason.trim()) {
      addToast('Reason Required', 'Please provide an actionable reason for rejection.', 'warning');
      return;
    }

    setInFlightId(rejectModalReq.id);
    try {
      await accountRequestsApi.reject(rejectModalReq.id, rejectReason.trim());
      addToast('Proposal Rejected', `Account request for ${rejectModalReq.full_name} was rejected.`, 'info');
      setRejectModalReq(null);
      setRejectReason('');
      await loadRequests();
    } catch (err: any) {
      if (err?.response?.status === 409) {
        addToast('Conflict', 'This proposal was already reviewed by another supervisor.', 'warning');
        setRejectModalReq(null);
        await loadRequests();
      } else {
        addToast('Rejection Failed', normalizeApiError(err, 'Could not reject proposal'), 'warning');
      }
    } finally {
      setInFlightId(null);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const pastRequests = requests.filter((r) => r.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Top Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-ink flex items-center gap-2">
            <span>Account Governance &amp; Proposals Queue</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700">
              {pendingRequests.length} Pending
            </span>
          </h3>
          <p className="text-xs text-zinc-500">
            {isSupervisor
              ? 'Review, approve, or reject administrative staff creation and deactivation proposals.'
              : 'View status of your staff creation and deactivation proposals awaiting Supervisor review.'}
          </p>
        </div>
        <button
          type="button"
          onClick={loadRequests}
          disabled={isLoading}
          className="p-2 rounded-xl bg-white border border-[#ECEEF2] text-zinc-600 hover:text-ink text-xs font-semibold flex items-center gap-1.5 press-fx disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Pending Proposals Section */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Pending Supervisor Decisions ({pendingRequests.length})
        </h4>

        {pendingRequests.length === 0 ? (
          <div className="bg-white border border-[#ECEEF2] rounded-3xl p-8 text-center space-y-2 shadow-card">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
            <h5 className="text-xs font-bold text-ink">All Proposals Reviewed</h5>
            <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
              There are no pending staff creation or deactivation requests waiting for supervisor sign-off.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingRequests.map((req) => {
              const isActionRunning = inFlightId === req.id;

              return (
                <div
                  key={req.id}
                  className="bg-white border border-orange-200/90 rounded-2xl p-4 shadow-card space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-xs shrink-0">
                          <UserCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-ink">{req.full_name}</h4>
                          <span className="text-[11px] text-zinc-400">@{req.username}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                        Pending
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                      <div>
                        <span className="text-zinc-400 block">Proposed Role:</span>
                        <span className="font-semibold text-ink uppercase">{req.role}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400 block">Department:</span>
                        <span className="font-medium text-ink truncate">{req.department || 'General IT'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400 block">Proposed By:</span>
                        <span className="font-medium text-ink">{req.requester_name || 'Admin'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400 block">Requested At:</span>
                        <span className="text-zinc-600">{new Date(req.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for Supervisor only */}
                  {isSupervisor ? (
                    <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
                      <button
                        type="button"
                        onClick={() => setRejectModalReq(req)}
                        disabled={isActionRunning}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-zinc-100 hover:bg-rose-50 hover:text-rose-700 text-zinc-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors press-fx disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApprove(req)}
                        disabled={isActionRunning}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors press-fx disabled:opacity-50"
                      >
                        {isActionRunning ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Approve</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="text-[11px] text-zinc-400 italic pt-1 border-t border-zinc-100">
                      Awaiting Supervisor review. You will be notified upon decision.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historical Reviewed Proposals Section */}
      {pastRequests.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-zinc-200">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Past Proposal Decisions ({pastRequests.length})
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pastRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white border border-[#ECEEF2] rounded-2xl p-3.5 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-ink">{req.full_name}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      req.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500 space-y-0.5">
                  <div>Role: <span className="font-semibold text-ink uppercase">{req.role}</span></div>
                  <div>Reviewed by: <span className="text-ink">{req.reviewer_name || 'Supervisor'}</span></div>
                  {req.rejection_reason && (
                    <div className="p-2 bg-rose-50 border border-rose-100 rounded-lg text-rose-800 mt-1">
                      Reason: {req.rejection_reason}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Rejection Reason Dialog */}
      {rejectModalReq && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm bg-surface border border-line rounded-3xl shadow-2xl p-6 space-y-4">
            <h4 className="text-sm font-bold text-ink">Reject Account Proposal</h4>
            <p className="text-xs text-zinc-500">
              Provide an actionable reason for rejecting the account proposal for{' '}
              <strong>{rejectModalReq.full_name}</strong>.
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Incomplete credentials, redundant account, or invalid station dispatch."
              rows={3}
              required
              className="w-full p-3 bg-canvas border border-line rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500"
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectModalReq(null);
                  setRejectReason('');
                }}
                className="flex-1 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-xs font-semibold text-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={!rejectReason.trim()}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Controlled One-Time Credential Disclosure */}
      {credentialResult && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm bg-surface border border-line rounded-3xl shadow-2xl p-6 space-y-4 animate-scale-up">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <UserCheck className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="text-sm font-bold text-ink">Account Activated!</h4>
              <p className="text-xs text-zinc-500">
                Copy the temporary password below and deliver it securely to <strong>{credentialResult.user.full_name}</strong>.
              </p>
            </div>

            <div className="p-3 bg-canvas border border-line rounded-xl space-y-1 text-xs">
              <div className="text-zinc-400 text-[10px] uppercase font-bold">Temporary Password</div>
              <div className="flex items-center justify-between font-mono font-bold text-ink">
                <span>{credentialResult.temporary_password || '(Account Deactivated / None)'}</span>
                {credentialResult.temporary_password && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(credentialResult.temporary_password);
                      setHasCopiedPassword(true);
                      setTimeout(() => setHasCopiedPassword(false), 2000);
                    }}
                    className="p-1 rounded hover:bg-zinc-200 text-zinc-600"
                    title="Copy password"
                  >
                    {hasCopiedPassword ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>

            <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
              This credential is not stored in your browser and will not be displayed again.
            </div>

            <button
              type="button"
              onClick={() => {
                setCredentialResult(null);
                setHasCopiedPassword(false);
              }}
              className="w-full py-2.5 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-semibold press-fx"
            >
              Done &amp; Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
