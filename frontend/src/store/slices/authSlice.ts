// @spec BF-02: Staff Login, Public Navigation & Dashboard Landing
import type { AppSliceCreator } from '../types';
import type { AuthenticatedUser, StaffRole, ActiveView } from './uiSlice';
import { authApi, setAccessToken } from '../../api/client';
import { resolvePathToView, getDefaultHomeForRole, viewToCanonicalPath } from '../../utils/routeUtils';
import { ROLE_ALLOWED_VIEWS } from '../../App';
import { normalizeApiError } from '../../utils/errorUtils';

const getStaffTitle = (role: StaffRole): string => {
  switch (role) {
    case 'admin':
      return 'IT Administrator';
    case 'supervisor':
      return 'IT Helpdesk Supervisor';
    case 'intern':
      return 'IT Intern';
    case 'it':
    default:
      return 'Senior IT Support Specialist';
  }
};

export interface AuthSlice {
  currentUser: AuthenticatedUser | null;
  authSessionId: number;
  loginModalRole: StaffRole | null;
  isAuthenticating: boolean;
  authError: string | null;
  isHydratingAuth: boolean;
  hydrateAuthApi: () => Promise<boolean>;
  loginWithApi: (credentials: { username: string; password: string }) => Promise<boolean>;
  isLogoutModalOpen: boolean;
  openLogoutModal: () => void;
  closeLogoutModal: () => void;
  openLoginModal: (role?: StaffRole) => void;
  closeLoginModal: () => void;
  loginAsStaff: (role: StaffRole, customName?: string) => void;
  setCurrentUser: (user: AuthenticatedUser | null) => void;
  logoutToKiosk: (options?: { rememberProfile?: boolean; retainSession?: boolean }) => Promise<void>;
}

let isHydratingInFlight: Promise<boolean> | null = null;

export const createAuthSlice: AppSliceCreator<AuthSlice> = (set, get) => ({
  currentUser: null,
  authSessionId: 1,
  setCurrentUser: (user) => set({ currentUser: user }),
  loginModalRole: null,
  isLogoutModalOpen: false,
  isAuthenticating: false,
  authError: null,
  isHydratingAuth: true,

  hydrateAuthApi: async () => {
    if (get().currentUser) return true;
    if (isHydratingInFlight) return isHydratingInFlight;

    isHydratingInFlight = (async () => {
      try {
        const data = await authApi.refresh();
        if (data?.access_token && data?.user) {
          setAccessToken(data.access_token);
          const userRole: StaffRole = (data.user.role as StaffRole) || 'it';

          // BF-02: Check URL path on session restoration
          const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
          const requestedRoute = resolvePathToView(currentPath);

          const defaultHome = getDefaultHomeForRole(userRole);
          let targetView: ActiveView = defaultHome;
          if (requestedRoute !== 'public') {
            // Guard deep links by allowed views for this role
            const allowed = ROLE_ALLOWED_VIEWS[userRole] || [];
            if (allowed.includes(requestedRoute)) {
              targetView = requestedRoute;
            } else {
              targetView = defaultHome;
            }
          }

          set({
            currentUser: {
              id: data.user.id,
              name: data.user.full_name,
              email: data.user.email,
              role: userRole,
              title: getStaffTitle(userRole),
              avatar: data.user.full_name
                .split(' ')
                .map((n: string) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase(),
            },
            authSessionId: get().authSessionId + 1,
            loginModalRole: null,
            activeView: targetView,
            isHydratingAuth: false,
          });
          get().fetchQueueApi();
          return true;
        }
      } catch {
        setAccessToken(null);
        set({ currentUser: null, isHydratingAuth: false });
      } finally {
        isHydratingInFlight = null;
      }
      return false;
    })();

    return isHydratingInFlight;
  },

  loginWithApi: async ({ username, password }) => {
    set({ isAuthenticating: true, authError: null });
    try {
      const data = await authApi.login({ username, password });
      setAccessToken(data.access_token);

      const userRole: StaffRole = (data.user.role as StaffRole) || 'it';

      // F-01: Explicit login lands on canonical home for role
      const targetView: ActiveView = getDefaultHomeForRole(userRole);
      const canonicalPath = viewToCanonicalPath(targetView);
      localStorage.setItem('tiketa_active_view', targetView);

      // Clear verification override without consuming an employee closure confirmation
      if (get().verifyTicketCode) {
        get().setVerifyTicketCode(null);
      }

      // Update URL to role-specific canonical home
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', canonicalPath);
        window.dispatchEvent(new Event('popstate'));
      }

      set({
        currentUser: {
          id: data.user.id,
          name: data.user.full_name,
          email: data.user.email,
          role: userRole,
          title: getStaffTitle(userRole),
          avatar: data.user.full_name
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase(),
        },
        authSessionId: get().authSessionId + 1,
        loginModalRole: null,
        activeView: targetView,
        isAuthenticating: false,
      });
      get().fetchQueueApi();

      get().addToast(
        `Welcome, ${data.user.full_name}!`,
        'Signed into IT Operations Workspace',
        'success'
      );
      return true;
    } catch (err: unknown) {
      const msg = normalizeApiError(err, 'Invalid username or password');
      set({ authError: msg, isAuthenticating: false });
      get().addToast('Authentication Failed', msg, 'warning');
      return false;
    }
  },

  openLogoutModal: () => set({ isLogoutModalOpen: true }),
  closeLogoutModal: () => set({ isLogoutModalOpen: false }),
  openLoginModal: (role = 'it') => set({ loginModalRole: role }),
  closeLoginModal: () => set({ loginModalRole: null, authError: null }),

  loginAsStaff: () => {
    // Fake-login removed; use real API login only.
    set({ loginModalRole: 'it' });
  },

  logoutToKiosk: async (options) => {
    const userToRemember = get().currentUser;
    const shouldRemember = options?.rememberProfile ?? false;

    // F-01: Both exit choices revoke the staff session, clear sensitive domain state, stop polling and return to /report
    localStorage.removeItem('tiketa_active_view');
    if (shouldRemember && userToRemember) {
      try {
        const consentedCard = {
          name: userToRemember.name,
          username: userToRemember.email.split('@')[0],
          role: userToRemember.role,
        };
        localStorage.setItem('tiketa_remembered_profile', JSON.stringify(consentedCard));
      } catch {
        // quota exceeded or private mode
      }
    } else {
      localStorage.removeItem('tiketa_remembered_profile');
    }

    let revokeSucceeded = true;
    try {
      await authApi.logout();
    } catch {
      revokeSucceeded = false;
    } finally {
      setAccessToken(null);
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', '/report');
        window.dispatchEvent(new Event('popstate'));
      }
      get().resetReportsState?.();
      get().resetNotesState?.();
      set({
        currentUser: null,
        authSessionId: get().authSessionId + 1,
        selectedTicketId: null,
        inspectedTicket: null,
        isInspectingTicket: false,
        inspectTicketError: null,
        activeWorkbenchTicketId: null,
        workbenchTicket: null,
        isWorkbenchLoading: false,
        workbenchError: null,
        isQuickIntakeOpen: false,
        tickets: [],
      });

      if (!revokeSucceeded) {
        get().addToast(
          'Sign-out completed with warning',
          'Local session cleared. Server revocation failed (network/unreachable).',
          'warning'
        );
      } else {
        get().addToast(
          'Returned to Employee Ticket Screen',
          shouldRemember
            ? 'Profile remembered on this device (password required to sign in)'
            : 'Staff session signed out cleanly',
          'info'
        );
      }
    }
  },
});
