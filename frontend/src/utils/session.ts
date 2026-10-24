/**
 * Tiketa Kiosk Session Identifier Utility
 * Survives page reloads in sessionStorage while scoping mismatch cooldowns to this tab/session.
 */

const KIOSK_SESSION_STORAGE_KEY = 'tiketa_kiosk_session_id';

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
