/**
 * Tiketa Kiosk Session Identifier Utility & Local Persistence
 * Survives page reloads in sessionStorage/localStorage.
 */

const KIOSK_SESSION_STORAGE_KEY = 'tiketa_kiosk_session_id';
export const RECENT_EMPLOYEE_TICKETS_KEY = 'tiketa_recent_employee_tickets';
export const EMPLOYEE_MATCH_TOKEN_KEY = 'tiketa_employee_match_token';
export const EMPLOYEE_PROFILE_KEY = 'tiketa_employee_profile';

export function getOrCreateKioskSessionId(): string {
  let sessionId: string | null = null;
  try {
    sessionId = window.sessionStorage.getItem(KIOSK_SESSION_STORAGE_KEY);
  } catch {
    // In case sessionStorage is blocked by security policies
  }

  if (!sessionId || sessionId.trim().length < 8) {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      sessionId = crypto.randomUUID();
    } else {
      sessionId = `kiosk-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    }

    try {
      window.sessionStorage.setItem(KIOSK_SESSION_STORAGE_KEY, sessionId);
    } catch {
      // In case sessionStorage is blocked
    }
  }

  return sessionId;
}

export function getPersistedEmployeeTickets(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_EMPLOYEE_TICKETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistEmployeeTickets(tickets: any[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RECENT_EMPLOYEE_TICKETS_KEY, JSON.stringify(tickets.slice(0, 50)));
  } catch {
    // In case localStorage is blocked or full
  }
}

export function getPersistedMatchToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(EMPLOYEE_MATCH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function persistMatchToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      window.localStorage.setItem(EMPLOYEE_MATCH_TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(EMPLOYEE_MATCH_TOKEN_KEY);
    }
  } catch {
    // In case localStorage is blocked
  }
}

export function getPersistedEmployeeProfile(): any | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(EMPLOYEE_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function persistEmployeeProfile(profile: any | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (profile) {
      window.localStorage.setItem(EMPLOYEE_PROFILE_KEY, JSON.stringify(profile));
    } else {
      window.localStorage.removeItem(EMPLOYEE_PROFILE_KEY);
    }
  } catch {
    // In case localStorage is blocked
  }
}
