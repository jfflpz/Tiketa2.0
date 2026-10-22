import React, { useState } from 'react';
import { Fingerprint, X } from 'lucide-react';
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
  }) => void;
}

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [empId, setEmpId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyCode, setCompanyCode] = useState('FS');
  const [locationCode, setLocationCode] = useState('PSY');
  const [deptCode, setDeptCode] = useState('CASH');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empId.trim() || !name.trim()) return;

    const company = COMPANIES.find((c) => c.code === companyCode);
    const location = LOCATIONS.find((l) => l.code === locationCode);
    const dept = DEPARTMENTS.find((d) => d.code === deptCode);

    onSubmit({
      employee_id: empId.trim().toUpperCase(),
      full_name: name.trim(),
      email: email.trim() || `${empId.toLowerCase()}@transit.ph`,
      company_id: companyCode,
      company_name: company?.name || companyCode,
      location_id: locationCode,
      location_name: location?.name || locationCode,
      department_id: deptCode,
      department_name: dept?.name || deptCode,
    });

    setEmpId('');
    setName('');
    setEmail('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
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
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-zinc-700 block mb-1">Employee ID</label>
              <input
                type="text"
                required
                placeholder="e.g. FS-1099"
                value={empId}
                onChange={(e) => setEmpId(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs font-mono font-bold text-ink focus:outline-none focus:border-orange-500 uppercase"
              />
            </div>

            <div>
              <label className="font-semibold text-zinc-700 block mb-1">Company</label>
              <select
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value)}
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="font-semibold text-zinc-700 block mb-1">Email Address</label>
            <input
              type="email"
              placeholder="e.bautista@fivestarbus.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-zinc-700 block mb-1">Terminal Location</label>
              <select
                value={locationCode}
                onChange={(e) => setLocationCode(e.target.value)}
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
                value={deptCode}
                onChange={(e) => setDeptCode(e.target.value)}
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
              onClick={onClose}
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
  );
};
