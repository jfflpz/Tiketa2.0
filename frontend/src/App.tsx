// @spec UI-SHELL-01: Role-Separated Application Flow (Employee Screen -> Staff Login -> Role-Isolated Workspace)
// @spec BF-02: URL-Aware Employee and Staff Routing, Deep Links & Public Page Preservation
// @spec FR-VERIF-02: Interactive Closure Verification Modal Mount
import { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';
import { ITOverviewDashboard } from './features/overview/ITOverviewDashboard';
import { TicketListsView } from './features/tickets/TicketListsView';
import { ITWorkbenchBoardView } from './features/workbench/ITWorkbenchBoardView';
import { RepairNotesLibraryView } from './features/notes/RepairNotesLibraryView';
import { JobLogSheetView } from './features/joblogs/JobLogSheetView';
import { TerminalHubsView } from './features/terminals/TerminalHubsView';
import { TeamWorkbenchView } from './features/workbench/TeamWorkbenchView';
import { ExecutiveAnalyticsView } from './features/analytics/ExecutiveAnalyticsView';
import { StandardizedReportsView } from './features/reports/StandardizedReportsView';
import { EmployeeTicketScreen } from './features/kiosk/EmployeeTicketScreen';
import { StaffLoginModal } from './features/auth/StaffLoginModal';
import { LogoutConfirmationModal } from './features/auth/LogoutConfirmationModal';
import { JobLogDrawer } from './components/tickets/JobLogDrawer';
import { QuickIntakeModal } from './components/tickets/QuickIntakeModal';
import { TicketVerificationModal } from './components/tickets/TicketVerificationModal';
import { ToastContainer } from './components/common/ToastContainer';
import { useAppStore } from './store/useAppStore';
import type { StaffRole, ActiveView } from './store/slices/uiSlice';
import { resolvePathToView } from './utils/routeUtils';

export const ROLE_ALLOWED_VIEWS: Record<StaffRole, ActiveView[]> = {
  intern: ['overview', 'workbench', 'notes', 'joblogs'],
  it: ['overview', 'tickets', 'workbench', 'notes', 'joblogs', 'terminals'],
  supervisor: [
    'overview',
    'tickets',
    'workbench',
    'notes',
    'joblogs',
    'terminals',
    'analytics',
    'reports',
    'team',
  ],
  analyst: ['overview', 'analytics', 'reports', 'team', 'joblogs', 'terminals'],
  admin: [
    'overview',
    'tickets',
    'workbench',
    'notes',
    'joblogs',
    'terminals',
    'analytics',
    'reports',
    'team',
  ],
};

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
    hydrateAuthApi();
    hydrateKioskEmployeeTickets?.();
  }, [hydrateAuthApi, hydrateKioskEmployeeTickets]);

  // BF-02: Handle browser back/forward and external URL navigation with strict RBAC guards
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
          const fallback: ActiveView = role === 'analyst' ? 'reports' : 'overview';
          setActiveView(fallback);
          if (typeof window !== 'undefined') {
            window.history.replaceState(
              null,
              '',
              `/${fallback === 'overview' ? 'dashboard' : fallback}`
            );
          }
        }
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [currentUser, setActiveView]);

  useEffect(() => {
    if (!currentUser) return;
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
      <div className="flex h-screen w-screen items-center justify-center bg-[#F4F6F9]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-zinc-900 text-white flex items-center justify-center shadow-lg animate-pulse">
            <span className="text-orange-500 font-bold text-lg font-mono">T</span>
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

  // BF-02: If unauthenticated, on public /report or /kiosk page, or verification link override is active, render Employee Helpdesk
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

  // Enforce strict 4-tier role isolation so unauthorized views redirect cleanly
  const userRole: StaffRole = currentUser.role ?? 'it';
  const allowedViews = ROLE_ALLOWED_VIEWS[userRole] ?? ['overview'];
  const resolvedView: ActiveView = allowedViews.includes(activeView)
    ? activeView
    : userRole === 'analyst'
    ? 'reports'
    : 'overview';

  // Authenticated Staff Workspace: Nexora Categorized Dark Sidebar + Role-Isolated Screens
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F4F6F9] text-ink font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopHeader />

        <main className="flex-1 overflow-y-auto px-6 py-5">
          <div className="max-w-[1440px] mx-auto">
            {resolvedView === 'overview' && <ITOverviewDashboard />}
            {resolvedView === 'tickets' && <TicketListsView />}
            {resolvedView === 'workbench' && <ITWorkbenchBoardView />}
            {resolvedView === 'notes' && <RepairNotesLibraryView />}
            {resolvedView === 'joblogs' && <JobLogSheetView />}
            {resolvedView === 'terminals' && <TerminalHubsView />}
            {resolvedView === 'analytics' && <ExecutiveAnalyticsView />}
            {resolvedView === 'reports' && <StandardizedReportsView />}
            {resolvedView === 'team' && <TeamWorkbenchView />}
          </div>
        </main>
      </div>

      {/* Global Slide-Out 15-Column Job Log & Live Chat Drawer */}
      <JobLogDrawer />

      {/* Global Walk-In & Viber Quick Intake Modal */}
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
