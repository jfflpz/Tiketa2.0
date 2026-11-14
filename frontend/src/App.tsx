import { useState, useEffect, lazy, Suspense } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';

const ITOverviewDashboard = lazy(() => import('./features/overview/ITOverviewDashboard').then(m => ({ default: m.ITOverviewDashboard })));
const TicketListsView = lazy(() => import('./features/tickets/TicketListsView').then(m => ({ default: m.TicketListsView })));
const ITWorkbenchBoardView = lazy(() => import('./features/workbench/ITWorkbenchBoardView').then(m => ({ default: m.ITWorkbenchBoardView })));
const RepairNotesLibraryView = lazy(() => import('./features/notes/RepairNotesLibraryView').then(m => ({ default: m.RepairNotesLibraryView })));
const JobLogSheetView = lazy(() => import('./features/joblogs/JobLogSheetView').then(m => ({ default: m.JobLogSheetView })));
const TerminalHubsView = lazy(() => import('./features/terminals/TerminalHubsView').then(m => ({ default: m.TerminalHubsView })));
const TeamWorkbenchView = lazy(() => import('./features/workbench/TeamWorkbenchView').then(m => ({ default: m.TeamWorkbenchView })));
const StandardizedReportsView = lazy(() => import('./features/reports/StandardizedReportsView').then(m => ({ default: m.StandardizedReportsView })));
import { EmployeeTicketScreen } from './features/kiosk/EmployeeTicketScreen';
import { StaffLoginModal } from './features/auth/StaffLoginModal';
import { LogoutConfirmationModal } from './features/auth/LogoutConfirmationModal';
import { JobLogDrawer } from './components/tickets/JobLogDrawer';
import { QuickIntakeModal } from './components/tickets/QuickIntakeModal';
import { TicketVerificationModal } from './components/tickets/TicketVerificationModal';
import { ToastContainer } from './components/common/ToastContainer';
import { useAppStore } from './store/useAppStore';
import type { StaffRole, ActiveView } from './store/slices/uiSlice';
import { resolvePathToView, viewToCanonicalPath, getDefaultHomeForRole } from './utils/routeUtils';
import { ROLE_ALLOWED_VIEWS, getAllowedViewsForUser } from './utils/permissions';

export { ROLE_ALLOWED_VIEWS };

// getDefaultHomeForRole imported from routeUtils

export default function App() {
  const currentUser = useAppStore((state) => state.currentUser);
  const activeView = useAppStore((state) => state.activeView);
  const setActiveView = useAppStore((state) => state.setActiveView);
  const verifyTicketCode = useAppStore((state) => state.verifyTicketCode);
  const isHydratingAuth = useAppStore((state) => state.isHydratingAuth);
  const fetchQueueApi = useAppStore((state) => state.fetchQueueApi);
  const hydrateAuthApi = useAppStore((state) => state.hydrateAuthApi);
  const hydrateKioskEmployeeTickets = useAppStore((state) => state.hydrateKioskEmployeeTickets);

  const [currentPath, setCurrentPath] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  useEffect(() => {
    const isPublic =
      typeof window !== 'undefined' &&
      resolvePathToView(window.location.pathname) === 'public';

    if (!isPublic) {
      hydrateAuthApi();
    } else {
      useAppStore.setState({ isHydratingAuth: false });
    }

    hydrateKioskEmployeeTickets?.();
  }, [hydrateAuthApi, hydrateKioskEmployeeTickets]);

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_BASE_URL;
    let healthUrl: string;
    try {
      if (apiBase) {
        healthUrl = new URL('/health', apiBase).href;
      } else {
        healthUrl = '/health';
      }
    } catch {
      healthUrl = '/health';
    }

    const keepAlive = setInterval(() => {
      fetch(healthUrl, { mode: 'cors' }).catch(() => {});
    }, 14000);

    return () => clearInterval(keepAlive);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const path = window.location.pathname;
      setCurrentPath(path);
      const route = resolvePathToView(path);
      if (route !== 'public' && currentUser) {
        const role: StaffRole = currentUser.role ?? 'it';
        const allowed = ROLE_ALLOWED_VIEWS[role] ?? ['overview'];
        if (allowed.includes(route)) {
          setActiveView(route);
        } else {
          const fallback: ActiveView = getDefaultHomeForRole(role);
          setActiveView(fallback);
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', viewToCanonicalPath(fallback));
          }
        }
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [currentUser, setActiveView]);

  useEffect(() => {
    const handleSessionExpired = () => {
      if (currentUser) {
        useAppStore.getState().logoutToKiosk?.({ rememberProfile: false });
      }
    };
    window.addEventListener('tiketa:session-expired', handleSessionExpired);
    return () => window.removeEventListener('tiketa:session-expired', handleSessionExpired);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || currentUser.role === 'supervisor') return;
    fetchQueueApi();

    const onFocus = () => {
      fetchQueueApi();
    };
    window.addEventListener('focus', onFocus);

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchQueueApi();
      }
    }, 15000);

    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, [currentUser, fetchQueueApi]);

  if (isHydratingAuth) {
    return (
      <div className="flex h-screen w-full max-w-full items-center justify-center bg-[#F4F6F9]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 flex items-center justify-center animate-pulse">
            <img src="/logo-mark.svg" alt="Tiketa" className="w-16 h-16 object-contain drop-shadow" />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
            <span>Restoring secure session...</span>
          </div>
        </div>
      </div>
    );
  }

  const currentPathStr = typeof window !== 'undefined' ? window.location.pathname : currentPath;
  const currentRoute = resolvePathToView(currentPathStr);
  const isPublicPage = currentRoute === 'public';

  if (!currentUser || verifyTicketCode || isPublicPage) {
    return (
      <>
        <EmployeeTicketScreen />
        <StaffLoginModal />
        <TicketVerificationModal />
        <ToastContainer />
      </>
    );
  }

  const userRole: StaffRole = currentUser.role ?? 'it';
  const allowedViews = getAllowedViewsForUser(currentUser);
  const resolvedView: ActiveView = allowedViews.includes(activeView)
    ? activeView
    : (allowedViews[0] ?? getDefaultHomeForRole(userRole));

  return (
    <div className="flex h-screen w-full max-w-full overflow-hidden bg-[#F4F6F9] text-ink font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopHeader />

        <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-5">
          <div className="max-w-[1440px] mx-auto">
            <Suspense
              fallback={
                <div className="flex items-center justify-center min-h-[350px]">
                  <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
              }
            >
              {resolvedView === 'overview' && <ITOverviewDashboard />}
              {resolvedView === 'tickets' && <TicketListsView />}
              {resolvedView === 'workbench' && <ITWorkbenchBoardView />}
              {resolvedView === 'notes' && <RepairNotesLibraryView />}
              {resolvedView === 'joblogs' && <JobLogSheetView />}
              {resolvedView === 'terminals' && <TerminalHubsView />}
              {(resolvedView === 'analytics' || resolvedView === 'reports') && (
                <StandardizedReportsView />
              )}
              {resolvedView === 'team' && <TeamWorkbenchView />}
            </Suspense>
          </div>
        </main>
      </div>

      <JobLogDrawer />

      {/* Global Walk-In & Viber Quck Intake Modal */}
      <QuickIntakeModal />

      {/* Interactive Ticket Verification & Closure Confirmation Modal */}
      <TicketVerificationModal />

      {/* Staff Logout Confirmation Modal */}
      <LogoutConfirmationModal />

      {/* Sub-100ms Tactile Toast Notification Container */}
      <ToastContainer />
    </div>
  );
}
