import type { AppSliceCreator } from '../types';
import type { Ticket } from '../../types/ticket';
import { ticketsApi, extractApiErrorMessage, setEmployeeToken } from '../../api/client';
import { mapStaffTicket } from '../../utils/mapStaffTicket';

export type VerificationViewStatus =
  | 'idle'
  | 'loading'
  | 'not_found'
  | 'expired'
  | 'forbidden'
  | 'network_error'
  | 'needs_identity'
  | 'verified';

export interface TicketVerificationSlice {
  verifyTicketCode: string | null;
  verifyToken: string | null;
  verificationStatus: VerificationViewStatus;
  verificationErrorMessage: string | null;
  verifiedTicket: Ticket | null;
  employeeTickets: Ticket[];
  isVerifyingIdentity: boolean;
  unlockedTicketCodes: Record<string, boolean>;

  setVerifyTicketCode: (code: string | null, token?: string | null) => void;
  unlockTicketVerification: (ticketCode: string) => void;
  copyTicketShareLink: (
    ticketCode: string,
    ticketId?: string
  ) => Promise<{ success: boolean; link: string; type?: 'closure' | 'email_sent' | 'tracking' }>;
  verificationModalTicketId: string | null;
  openVerificationModal: (ticketId: string) => void;
  closeVerificationModal: () => void;

  initiateVerificationFlow: (code: string, token?: string | null) => Promise<void>;
  verifyEmployeeIdentity: (employeeId: string) => Promise<boolean>;
  fetchMyEmployeeTickets: () => Promise<void>;
  confirmVerifiedClosure: (ticketId: string, remarks?: string) => Promise<boolean>;
  reopenVerifiedTicket: (ticketId: string, reason: string) => Promise<boolean>;
  clearVerificationContext: () => void;
}

const getInitialUrlParams = (): { code: string | null; token: string | null } => {
  if (typeof window === 'undefined') return { code: null, token: null };
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('verifyTicket') || params.get('ticket') || null;
    const token = params.get('token') || null;
    return { code, token };
  } catch {
    return { code: null, token: null };
  }
};

let verificationSequence = 0;

