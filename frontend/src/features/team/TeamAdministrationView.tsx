// @spec UI-TEAM-01: IT Support Specialist Roster, Employee Directory & Account Governance
import React, { useState } from 'react';
import { UserPlus, Plus, Briefcase, Fingerprint, Clock, Search } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { TeamKpiSummaryCards } from './components/TeamKpiSummaryCards';
import { ITStaffTable } from './components/ITStaffTable';
import { VerifiedEmployeeTable } from './components/VerifiedEmployeeTable';
import { TechnicianActivityFeed } from './components/TechnicianActivityFeed';
import { CreateITStaffModal } from './components/CreateITStaffModal';
import { AddEmployeeModal } from './components/AddEmployeeModal';

export const TeamAdministrationView: React.FC = () => {
  const itTeamMembers = useAppStore((state) => state.itTeamMembers);
  const createITMember = useAppStore((state) => state.createITMember);
  const deleteITMember = useAppStore((state) => state.deleteITMember);
  const verifiedEmployeesList = useAppStore((state) => state.verifiedEmployeesList);
  const createEmployee = useAppStore((state) => state.createEmployee);
  const deleteEmployee = useAppStore((state) => state.deleteEmployee);
  const tickets = useAppStore((state) => state.tickets);
  const setSelectedTicketId = useAppStore((state) => state.setSelectedTicketId);
  const setActiveView = useAppStore((state) => state.setActiveView);
  const currentUser = useAppStore((state) => state.currentUser);
  const addToast = useAppStore((state) => state.addToast);

  const [activeTab, setActiveTab] = useState<'IT_STAFF' | 'EMPLOYEES' | 'ACTIVITY'>('IT_STAFF');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [itSearch, setItSearch] = useState('');

  // Modals state
  const [isAddITModalOpen, setAddITModalOpen] = useState(false);
  const [isAddEmployeeModalOpen, setAddEmployeeModalOpen] = useState(false);

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
      m.role.toLowerCase().includes(q) ||
      m.primaryLocation.toLowerCase().includes(q) ||
      m.department.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5 pb-8">
      {/* Page Title & Action Controls Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
              Governance &amp; Accounts
            </span>
            <span className="text-xs font-mono text-zinc-400">2-Tier RBAC Staff Suite</span>
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

      {/* Top 5 Operational Transit IT KPI Cards */}
      <TeamKpiSummaryCards
        itStaffCount={itTeamMembers.length}
        activeTechCount={activeTechCount}
        inProgressTicketsCount={inProgressTicketsCount}
        closedTicketsCount={closedTicketsCount}
        verifiedEmployeesCount={verifiedEmployeesList.length}
      />

      {/* Directory & Management Segmented Controls */}
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

        {/* Search input based on active tab */}
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

      {/* TAB 1: IT SUPPORT SPECIALISTS ROSTER */}
      {activeTab === 'IT_STAFF' && (
        <ITStaffTable
          staff={filteredITStaff}
          currentUserEmail={currentUser?.email}
          onDeleteMember={(id, name) => {
            if (window.confirm(`Are you sure you want to delete ${name}'s IT account?`)) {
              deleteITMember(id);
              addToast('Account Deleted', `Removed ${name} from IT staff roster.`, 'info');
            }
          }}
        />
      )}

      {/* TAB 2: VERIFIED EMPLOYEE DIRECTORY */}
      {activeTab === 'EMPLOYEES' && (
        <VerifiedEmployeeTable
          employees={filteredEmployees}
          onOpenAddModal={() => setAddEmployeeModalOpen(true)}
          onDeleteEmployee={(empId, name) => {
            if (window.confirm(`Delete employee profile for ${name} (${empId})?`)) {
              deleteEmployee(empId);
              addToast('Profile Removed', `Deleted employee directory profile for ${name}.`, 'info');
            }
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

      {/* MODAL 1: CREATE IT SPECIALIST ACCOUNT */}
      <CreateITStaffModal
        isOpen={isAddITModalOpen}
        onClose={() => setAddITModalOpen(false)}
        onSubmit={(data) => {
          createITMember(data);
          addToast('Account Created', `Provisioned IT specialist account for ${data.name}.`, 'success');
        }}
      />

      {/* MODAL 2: ADD EMPLOYEE PROFILE */}
      <AddEmployeeModal
        isOpen={isAddEmployeeModalOpen}
        onClose={() => setAddEmployeeModalOpen(false)}
        onSubmit={(data) => {
          createEmployee(data);
          addToast('Profile Saved', `Registered ${data.full_name} (${data.employee_id}) in employee directory.`, 'success');
        }}
      />
    </div>
  );
};
