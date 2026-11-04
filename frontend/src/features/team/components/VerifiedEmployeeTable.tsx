import React from 'react';
import { Building2, Plus, Trash2, Pencil } from 'lucide-react';
import type { EmployeeProfile } from '../../../types';

export interface VerifiedEmployeeTableProps {
  employees: EmployeeProfile[];
  onOpenAddModal: () => void;
  onEditEmployee: (employee: EmployeeProfile) => void;
  onDeleteEmployee: (empId: string, name: string) => void;
}

export const VerifiedEmployeeTable: React.FC<VerifiedEmployeeTableProps> = ({
  employees,
  onOpenAddModal,
  onEditEmployee,
  onDeleteEmployee,
}) => {
  return (
    <div className="bg-white border border-[#ECEEF2] rounded-3xl p-5 shadow-card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-ink">
            Verified Company Employee Directory ({employees.length})
          </h2>
          <p className="text-xs text-zinc-500">
            Authorized staff profiles recognized by the employee kiosk intake for automated company &amp; terminal binding.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAddModal}
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
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ECEEF2]">
            {employees.map((emp) => {
              const isDeactivated = emp.is_active === false;

              return (
                <tr
                  key={emp.id || emp.employee_id}
                  className={`hover:bg-zinc-50/70 transition-colors ${
                    isDeactivated ? 'opacity-60 bg-zinc-50/40' : ''
                  }`}
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
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isDeactivated ? 'bg-zinc-400' : 'bg-emerald-500'
                        }`}
                      />
                      {isDeactivated ? 'Deactivated' : 'Active'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onEditEmployee(emp)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-orange-600 hover:bg-orange-50 transition-colors press-fx"
                        title="Edit Profile"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {!isDeactivated && (
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Are you sure you want to deactivate employee profile ${emp.full_name} (${emp.employee_id})?\n\nHistorical ticket submissions, resolution records, and audit logs are preserved.`
                              )
                            ) {
                              onDeleteEmployee(emp.id || emp.employee_id, emp.full_name);
                            }
                          }}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors press-fx"
                          title="Deactivate Profile"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