export const createTicketVerificationSlice: AppSliceCreator<TicketVerificationSlice> = (set, get) => {
  const initialParams = getInitialUrlParams();

  return {
    verifyTicketCode: initialParams.code,
    verifyToken: initialParams.token,
    verificationStatus: initialParams.code ? 'loading' : 'idle',
    verificationErrorMessage: null,
    verifiedTicket: null,
    employeeTickets: [],
    isVerifyingIdentity: false,
    unlockedTicketCodes: {},
    verificationModalTicketId: null,

    setVerifyTicketCode: (code, token) => {
      set({
        verifyTicketCode: code,
        verifyToken: token || null,
      });
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        if (code) {
          url.searchParams.set('verifyTicket', code);
          if (token) {
            url.searchParams.set('token', token);
          } else {
            url.searchParams.delete('token');
          }
        } else {
          url.searchParams.delete('verifyTicket');
          url.searchParams.delete('ticket');
          url.searchParams.delete('token');
        }
        window.history.replaceState({}, '', url.toString());
      }
      if (code) {
        get().initiateVerificationFlow(code, token);
      } else {
        get().clearVerificationContext();
      }
    },

    unlockTicketVerification: (ticketCode) =>
      set((state) => ({
        unlockedTicketCodes: {
          ...state.unlockedTicketCodes,
          [ticketCode.trim().toUpperCase()]: true,
        },
      })),

    initiateVerificationFlow: async (code: string, token?: string | null) => {
      const cleanCode = code.trim().toUpperCase();
      const currentSeq = ++verificationSequence;

      set({
        verificationStatus: 'loading',
        verificationErrorMessage: null,
        verifyTicketCode: cleanCode,
        verifyToken: token || null,
      });

      try {
        const res = await ticketsApi.verifyAccess(cleanCode, {
          token: token || undefined,
        });

        // Drop out-of-order responses to prevent race condition
        if (currentSeq !== verificationSequence) return;

        setEmployeeToken(res.access_token);
        const mapped = mapStaffTicket(res.ticket, get().serverDictionaries);

        set((state) => ({
          verifiedTicket: mapped,
          verificationStatus: 'verified',
          verificationErrorMessage: null,
          unlockedTicketCodes: {
            ...state.unlockedTicketCodes,
            [cleanCode]: true,
          },
          tickets: [
            mapped,
            ...state.tickets.filter((t) => t.id !== mapped.id && t.ticketCode !== mapped.ticketCode),
          ],
        }));

        await get().fetchMyEmployeeTickets();
      } catch (err: any) {
        if (currentSeq !== verificationSequence) return;

        const status = err.response?.status;
        const detail = err.response?.data?.detail;
        const msg = extractApiErrorMessage(err, 'Unable to verify ticket');

        if (status === 404) {
          set({
            verificationStatus: 'not_found',
            verificationErrorMessage: typeof detail === 'string' ? detail : 'Ticket not found. Please verify the ticket code.',
            verifiedTicket: null,
          });
        } else if (
          status === 410 ||
          (status === 400 && String(detail).toLowerCase().includes('expired'))
        ) {
          set({
            verificationStatus: 'expired',
            verificationErrorMessage:
              typeof detail === 'string'
                ? detail
                : 'This verification link has expired (72-hour window). Please contact IT Support for a new verification link.',
            verifiedTicket: null,
          });
        } else if (status === 403) {
          if (typeof detail === 'string' && detail.toLowerCase().includes('verification required')) {
            set({
              verificationStatus: 'needs_identity',
              verificationErrorMessage: null,
              verifiedTicket: null,
            });
          } else {
            set({
              verificationStatus: 'forbidden',
              verificationErrorMessage:
                typeof detail === 'string'
                  ? detail
                  : 'Access denied: You are not authorized to view this ticket.',
              verifiedTicket: null,
            });
          }
        } else if (!err.response || status >= 500) {
          set({
            verificationStatus: 'network_error',
            verificationErrorMessage: !err.response
              ? 'Unable to connect to server. Please check your network connection.'
              : 'Server error encountered. Please try again.',
            verifiedTicket: null,
          });
        } else {
          set({
            verificationStatus: 'forbidden',
            verificationErrorMessage: msg,
            verifiedTicket: null,
          });
        }
      }
    },

    verifyEmployeeIdentity: async (employeeId: string) => {
      const code = get().verifyTicketCode;
      const token = get().verifyToken;
      if (!code) return false;
      const currentSeq = ++verificationSequence;

      set({ isVerifyingIdentity: true, verificationErrorMessage: null });
      try {
        const res = await ticketsApi.verifyAccess(code, {
          employee_id: employeeId.trim(),
          token: token || undefined,
        });

        if (currentSeq !== verificationSequence) return false;

        setEmployeeToken(res.access_token);
        const mapped = mapStaffTicket(res.ticket, get().serverDictionaries);

        set((state) => ({
          verifiedTicket: mapped,
          verificationStatus: 'verified',
          isVerifyingIdentity: false,
          verificationErrorMessage: null,
          unlockedTicketCodes: {
            ...state.unlockedTicketCodes,
            [code.trim().toUpperCase()]: true,
          },
          tickets: [
            mapped,
            ...state.tickets.filter((t) => t.id !== mapped.id && t.ticketCode !== mapped.ticketCode),
          ],
        }));

        await get().fetchMyEmployeeTickets();
        return true;
      } catch (err: any) {
        if (currentSeq !== verificationSequence) return false;
        const detail = err.response?.data?.detail;
        const msg = extractApiErrorMessage(err, 'Identity verification failed.');
        set({
          isVerifyingIdentity: false,
          verificationErrorMessage: typeof detail === 'string' ? detail : msg,
        });
        return false;
      }
    },

    fetchMyEmployeeTickets: async () => {
      const currentSeq = verificationSequence;
      try {
        const res = await ticketsApi.getMyTickets();
        if (currentSeq !== verificationSequence) return;
        if (Array.isArray(res)) {
          const mapped = res.map((item) => mapStaffTicket(item, get().serverDictionaries));
          set({ employeeTickets: mapped });
        }
      } catch {
        // Unauthenticated or employee session without my-tickets
      }
    },

    confirmVerifiedClosure: async (ticketId: string, remarks?: string) => {
      const token = get().verifyToken || undefined;
      try {
        const res = await ticketsApi.confirmClosure(ticketId, { token, remarks });
        const mapped = mapStaffTicket(res, get().serverDictionaries);

        set((state) => ({
          verifiedTicket: state.verifiedTicket?.id === ticketId ? mapped : state.verifiedTicket,
          employeeTickets: state.employeeTickets.map((t) => (t.id === ticketId ? mapped : t)),
          tickets: state.tickets.map((t) => (t.id === ticketId ? mapped : t)),
        }));

        get().addToast(
          `Verified & Closed ${mapped.ticketCode}`,
          'Ticket closure confirmed and archived in central records.',
          'success'
        );
        return true;
      } catch (err: any) {
        const detail = err.response?.data?.detail;
        const msg = extractApiErrorMessage(err, 'Failed to confirm ticket closure');
        get().addToast('Closure Failed', typeof detail === 'string' ? detail : msg, 'warning');
        return false;
      }
    },

    reopenVerifiedTicket: async (ticketId: string, reason: string) => {
      const token = get().verifyToken || undefined;
      try {
        const res = await ticketsApi.reopenTicket(ticketId, { reason, token });
        const mapped = mapStaffTicket(res, get().serverDictionaries);

        set((state) => ({
          verifiedTicket: state.verifiedTicket?.id === ticketId ? mapped : state.verifiedTicket,
          employeeTickets: state.employeeTickets.map((t) => (t.id === ticketId ? mapped : t)),
          tickets: state.tickets.map((t) => (t.id === ticketId ? mapped : t)),
        }));

        get().addToast(
          `Reopened ${mapped.ticketCode}`,
          'Returned to IT Support active repairs.',
          'info'
        );
        return true;
      } catch (err: any) {
        const detail = err.response?.data?.detail;
        const msg = extractApiErrorMessage(err, 'Failed to reopen ticket');
        get().addToast('Reopen Failed', typeof detail === 'string' ? detail : msg, 'warning');
        return false;
      }
    },

    copyTicketShareLink: async (ticketCode: string, ticketId?: string) => {
      const origin =
        typeof window !== 'undefined' && window.location.origin
          ? window.location.origin
          : 'http://localhost:5173';
      let link = `${origin}/?verifyTicket=${ticketCode}`;
      let isClosureCredential = false;
      let emailDispatched = false;

      if (ticketId) {
        try {
          const reissue = await ticketsApi.reissueVerification(ticketId);
          if (reissue && reissue.closure_url) {
            link = reissue.closure_url;
            isClosureCredential = true;
          } else if (reissue) {
            emailDispatched = true;
          }
        } catch {
          // Reissue failed or unauthorized
        }
      }

      let copySuccess = false;
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(link);
          copySuccess = true;
        }
      } catch (err) {
        copySuccess = false;
      }

      if (emailDispatched) {
        if (copySuccess) {
          get().addToast(
            'Verification Email Sent',
            `A secure closure verification email was sent to the employee. Copied public tracking link: ${link}`,
            'info'
          );
        } else {
          get().addToast(
            'Verification Email Sent',
            `A secure closure verification email was sent to the employee. Tracking link: ${link}`,
            'info'
          );
        }
      } else if (isClosureCredential) {
        if (copySuccess) {
          get().addToast(
            'Confirmation Link Copied!',
            `Send to employee via Viber/Chat: ${link}`,
            'success'
          );
        } else {
          get().addToast(
            'Copy Failed',
            `Could not copy automatically. Link: ${link}`,
            'warning'
          );
        }
      } else {
        if (copySuccess) {
          get().addToast(
            'Tracking Link Copied',
            `Link copied to clipboard: ${link}`,
            'info'
          );
        } else {
          get().addToast(
            'Copy Failed',
            `Could not copy tracking link: ${link}`,
            'warning'
          );
        }
      }

      return {
        success: copySuccess,
        link,
        type: isClosureCredential ? 'closure' : (emailDispatched ? 'email_sent' : 'tracking'),
      };
    },

    clearVerificationContext: () => {
      ++verificationSequence;
      setEmployeeToken(null);
      set({
        verifyTicketCode: null,
        verifyToken: null,
        verificationStatus: 'idle',
        verificationErrorMessage: null,
        verifiedTicket: null,
        isVerifyingIdentity: false,
        employeeTickets: [],
        unlockedTicketCodes: {},
        verificationModalTicketId: null,
      });
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('verifyTicket');
        url.searchParams.delete('token');
        url.searchParams.delete('ticket');
        window.history.replaceState({}, '', url.toString());
      }
    },

    openVerificationModal: (ticketId) => set({ verificationModalTicketId: ticketId }),
    closeVerificationModal: () => set({ verificationModalTicketId: null }),
  };
};
