import React from 'react';
import { Building2, Plus, Trash2, Pencil, Search, RotateCcw } from 'lucide-react';
import type { EmployeeProfile } from '../../../types';

export interface VerifiedEmployeeTableProps {
  employees: EmployeeProfile[];
  onOpenAddModal: () => void;
  onEditEmployee: (employee: EmployeeProfile) => void;
  onDeleteEmployee: (empId: string, name: string) => void;
  employeeSearch?: string;
  onSearchChange?: (val: string) => void;
  companyFilter?: string;
  onCompanyFilterChange?: (val: string) => void;
  departmentFilter?: string;
  onDepartmentFilterChange?: (val: string) => void;
  locationFilter?: string;
  onLocationFilterChange?: (val: string) => void;
  statusFilter?: 'ALL' | 'ACTIVE' | 'INACTIVE';
  onStatusFilterChange?: (val: 'ALL' | 'ACTIVE' | 'INACTIVE') => void;
  companiesList?: string[];
  departmentsList?: string[];
  locationsList?: string[];
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
}

export const VerifiedEmployeeTable: React.FC<VerifiedEmployeeTableProps> = ({
  employees,
  onOpenAddModal,
  onEditEmployee,
  onDeleteEmployee,
  employeeSearch = '',
  onSearchChange,
  companyFilter = 'ALL',
  onCompanyFilterChange,
  departmentFilter = 'ALL',
  onDepartmentFilterChange,
  locationFilter = 'ALL',
  onLocationFilterChange,
  statusFilter = 'ALL',
  onStatusFilterChange,
  companiesList = [],
  departmentsList = [],
  locationsList = [],
  hasActiveFilters = false,
  onResetFilters,
}) => {
  return (
    <div className="bg-white border border-[#ECEEF2] rounded-3xl p-5 shadow-card space-y-4">
      {/* Header with Title and Integrated Filter Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-[#ECEEF2]">
        <div>
          <h2 className="text-sm font-bold text-ink">
            Verified Company Employee Directory ({employees.length})
          </h2>
          <p className="text-xs text-zinc-500">
            Authorized staff profiles recognized by the employee kiosk intake for automated company &amp; terminal binding.
          </p>
        </div>

        {/* Filters in Card Header */}
        <div className="flex flex-wrap items-center gap-2">
          {onCompanyFilterChange && (
            <select
              value={companyFilter}
              onChange={(e) => onCompanyFilterChange(e.target.value)}
              className="px-2.5 py-1.5 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs font-semibold text-ink focus:outline-none focus:border-orange-400"
              aria-label="Filter by Company"
            >
              <option value="ALL">All Companies</option>
              {companiesList.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}

          {onDepartmentFilterChange && (
            <select
              value={departmentFilter}
              onChange={(e) => onDepartmentFilterChange(e.target.value)}
              className="px-2.5 py-1.5 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs font-semibold text-ink focus:outline-none focus:border-orange-400"
              aria-label="Filter by Department"
            >
              <option value="ALL">All Departments</option>
              {departmentsList.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}

          {onLocationFilterChange && (
            <select
              value={locationFilter}
              onChange={(e) => onLocationFilterChange(e.target.value)}
              className="px-2.5 py-1.5 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs font-semibold text-ink focus:outline-none focus:border-orange-400"
              aria-label="Filter by Location"
            >
              <option value="ALL">All Terminal Hubs</option>
              {locationsList.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          )}

          {onStatusFilterChange && (
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value as any)}
              className="px-2.5 py-1.5 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs font-semibold text-ink focus:outline-none focus:border-orange-400"
              aria-label="Filter by Status"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          )}

          {onSearchChange && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={employeeSearch}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search name, ID..."
                className="pl-8 pr-3 py-1.5 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-400 w-36 sm:w-44"
              />
            </div>
          )}

          {hasActiveFilters && onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="py-1.5 px-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-xs font-semibold inline-flex items-center gap-1 transition-colors press-fx"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenAddModal}
            className="py-1.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors press-fx"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Employee</span>
          </button>
        </div>
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
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ECEEF2]">
            {employees.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-zinc-400 space-y-1">
                  <p className="text-xs font-semibold">No employee profiles match the selected filters.</p>
                  {hasActiveFilters && onResetFilters && (
                    <button
                      type="button"
                      onClick={onResetFilters}
                      className="text-xs text-orange-600 font-bold hover:underline"
                    >
                      Clear filters to show all profiles
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              employees.map((emp) => {
                const isDeactivated = emp.is_active === false;

                return (
                  <tr
                    key={emp.id || emp.employee_id}
                    onClick={() => onEditEmployee(emp)}
                    className={`hover:bg-orange-50/60 cursor-pointer transition-colors ${
                      isDeactivated ? 'opacity-60 bg-zinc-50/40' : ''
                    }`}
                    title="Click row to view details and edit employee"
                  >
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
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isDeactivated
                            ? 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isDeactivated ? 'bg-zinc-400' : 'bg-emerald-500'}`} />
                        {isDeactivated ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditEmployee(emp);
                          }}
                          className="p-1 rounded-lg text-zinc-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                          title="Edit Employee"
                          aria-label="Edit Employee"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteEmployee(emp.employee_id, emp.full_name);
                          }}
                          className="p-1 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Employee"
                          aria-label="Delete Employee"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
