import type { AppSliceCreator } from '../types';

export interface TicketVerificationSlice {
  verifyTicketCode: string | null;
  setVerifyTicketCode: (code: string | null) => void;
  unlockedTicketCodes: Record<string, boolean>;
  unlockTicketVerification: (ticketCode: string) => void;
  copyTicketShareLink: (ticketCode: string) => Promise<string>;
  verificationModalTicketId: string | null;
  openVerificationModal: (ticketId: string) => void;
  closeVerificationModal: () => void;
}

const getInitialVerifyCode = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('verifyTicket') || params.get('ticket') || null;
  } catch {
    return null;
  }
};

export const createTicketVerificationSlice: AppSliceCreator<TicketVerificationSlice> = (set, get) => ({
  verifyTicketCode: getInitialVerifyCode(),
  setVerifyTicketCode: (code) => {
    set({ verifyTicketCode: code });
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (code) {
        url.searchParams.set('verifyTicket', code);
      } else {
        url.searchParams.delete('verifyTicket');
        url.searchParams.delete('ticket');
      }
      window.history.replaceState({}, '', url.toString());
    }
  },

  unlockedTicketCodes: {},
  unlockTicketVerification: (ticketCode) =>
    set((state) => ({
      unlockedTicketCodes: {
        ...state.unlockedTicketCodes,
        [ticketCode.trim().toUpperCase()]: true,
      },
    })),

  copyTicketShareLink: async (ticketCode) => {
    const origin =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : 'http://localhost:5173';
    const path =
      typeof window !== 'undefined' && window.location.pathname
        ? window.location.pathname
        : '/';
    const link = `${origin}${path}?verifyTicket=${ticketCode}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(link);
      }
    } catch (err) {
      console.warn('Clipboard write failed, fallback used', err);
    }
    get().addToast(
      'Confirmation Link Copied!',
      `Send to employee via Viber/Chat: ${link}`,
      'success'
    );
    return link;
  },

  verificationModalTicketId: null,
  openVerificationModal: (ticketId) => set({ verificationModalTicketId: ticketId }),
  closeVerificationModal: () => set({ verificationModalTicketId: null }),
});
