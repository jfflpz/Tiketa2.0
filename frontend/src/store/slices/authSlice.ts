import type { AppSliceCreator } from '../types';
import type { AuthenticatedUser, StaffRole, ActiveView } from './uiSlice';
import { authApi, setAccessToken } from '../../api/client';

export interface AuthSlice {
  currentUser: AuthenticatedUser | null;
  loginModalRole: StaffRole | null;
  isAuthenticating: boolean;
  authError: string | null;
  isHydratingAuth: boolean;
  hydrateAuthApi: () => Promise<boolean>;
  loginWithApi: (credentials: { username: string; password: string }) => Promise<boolean>;
  openLoginModal: (role: StaffRole) => void;
  closeLoginModal: () => void;
  loginAsStaff: (role: StaffRole, customName?: string) => void;
  logoutToKiosk: () => void;
}

let isHydratingInFlight: Promise<boolean> | null = null;

export const createAuthSlice: AppSliceCreator<AuthSlice> = (set, get) => ({
  currentUser: null,
  loginModalRole: null,
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
          const userRole: StaffRole = data.user.role === 'admin' ? 'admin' : 'it';
          const savedView = localStorage.getItem('tiketa_active_view') as ActiveView | null;
          const targetView = savedView || (userRole === 'admin' ? 'overview' : 'workbench');

          set({
            currentUser: {
              id: data.user.id,
              name: data.user.full_name,
              email: data.user.email,
              role: userRole,
              title: userRole === 'admin' ? 'IT Administrator' : 'Senior IT Support Specialist',
              avatar: data.user.full_name
                .split(' ')
                .map((n: string) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase(),
            },
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

      const userRole: StaffRole = data.user.role === 'admin' ? 'admin' : 'it';
      const targetView = userRole === 'admin' ? 'overview' : 'workbench';
      localStorage.setItem('tiketa_active_view', targetView);
      set({
        currentUser: {
          id: data.user.id,
          name: data.user.full_name,
          email: data.user.email,
          role: userRole,
          title: userRole === 'admin' ? 'IT Administrator' : 'Senior IT Support Specialist',
          avatar: data.user.full_name
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase(),
        },
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
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Invalid username or password';
      set({ authError: msg, isAuthenticating: false });
      get().addToast('Authentication Failed', msg, 'warning');
      return false;
    }
  },

  openLoginModal: (role) => set({ loginModalRole: role }),
  closeLoginModal: () => set({ loginModalRole: null }),

  loginAsStaff: (role, customName) => {
    const user: AuthenticatedUser =
      role === 'admin'
        ? {
            id: 'tm-1',
            name: customName || 'Stephen I. Miralles',
            email: 'stephen@fivestarbus.com',
            role: 'admin',
            title: 'Senior IT Analyst (Admin)',
            avatar:
              'https://api.dicebear.com/7.x/avataaars/svg?seed=William&backgroundColor=b6e3f4',
          }
        : {
            id: 'tm-2',
            name: customName || 'Nathaniel D. Esguerra',
            email: 'nathaniel@fivestarbus.com',
            role: 'it',
            title: 'IT Support Specialist',
            avatar:
              'https://api.dicebear.com/7.x/avataaars/svg?seed=Edward&backgroundColor=fed7aa',
          };

    set({
      currentUser: user,
      loginModalRole: null,
      activeView: role === 'admin' ? 'analytics' : 'overview',
      queueFilter: 'ALL',
      locationFilter: 'ALL',
    });

    get().addToast(
      `Welcome back, ${user.name}!`,
      `Logged in as ${user.title}`,
      'success'
    );
  },

  logoutToKiosk: () => {
    localStorage.removeItem('tiketa_active_view');
    setAccessToken(null);
    authApi.logout().catch(() => {});
    get().resetReportsState?.();
    set({
      currentUser: null,
      selectedTicketId: null,
      activeWorkbenchTicketId: null,
      isQuickIntakeOpen: false,
    });
    get().addToast(
      'Returned to Employee Ticket Screen',
      'Staff session signed out cleanly',
      'info'
    );
  },
});
