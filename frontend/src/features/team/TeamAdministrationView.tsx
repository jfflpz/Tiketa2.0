// @spec UI-TEAM-01: IT Support Specialist Roster, Employee Directory & Account Governance
import React, { useState, useEffect, useMemo } from 'react';
import { UserPlus, Plus, Briefcase, Fingerprint, Clock, Search, RefreshCw, Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { TeamKpiSummaryCards } from './components/TeamKpiSummaryCards';
import { ITStaffTable } from './components/ITStaffTable';
import { VerifiedEmployeeTable } from './components/VerifiedEmployeeTable';
import { TechnicianActivityFeed } from './components/TechnicianActivityFeed';
import { CreateITStaffModal } from './components/CreateITStaffModal';
import { AddEmployeeModal } from './components/AddEmployeeModal';

export const TeamAdministrationView: React.FC = () => {
  const itTeamMembers = useAppStore((state) => state.itTeamMembers);
  const fetchITMembers = useAppStore((state) => state.fetchITMembers);
  const createITMemberApi = useAppStore((state) => state.createITMemberApi);
  const deleteITMemberApi = useAppStore((state) => state.deleteITMemberApi);

  const verifiedEmployeesList = useAppStore((state) => state.verifiedEmployeesList);
  const fetchEmployees = useAppStore((state) => state.fetchEmployees);
  const createEmployeeApi = useAppStore((state) => state.createEmployeeApi);
  const deleteEmployeeApi = useAppStore((state) => state.deleteEmployeeApi);

  const fetchDictionaries = useAppStore((state) => state.fetchDictionaries);
  const isLoadingTeam = useAppStore((state) => state.isLoadingTeam);

  const tickets = useAppStore((state) => state.tickets);
  const fetchQueueApi = useAppStore((state) => state.fetchQueueApi);
  const setSelectedTicketId = useAppStore((state) => state.setSelectedTicketId);
  const setActiveView = useAppStore((state) => state.setActiveView);
  const currentUser = useAppStore((state) => state.currentUser);

  const [activeTab, setActiveTab] = useState<'IT_STAFF' | 'EMPLOYEES' | 'ACTIVITY'>('IT_STAFF');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [itSearch, setItSearch] = useState('');

  // Modals state
  const [isAddITModalOpen, setAddITModalOpen] = useState(false);
  const [isAddEmployeeModalOpen, setAddEmployeeModalOpen] = useState(false);

  // Load real database records on mount
  useEffect(() => {
    fetchDictionaries();
    fetchITMembers();
    fetchEmployees();
    fetchQueueApi();
  }, [fetchDictionaries, fetchITMembers, fetchEmployees, fetchQueueApi]);

  // Operational metrics
  const activeTechCount = itTeamMembers.filter((m) => m.status === 'active').length;
  const inProgressTicketsCount = tickets.filter((t) => t.status === 'PROG').length;
  const closedTicketsCount = tickets.filter((t) => t.status === 'CLSD' || t.status === 'RESL').length;

  const filteredEmployees = verifiedEmployeesList.filter((e) => {
    const q = employeeSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      e.employee_id.toLowerCase().includes(q) ||
      e.full_name.toLowerCase().includes(q) ||
      e.company_name.toLowerCase().includes(q) ||
      e.department_name.toLowerCase().includes(q) ||
      e.location_name.toLowerCase().includes(q)
    );
  });

  const filteredITStaff = itTeamMembers.filter((m) => {
    const q = itSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      m.name.toLowerCase().includes(q) ||
      (m.username && m.username.toLowerCase().includes(q)) ||
      m.email.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q) ||
      m.primaryLocation.toLowerCase().includes(q) ||
      m.department.toLowerCase().includes(q)
    );
  });

  // Calculate live closed and active repairs dynamically per staff member
  const itStaffWithLiveMetrics = useMemo(() => {
    return filteredITStaff.map((m) => {
      const userTickets = tickets.filter(
        (t) =>
          t.assigned_tech_id === m.id ||
          t.workedById === m.id ||
          (t.workedBy && t.workedBy.toLowerCase() === m.name.toLowerCase())
      );
      const ticketsClosed = userTickets.filter(
        (t) => t.status === 'CLSD' || t.status === 'RESL'
      ).length;
      const activeTickets = userTickets.filter((t) => t.status === 'PROG').length;

      return {
        ...m,
        ticketsClosed,
        activeTickets,
      };
    });
  }, [filteredITStaff, tickets]);

  return (
    <div className="space-y-5 pb-8">
      {/* Page Title & Action Controls Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
              Governance &amp; Accounts
            </span>
            <span className="text-xs font-mono text-zinc-400">PostgreSQL Live RBAC Suite</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-ink mt-1">
            IT Team Roster &amp; Account Governance
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manage authorized Five Star IT support accounts, technician terminal hub assignments, and verified employee profiles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isLoadingTeam}
            onClick={() => {
              fetchITMembers();
              fetchEmployees();
              fetchQueueApi();
            }}
            className="p-2 rounded-xl border border-[#ECEEF2] bg-white hover:bg-zinc-50 text-zinc-600 transition-colors shadow-sm disabled:opacity-50 press-fx"
            title="Refresh directory from server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTeam ? 'animate-spin text-orange-600' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setAddITModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-sm transition-colors press-fx"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create IT Account</span>
          </button>

          <button
            type="button"
            onClick={() => setAddEmployeeModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold shadow-sm transition-colors press-fx"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Employee Profile</span>
          </button>
        </div>
      </div>

      {/* Top Operational IT KPI Cards */}
      <TeamKpiSummaryCards
        itStaffCount={itTeamMembers.length}
        activeTechCount={activeTechCount}
        inProgressTicketsCount={inProgressTicketsCount}
        closedTicketsCount={closedTicketsCount}
        verifiedEmployeesCount={verifiedEmployeesList.length}
      />

      {/* Segmented Controls and Search Bar */}
      <div className="bg-white border border-[#ECEEF2] rounded-2xl p-2 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('IT_STAFF')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all press-fx flex items-center gap-2 ${
              activeTab === 'IT_STAFF'
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100/70'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>IT Specialists Roster ({itTeamMembers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('EMPLOYEES')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all press-fx flex items-center gap-2 ${
              activeTab === 'EMPLOYEES'
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100/70'
            }`}
          >
            <Fingerprint className="w-3.5 h-3.5" />
            <span>Verified Employee Profiles ({verifiedEmployeesList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ACTIVITY')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all press-fx flex items-center gap-2 ${
              activeTab === 'ACTIVITY'
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100/70'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Recent Technician Activity</span>
          </button>
        </div>

        {/* Search Input */}
        {activeTab === 'IT_STAFF' && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={itSearch}
              onChange={(e) => setItSearch(e.target.value)}
              placeholder="Search specialists..."
              className="pl-8 pr-3 py-1.5 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-400 w-56"
            />
          </div>
        )}

        {activeTab === 'EMPLOYEES' && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              placeholder="Search employees or ID..."
              className="pl-8 pr-3 py-1.5 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-400 w-64"
            />
          </div>
        )}
      </div>

      {isLoadingTeam && itTeamMembers.length === 0 ? (
        <div className="bg-white border border-[#ECEEF2] rounded-3xl p-12 text-center space-y-3 shadow-card">
          <Loader2 className="w-8 h-8 text-orange-600 animate-spin mx-auto" />
          <p className="text-xs font-semibold text-zinc-600">Loading accounts from backend database...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: IT SUPPORT SPECIALISTS ROSTER */}
          {activeTab === 'IT_STAFF' && (
            <ITStaffTable
              staff={itStaffWithLiveMetrics}
              currentUserEmail={currentUser?.email}
              onDeleteMember={(id, name) => {
                deleteITMemberApi(id, name);
              }}
            />
          )}

          {/* TAB 2: VERIFIED EMPLOYEE DIRECTORY */}
          {activeTab === 'EMPLOYEES' && (
            <VerifiedEmployeeTable
              employees={filteredEmployees}
              onOpenAddModal={() => setAddEmployeeModalOpen(true)}
              onDeleteEmployee={(empId, name) => {
                deleteEmployeeApi(empId, name);
              }}
            />
          )}

          {/* TAB 3: RECENT TECHNICIAN ACTIVITY */}
          {activeTab === 'ACTIVITY' && (
            <TechnicianActivityFeed
              tickets={tickets}
              onSelectTicket={setSelectedTicketId}
              onOpenQueue={() => setActiveView('tickets')}
            />
          )}
        </>
      )}

      {/* MODAL 1: CREATE IT SPECIALIST ACCOUNT */}
      <CreateITStaffModal
        isOpen={isAddITModalOpen}
        onClose={() => setAddITModalOpen(false)}
        onSubmit={async (data) => {
          const success = await createITMemberApi({
            username: data.username,
            password: data.password,
            full_name: data.name,
            email: data.email,
            role: data.systemRole,
          });
          if (success) {
            try {
              localStorage.setItem(
                `tiketa_staff_meta_${data.username}`,
                JSON.stringify({
                  roleTitle: data.role,
                  department: data.department,
                  primaryLocation: data.primaryLocation,
                })
              );
              fetchITMembers();
            } catch (e) {
              // Ignore storage errors
            }
          }
          return success;
        }}
      />

      {/* MODAL 2: ADD EMPLOYEE PROFILE */}
      <AddEmployeeModal
        isOpen={isAddEmployeeModalOpen}
        onClose={() => setAddEmployeeModalOpen(false)}
        onSubmit={async (data) => {
          return await createEmployeeApi(data);
        }}
      />
    </div>
  );
};
