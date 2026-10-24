// @spec BF-08: Add Employee Profile with fixed FS- prefix, numeric suffix & server dictionaries
import React, { useState, useEffect } from 'react';
import { Fingerprint, X, Loader2, AlertCircle, Building2, MapPin, Briefcase } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { COMPANIES, LOCATIONS, DEPARTMENTS } from '../../../constants/domain';

export interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    employee_id: string;
    full_name: string;
    email: string;
    company_id: string;
    company_name: string;
    location_id: string;
    location_name: string;
    department_id: string;
    department_name: string;
  }) => Promise<boolean> | boolean | void;
}

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const serverDictionaries = useAppStore((state) => state.serverDictionaries);

  const [idNumber, setIdNumber] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [deptId, setDeptId] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available options: prefer server dictionaries if loaded, fallback to domain constants
  const companies = serverDictionaries?.companies.length
    ? serverDictionaries.companies
    : COMPANIES.map((c) => ({ id: c.code, code: c.code, name: c.name }));

  const locations = serverDictionaries?.locations.length
    ? serverDictionaries.locations
    : LOCATIONS.map((l) => ({ id: l.code, code: l.code, name: l.name }));

  const departments = serverDictionaries?.departments.length
    ? serverDictionaries.departments
    : DEPARTMENTS.map((d) => ({ id: d.code, code: d.code, name: d.name }));

  useEffect(() => {
    if (isOpen) {
      setIdNumber('');
      setName('');
      setEmail('');
      setErrorMsg(null);
      setIsSubmitting(false);

      if (companies.length > 0 && !companyId) {
        setCompanyId(companies[0].id);
      }
      if (locations.length > 0 && !locationId) {
        setLocationId(locations[0].id);
      }
      if (departments.length > 0 && !deptId) {
        setDeptId(departments[0].id);
      }
    }
  }, [isOpen, companies, locations, departments]);

  // Keyboard accessibility: dismiss on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleIdChange = (raw: string) => {
    // Strip any leading FS- if user paste it, but retain the numeric suffix including leading zeros
    const cleaned = raw.toUpperCase().replace(/^FS-?/, '').replace(/[^0-9]/g, '');
    setIdNumber(cleaned);
  };

  const formattedEmployeeId = idNumber ? `FS-${idNumber}` : 'FS-';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!idNumber) {
      setErrorMsg('Numeric employee ID suffix is required (e.g. 1042 or 0089).');
      return;
    }

    const finalEmployeeId = `FS-${idNumber}`;
    if (!/^FS-\d+$/.test(finalEmployeeId)) {
      setErrorMsg('Employee ID must follow the FS-[digits] format (e.g. FS-1099).');
      return;
    }

    if (name.trim().length < 2) {
      setErrorMsg('Employee full name must be at least 2 characters.');
      return;
    }

    const selectedCompany = companies.find((c) => c.id === companyId) || companies[0];
    const selectedLocation = locations.find((l) => l.id === locationId) || locations[0];
    const selectedDept = departments.find((d) => d.id === deptId) || departments[0];

    const fallbackEmail = `${idNumber.toLowerCase()}@transit.ph`;
    const finalEmail = email.trim() || fallbackEmail;

    setIsSubmitting(true);
    try {
      const res = await onSubmit({
        employee_id: finalEmployeeId,
        full_name: name.trim(),
        email: finalEmail,
        company_id: selectedCompany.id,
        company_name: selectedCompany.name,
        location_id: selectedLocation.id,
        location_name: selectedLocation.name,
        department_id: selectedDept.id,
        department_name: selectedDept.name,
      });

      if (res !== false) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-employee-modal-title"
    >
      <div className="fixed inset-0" onClick={() => !isSubmitting && onClose()} aria-hidden="true" />

      <div className="relative z-10 w-full max-w-md bg-white border border-[#ECEEF2] rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4 my-auto max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#ECEEF2] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-xs">
              <Fingerprint className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 id="add-employee-modal-title" className="text-sm font-bold text-ink">
                Add Employee Profile
              </h3>
              <p className="text-[11px] text-zinc-400">
                Registers staff in transit directory for kiosk lookups.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors press-fx"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Employee ID with Fixed FS- Prefix */}
          <div>
            <label className="font-semibold text-zinc-700 block mb-1">
              Employee ID (Fixed FS- Prefix)
            </label>
            <div className="flex items-center rounded-xl border border-[#ECEEF2] bg-[#F8F9FA] overflow-hidden focus-within:border-orange-500 focus-within:bg-white transition-colors">
              <span className="px-3 py-2 bg-zinc-100 text-ink font-mono font-bold text-xs select-none border-r border-[#ECEEF2]">
                FS-
              </span>
              <input
                type="text"
                required
                placeholder="1099"
                value={idNumber}
                onChange={(e) => handleIdChange(e.target.value)}
                className="w-full px-3 py-2 bg-transparent text-xs font-mono font-bold text-ink focus:outline-none"
              />
            </div>
            <p className="text-[10px] text-zinc-400 mt-1">
              Resulting badge: <strong className="font-mono text-zinc-700">{formattedEmployeeId}</strong> (leading zeros preserved).
            </p>
          </div>

          {/* Full Name */}
          <div>
            <label className="font-semibold text-zinc-700 block mb-1">
              Employee Full Name
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
              Email Address (Optional)
            </label>
            <input
              type="email"
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
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* Location & Department */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-zinc-700 block mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                Terminal Hub
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full px-2.5 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500"
              >
                {locations.map((loc) => (
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
                {departments.map((dept) => (
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
              className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold press-fx"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white font-bold inline-flex items-center gap-1.5 transition-colors press-fx shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>Saving Profile...</span>
                </>
              ) : (
                <>
                  <Fingerprint className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
