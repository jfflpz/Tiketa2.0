// @spec UI-SHELL-01: Role-Separated Application Flow (Employee Screen -> Staff Login -> Role-Isolated Workspace)
import { Sidebar } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';
import { ITOverviewDashboard } from './features/overview/ITOverviewDashboard';
import { ITWorkbenchBoardView } from './features/workbench/ITWorkbenchBoardView';
import { RepairNotesLibraryView } from './features/notes/RepairNotesLibraryView';
import { JobLogSheetView } from './features/joblogs/JobLogSheetView';
import { TerminalHubsView } from './features/terminals/TerminalHubsView';
import { TeamWorkbenchView } from './features/workbench/TeamWorkbenchView';
import { ExecutiveAnalyticsView } from './features/analytics/ExecutiveAnalyticsView';
import { EmployeeTicketScreen } from './features/kiosk/EmployeeTicketScreen';
import { StaffLoginModal } from './features/auth/StaffLoginModal';
import { JobLogDrawer } from './components/tickets/JobLogDrawer';
import { QuickIntakeModal } from './components/tickets/QuickIntakeModal';
import { ToastContainer } from './components/common/ToastContainer';
import { useAppStore } from './store/useAppStore';

export default function App() {
  const { currentUser, activeView, verifyTicketCode } = useAppStore();

  // Public / Terminal Employee View or Direct Confirmation Link View
  if (!currentUser || verifyTicketCode) {
    return (
      <>
        <EmployeeTicketScreen />
        <StaffLoginModal />
        <ToastContainer />
      </>
    );
  }

  const isAdmin = currentUser.role === 'admin';

  // Enforce strict role isolation so IT Support only accesses the 5 IT Support screens
  const resolvedView =
    !isAdmin && (activeView === 'analytics' || activeView === 'team')
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
            {resolvedView === 'workbench' && <ITWorkbenchBoardView />}
            {resolvedView === 'notes' && <RepairNotesLibraryView />}
            {resolvedView === 'joblogs' && <JobLogSheetView />}
            {resolvedView === 'terminals' && <TerminalHubsView />}
            {isAdmin && resolvedView === 'analytics' && <ExecutiveAnalyticsView />}
            {isAdmin && resolvedView === 'team' && <TeamWorkbenchView />}
          </div>
        </main>
      </div>

      {/* Global Slide-Out 15-Column Job Log & Live Chat Drawer */}
      <JobLogDrawer />

      {/* Global Walk-In & Viber Quick Intake Modal */}
      <QuickIntakeModal />

      {/* Sub-100ms Tactile Toast Notification Container */}
      <ToastContainer />
    </div>
  );
}
