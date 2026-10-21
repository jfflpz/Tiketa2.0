// @spec UI-TEAM-01: IT Support Specialist Roster, Employee Directory & Account Governance
import React, { useState } from 'react';
import {
  UserPlus,
  Search,
  Trash2,
  X,
  Building2,
  MapPin,
  Flame,
  Clock,
  ArrowRight,
  Plus,
  Briefcase,
  Fingerprint,
} from 'lucide-react';
import { MetricCard } from '../../components/common/MetricCard';
import { useAppStore } from '../../store/useAppStore';
import { TeamRole, TeamMemberStatus } from '../../types/team';
import { COMPANIES, LOCATIONS, DEPARTMENTS } from '../../data/mockTicketsData';

export const TeamWorkbenchView: React.FC = () => {
  const {
    itTeamMembers,
    createITMember,
    deleteITMember,
    verifiedEmployeesList,
    createEmployee,
    deleteEmployee,
    tickets,
    setSelectedTicketId,
    setActiveView,
    currentUser,
    addToast,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'IT_STAFF' | 'EMPLOYEES' | 'ACTIVITY'>('IT_STAFF');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [itSearch, setItSearch] = useState('');

  // Modals state
  const [isAddITModalOpen, setAddITModalOpen] = useState(false);
  const [isAddEmployeeModalOpen, setAddEmployeeModalOpen] = useState(false);

  // New IT Specialist form state
  const [newITName, setNewITName] = useState('');
  const [newITEmail, setNewITEmail] = useState('');
  const [newITRole, setNewITRole] = useState<TeamRole>('Field Technician');
  const [newITLocation, setNewITLocation] = useState('Pasay Terminal (PSY)');
  const [newITDepartment, setNewITDepartment] = useState('Terminal Operations & PMS');

  // New Employee form state
  const [newEmpId, setNewEmpId] = useState('');
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpCompanyCode, setNewEmpCompanyCode] = useState('FS');
  const [newEmpLocationCode, setNewEmpLocationCode] = useState('PSY');
  const [newEmpDeptCode, setNewEmpDeptCode] = useState('CASH');

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

  const handleCreateITMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newITName.trim() || !newITEmail.trim()) {
      addToast('Missing Fields', 'Please provide a name and email for the IT Specialist.', 'warning');
      return;
    }
    createITMember({
      name: newITName.trim(),
      email: newITEmail.trim(),
      role: newITRole,
      department: newITDepartment,
      status: 'active' as TeamMemberStatus,
      primaryLocation: newITLocation,
    });
    setNewITName('');
    setNewITEmail('');
    setAddITModalOpen(false);
  };

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpId.trim() || !newEmpName.trim()) {
      addToast('Missing Fields', 'Please provide an Employee ID and Full Name.', 'warning');
      return;
    }
    const company = COMPANIES.find((c) => c.code === newEmpCompanyCode);
    const location = LOCATIONS.find((l) => l.code === newEmpLocationCode);
    const dept = DEPARTMENTS.find((d) => d.code === newEmpDeptCode);

    createEmployee({
      employee_id: newEmpId.trim().toUpperCase(),
      full_name: newEmpName.trim(),
      email: newEmpEmail.trim() || `${newEmpId.toLowerCase()}@transit.ph`,
      company_id: newEmpCompanyCode,
      company_name: company?.name || newEmpCompanyCode,
      location_id: newEmpLocationCode,
      location_name: location?.name || newEmpLocationCode,
      department_id: newEmpDeptCode,
      department_name: dept?.name || newEmpDeptCode,
    });
    setNewEmpId('');
    setNewEmpName('');
    setNewEmpEmail('');
    setAddEmployeeModalOpen(false);
  };

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <MetricCard
          label="Total IT Specialists"
          value={`${itTeamMembers.length} Staff`}
          subLabel="Assigned across 15 Hubs"
        />
        <MetricCard
          label="Online & On-Duty"
          value={`${activeTechCount} Active`}
          subLabel="Handling Live Repairs"
        />
        <MetricCard
          label="Active Repair Load"
          value={`${inProgressTicketsCount} In Progress`}
          subLabel="Dispatched on Bench"
        />
        <MetricCard
          label="Closed Resolutions"
          value={`${closedTicketsCount} Closed`}
          subLabel="Cryptographically Verified"
        />
        <MetricCard
          label="Employee Directory"
          value={`${verifiedEmployeesList.length} Verified`}
          subLabel="11 Transit Companies"
        />
      </div>

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
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredITStaff.map((member) => {
              const isCurrentUser = currentUser?.email === member.email;
              return (
                <div
                  key={member.id}
                  className="bg-white border border-[#ECEEF2] rounded-2xl p-4 shadow-card hover:border-orange-300 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-11 h-11 rounded-full border border-[#ECEEF2] bg-zinc-50 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-xs font-bold text-ink truncate">{member.name}</h3>
                            {isCurrentUser && (
                              <span className="px-1.5 py-0.2 rounded bg-orange-100 text-orange-700 text-[9px] font-extrabold uppercase">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400 truncate">{member.email}</p>
                          <span className="inline-block mt-0.5 text-[10px] font-semibold text-orange-600">
                            {member.role}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          member.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : member.status === 'away'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            member.status === 'active'
                              ? 'bg-emerald-500 animate-pulse'
                              : member.status === 'away'
                              ? 'bg-amber-500'
                              : 'bg-zinc-400'
                          }`}
                        />
                        {member.status === 'active' ? 'Online' : member.status === 'away' ? 'Away' : 'Offline'}
                      </span>
                    </div>

                    <div className="bg-[#F8F9FA] rounded-xl p-2.5 text-xs space-y-1.5 border border-[#ECEEF2]">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-zinc-400" /> Station Hub:
                        </span>
                        <span className="font-bold text-ink truncate max-w-[170px]">
                          {member.primaryLocation}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-500 flex items-center gap-1">
                          <Briefcase className="w-3 h-3 text-zinc-400" /> Dept:
                        </span>
                        <span className="font-medium text-zinc-700 truncate max-w-[170px]">
                          {member.department}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-xl p-2">
                        <span className="text-[10px] text-emerald-700 font-semibold block">Closed Repairs</span>
                        <span className="font-mono font-bold text-emerald-800 text-sm">
                          {member.ticketsClosed}
                        </span>
                      </div>
                      <div className="bg-orange-50/60 border border-orange-200/60 rounded-xl p-2">
                        <span className="text-[10px] text-orange-700 font-semibold block">Active Bench</span>
                        <span className="font-mono font-bold text-orange-800 text-sm">
                          {member.activeTickets}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#ECEEF2] flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold flex items-center gap-1">
                      <Flame className="w-3 h-3 text-orange-500 fill-orange-400" />
                      {member.flameScore} Rating
                    </span>

                    {!isCurrentUser && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete ${member.name}'s IT account?`)) {
                            deleteITMember(member.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors press-fx"
                        title="Delete IT Specialist Account"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: VERIFIED EMPLOYEE DIRECTORY */}
      {activeTab === 'EMPLOYEES' && (
        <div className="bg-white border border-[#ECEEF2] rounded-3xl p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-ink">
                Verified Company Employee Directory ({filteredEmployees.length})
              </h2>
              <p className="text-xs text-zinc-500">
                Authorized staff profiles recognized by the employee kiosk intake for automated company &amp; terminal binding.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAddEmployeeModalOpen(true)}
              className="py-1.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors press-fx"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Employee</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8F9FA] text-zinc-500 text-[11px] font-semibold border-y border-[#ECEEF2]">
                  <th className="py-2.5 px-3">Employee ID</th>
                  <th className="py-2.5 px-3">Full Name</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Company</th>
                  <th className="py-2.5 px-3">Assigned Terminal Hub</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEEF2]">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.employee_id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-zinc-900 text-white">
                        {emp.employee_id}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-ink">{emp.full_name}</td>
                    <td className="py-3 px-3 font-mono text-zinc-500">{emp.email}</td>
                    <td className="py-3 px-3 text-zinc-700">{emp.company_name}</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-zinc-600 font-medium">
                        <Building2 className="w-3 h-3 text-orange-500" />
                        {emp.location_name}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-zinc-700">{emp.department_name}</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete employee profile for ${emp.full_name} (${emp.employee_id})?`)) {
                            deleteEmployee(emp.employee_id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete Profile"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: RECENT TECHNICIAN ACTIVITY */}
      {activeTab === 'ACTIVITY' && (
        <div className="bg-white border border-[#ECEEF2] rounded-3xl p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-ink">
                Live 15-Column Dispatch Activity &amp; Assignment Logs
              </h2>
              <p className="text-xs text-zinc-500">
                Audit trail of technician claims, active repairs, and confirmed closures across all terminals.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveView('tickets')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold transition-colors press-fx"
            >
              <span>Open Full IT Triage Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#ECEEF2]">
            {tickets.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTicketId(t.id)}
                className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs cursor-pointer hover:bg-zinc-50 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-zinc-900 text-white shrink-0">
                    {t.ticketCode}
                  </span>
                  <div>
                    <h4 className="font-bold text-ink">{t.task}</h4>
                    <p className="text-[11px] text-zinc-500">
                      {t.requestor} ({t.department}) • <span className="font-semibold text-zinc-700">{t.location}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-zinc-500">
                    Worked By: <strong className="text-emerald-700">{t.workedBy ?? 'Unassigned'}</strong>
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      t.status === 'CLSD'
                        ? 'bg-zinc-100 text-zinc-700'
                        : t.status === 'RESL'
                        ? 'bg-emerald-100 text-emerald-800'
                        : t.status === 'PROG'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE IT SPECIALIST ACCOUNT */}
      {isAddITModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="fixed inset-0" onClick={() => setAddITModalOpen(false)} aria-hidden="true" />
          <div className="relative z-10 w-full max-w-md bg-white border border-[#ECEEF2] rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#ECEEF2] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">Create IT Support Account</h3>
                  <p className="text-[11px] text-zinc-400">Add an authorized technician with RBAC credentials.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddITModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateITMember} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Specialist Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Angelo P. Cruz"
                  value={newITName}
                  onChange={(e) => setNewITName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Company Email</label>
                <input
                  type="email"
                  required
                  placeholder="a.cruz@fivestar.com.ph"
                  value={newITEmail}
                  onChange={(e) => setNewITEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Role Title</label>
                  <select
                    value={newITRole}
                    onChange={(e) => setNewITRole(e.target.value as TeamRole)}
                    className="w-full px-2.5 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500"
                  >
                    <option value="Field Technician">Field Technician</option>
                    <option value="Hardware Specialist">Hardware Specialist</option>
                    <option value="Network Engineer">Network Engineer</option>
                    <option value="Senior Analyst">Senior Analyst</option>
                    <option value="Helpdesk Dispatch">Helpdesk Dispatch</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Primary Terminal Hub</label>
                  <select
                    value={newITLocation}
                    onChange={(e) => setNewITLocation(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500"
                  >
                    {LOCATIONS.map((loc) => (
                      <option key={loc.code} value={`${loc.name} (${loc.code})`}>
                        {loc.name} ({loc.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Department Unit</label>
                <input
                  type="text"
                  placeholder="e.g. POS &amp; Depot Hardware Repair"
                  value={newITDepartment}
                  onChange={(e) => setNewITDepartment(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="pt-3 border-t border-[#ECEEF2] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddITModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold transition-colors press-fx"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD EMPLOYEE PROFILE */}
      {isAddEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="fixed inset-0" onClick={() => setAddEmployeeModalOpen(false)} aria-hidden="true" />
          <div className="relative z-10 w-full max-w-md bg-white border border-[#ECEEF2] rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#ECEEF2] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center">
                  <Fingerprint className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">Add Employee Profile</h3>
                  <p className="text-[11px] text-zinc-400">Registers staff for kiosk automated lookups.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddEmployeeModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Employee ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FS-1099"
                    value={newEmpId}
                    onChange={(e) => setNewEmpId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs font-mono font-bold text-ink focus:outline-none focus:border-orange-500 uppercase"
                  />
                </div>

                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Company</label>
                  <select
                    value={newEmpCompanyCode}
                    onChange={(e) => setNewEmpCompanyCode(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500"
                  >
                    {COMPANIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Employee Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Elena R. Bautista"
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.bautista@fivestarbus.com"
                  value={newEmpEmail}
                  onChange={(e) => setNewEmpEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Terminal Location</label>
                  <select
                    value={newEmpLocationCode}
                    onChange={(e) => setNewEmpLocationCode(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500"
                  >
                    {LOCATIONS.map((loc) => (
                      <option key={loc.code} value={loc.code}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Department</label>
                  <select
                    value={newEmpDeptCode}
                    onChange={(e) => setNewEmpDeptCode(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept.code} value={dept.code}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-[#ECEEF2] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddEmployeeModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold transition-colors press-fx"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
