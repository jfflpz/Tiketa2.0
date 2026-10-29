// @spec UI-TEAM-02: Employee Profile Governance & Soft-Deactivation
import React, { useState, useEffect, useMemo } from 'react';
import { Fingerprint, X, AlertCircle, Loader2, Building2, Briefcase, CheckCircle2, MapPin } from 'lucide-react';
import type { EmployeeProfile } from '../../../types';
import type { AdminEmployeeItem } from '../../../api/client';
import { useAppStore } from '../../../store/useAppStore';

export interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeProfile | null;
  onSubmit: (id: string, data: Partial<AdminEmployeeItem>) => Promise<boolean>;
}

export const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({
  isOpen,
  onClose,
  employee,
  onSubmit,
}) => {
  const serverDictionaries = useAppStore((state) => state.serverDictionaries);
  const fetchDictionaries = useAppStore((state) => state.fetchDictionaries);

  const [empId, setEmpId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [deptId, setDeptId] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !serverDictionaries) {
      fetchDictionaries();
    }
  }, [isOpen, serverDictionaries, fetchDictionaries]);

  // Sync state whenever employee or isOpen changes
  useEffect(() => {
    if (employee && isOpen) {
      setEmpId(employee.employee_id || '');
      setName(employee.full_name || '');
      setEmail(employee.email || '');
      setCompanyId(employee.company_id || '');
      setLocationId(employee.location_id || '');
      setDeptId(employee.department_id || '');
      setIsActive(employee.is_active !== false);
      setFormError(null);
    }
  }, [employee, isOpen]);

  // Filter departments valid for the selected location
  const validDepartments = useMemo(() => {
    if (!serverDictionaries) return [];
    if (!locationId) return serverDictionaries.departments;

    const allowedDeptIds = new Set(
      serverDictionaries.location_departments
        .filter((ld) => ld.location_id === locationId)
        .map((ld) => ld.department_id)
    );

    const filtered = serverDictionaries.departments.filter((d) => allowedDeptIds.has(d.id));
    return filtered.length > 0 ? filtered : serverDictionaries.departments;
  }, [serverDictionaries, locationId]);

  // Ensure department is valid for current location selection
  useEffect(() => {
    if (validDepartments.length > 0) {
      const currentValid = validDepartments.some((d) => d.id === deptId);
      if (!currentValid) {
        setDeptId(validDepartments[0].id);
      }
    }
  }, [validDepartments, deptId]);

  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !employee) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanEmpId = empId.trim();
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmpId) {
      setFormError('Employee ID is required.');
      return;
    }

    if (!/^[0-9]{1,50}$/.test(cleanEmpId)) {
      setFormError('Employee ID must consist only of 1-50 numbers (no letters or prefixes).');
      return;
    }

    if (!cleanName) {
      setFormError('Full name is required.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setFormError('A valid email address is required.');
      return;
    }

    if (!companyId || !locationId || !deptId) {
      setFormError('Please select valid Company, Location, and Department.');
      return;
    }

    const selectedComp = serverDictionaries?.companies.find((c) => c.id === companyId);
    const selectedLoc = serverDictionaries?.locations.find((l) => l.id === locationId);
    const selectedDept = serverDictionaries?.departments.find((d) => d.id === deptId);

    setIsSubmitting(true);
    try {
      const payload: Partial<AdminEmployeeItem> = {
        employee_id: cleanEmpId,
        full_name: cleanName,
        email: cleanEmail,
        company_id: companyId,
        company_name: selectedComp?.name || employee.company_name,
        location_id: locationId,
        location_name: selectedLoc?.name || employee.location_name,
        department_id: deptId,
        department_name: selectedDept?.name || employee.department_name,
        is_active: isActive,
      };

      const success = await onSubmit(employee.id, payload);
      if (success) {
        onClose();
      } else {
        setFormError('Failed to update employee profile. Check server response.');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update employee profile.';
      setFormError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-employee-modal-title"
    >
      <div
        className="fixed inset-0"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-lg bg-white border border-[#ECEEF2] rounded-3xl shadow-2xl overflow-hidden my-auto animate-scale-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 bg-[#F8F9FA] border-b border-[#ECEEF2] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <Fingerprint className="w-4 h-4" />
            </div>
            <div>
              <h3 id="edit-employee-modal-title" className="text-sm font-bold text-ink">
                Edit Employee Profile Governance
              </h3>
              <p className="text-[11px] text-zinc-500">
                Update credentials, terminal assignment &amp; active status
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-xl bg-white border border-[#ECEEF2] text-zinc-400 hover:text-zinc-700 press-fx disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Employee ID & Company Fleet */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Employee ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                inputMode="numeric"
                pattern="^[0-9]{1,50}$"
                placeholder="e.g. 1042"
                value={empId}
                onChange={(e) => setEmpId(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs font-mono font-bold text-ink focus:outline-none focus:border-orange-500 disabled:opacity-60"
              />
              <span className="text-[10px] text-zinc-400 block mt-0.5">Numeric only (1-50 digits)</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                Company Fleet <span className="text-rose-500">*</span>
              </label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-2.5 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500 disabled:opacity-60"
              >
                {serverDictionaries?.companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Full Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Employee Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Elena R. Bautista"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-orange-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="e.bautista@fivestarbus.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-orange-500 disabled:opacity-60"
              />
            </div>
          </div>

          {/* Location & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                Terminal Hub Station <span className="text-rose-500">*</span>
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-2.5 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500 disabled:opacity-60"
              >
                {serverDictionaries?.locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1 flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-zinc-400" />
                Assigned Department <span className="text-rose-500">*</span>
              </label>
              <select
                value={deptId}
                onChange={(e) => setDeptId(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-2.5 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500 disabled:opacity-60"
              >
                {validDepartments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Account Status Active Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-[#ECEEF2]">
            <div>
              <span className="text-xs font-bold text-ink block">Account Active Status</span>
              <span className="text-[11px] text-zinc-500">
                {isActive
                  ? 'Account is active and verified for kiosk lookup and ticket filing.'
                  : 'Account is soft-deactivated. Historical logs and tickets are preserved.'}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={isSubmitting}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
            </label>
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#ECEEF2]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold transition-colors press-fx"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-sm transition-colors press-fx inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
