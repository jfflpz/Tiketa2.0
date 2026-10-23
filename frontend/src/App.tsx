// @spec UI-SHELL-01: Role-Separated Application Flow (Employee Screen -> Staff Login -> Role-Isolated Workspace)
// @spec FR-VERIF-02: Interactive Closure Verification Modal Mount
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
import { JobLogDrawer } from './components/tickets/JobLogDrawer';
import { QuickIntakeModal } from './components/tickets/QuickIntakeModal';
import { TicketVerificationModal } from './components/tickets/TicketVerificationModal';
import { ToastContainer } from './components/common/ToastContainer';
import { useAppStore } from './store/useAppStore';
import { useEffect } from 'react';

export default function App() {
  const currentUser = useAppStore((state) => state.currentUser);
  const activeView = useAppStore((state) => state.activeView);
  const verifyTicketCode = useAppStore((state) => state.verifyTicketCode);
  const isHydratingAuth = useAppStore((state) => state.isHydratingAuth);
  const hydrateAuthApi = useAppStore((state) => state.hydrateAuthApi);

  useEffect(() => {
    hydrateAuthApi();
  }, [hydrateAuthApi]);

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
  if (!currentUser || verifyTicketCode) {
    return (
      <>
        <EmployeeTicketScreen />
        <StaffLoginModal />
        <TicketVerificationModal />
        <ToastContainer />
      </>
    );
  }

  const isAdmin = currentUser.role === 'admin';

  // Enforce strict role isolation so IT Support only accesses designated screens
  const resolvedView =
    !isAdmin && (activeView === 'analytics' || activeView === 'team' || activeView === 'reports')
      ? 'overview'
      : activeView;

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
            {isAdmin && resolvedView === 'analytics' && <ExecutiveAnalyticsView />}
            {isAdmin && resolvedView === 'reports' && <StandardizedReportsView />}
            {isAdmin && resolvedView === 'team' && <TeamWorkbenchView />}
          </div>
        </main>
      </div>

      {/* Global Slide-Out 15-Column Job Log & Live Chat Drawer */}
      <JobLogDrawer />

      {/* Global Walk-In & Viber Quick Intake Modal */}
      <QuickIntakeModal />

      {/* Interactive Ticket Verification & Closure Confirmation Modal */}
      <TicketVerificationModal />

      {/* Sub-100ms Tactile Toast Notification Container */}
      <ToastContainer />
    </div>
  );
}
