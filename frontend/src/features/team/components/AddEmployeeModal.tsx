import React, { useState, useEffect } from 'react';
import { Fingerprint, X, AlertCircle, Loader2, Building2, Briefcase } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import type { EmployeeCreateInput } from '../../../api/client';

export interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EmployeeCreateInput) => Promise<boolean>;
}

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({
  isOpen,
  onClose,
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !serverDictionaries) {
      fetchDictionaries();
    }
  }, [isOpen, serverDictionaries, fetchDictionaries]);

  // Seed default selections when dictionaries load
  useEffect(() => {
    if (serverDictionaries) {
      if (!companyId && serverDictionaries.companies.length > 0) {
        setCompanyId(serverDictionaries.companies[0].id);
      }
      if (!locationId && serverDictionaries.locations.length > 0) {
        setLocationId(serverDictionaries.locations[0].id);
      }
    }
  }, [serverDictionaries, companyId, locationId]);

  // Filter departments valid for the selected location
  const validDepartments = React.useMemo(() => {
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

  useEffect(() => {
    if (validDepartments.length > 0) {
      const currentValid = validDepartments.some((d) => d.id === deptId);
      if (!currentValid) {
        setDeptId(validDepartments[0].id);
      }
    }
  }, [validDepartments, deptId]);

  if (!isOpen) return null;

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
      setFormError('Employee ID must consist only of 1-50 numbers (no letters or FS- prefix).');
      return;
    }

    if (!cleanName) {
      setFormError('Full name is required.');
      return;
    }

    if (!cleanEmail) {
      setFormError('Email address is required.');
      return;
    }

    if (!companyId || !locationId || !deptId) {
      setFormError('Please select valid Company, Location, and Department.');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onSubmit({
        employee_id: cleanEmpId,
        full_name: cleanName,
        email: cleanEmail,
        company_id: companyId,
        location_id: locationId,
        department_id: deptId,
      });

      if (success) {
        setEmpId('');
        setName('');
        setEmail('');
        setFormError(null);
        onClose();
      } else {
        setFormError('Could not register employee. Check server response or duplicate ID.');
      }
    } catch (err: any) {
      setFormError(err?.message || 'Failed to communicate with backend server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="fixed inset-0" onClick={isSubmitting ? undefined : onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md bg-white border border-[#ECEEF2] rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#ECEEF2] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-xs">
              <Fingerprint className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink">Add Verified Employee Profile</h3>
              <p className="text-[11px] text-zinc-400">Registers staff with numeric IDs for kiosk validation.</p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{formError}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-zinc-700 block mb-1">
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
                className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs font-mono font-bold text-ink focus:outline-none focus:border-orange-500"
              />
              <span className="text-[10px] text-zinc-400 block mt-0.5">Numeric only (no letters)</span>
            </div>

            <div>
              <label className="font-semibold text-zinc-700 block mb-1">Company Fleet</label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full px-2.5 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500"
              >
                {serverDictionaries?.companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="font-semibold text-zinc-700 block mb-1">
              Employee Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Elena R. Bautista"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Email Address */}
          <div>
            <label className="font-semibold text-zinc-700 block mb-1">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="e.bautista@fivestarbus.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Company */}
          <div>
            <label className="font-semibold text-zinc-700 block mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-zinc-400" />
              Company
            </label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full px-2.5 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500"
            >
              {serverDictionaries?.companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* Location & Department */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-zinc-700 block mb-1">Terminal Hub</label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full px-2.5 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500"
              >
                {serverDictionaries?.locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-zinc-700 block mb-1 flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-zinc-400" />
                Department
              </label>
              <select
                value={deptId}
                onChange={(e) => setDeptId(e.target.value)}
                className="w-full px-2.5 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500"
              >
                {validDepartments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-[#ECEEF2] flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold transition-colors press-fx inline-flex items-center gap-2 disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSubmitting ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
