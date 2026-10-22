import React, { useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import type { TeamRole, TeamMemberStatus } from '../../../types/team';
import { LOCATIONS } from '../../../constants/domain';

export interface CreateITStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    email: string;
    role: TeamRole;
    department: string;
    status: TeamMemberStatus;
    primaryLocation: string;
  }) => void;
}

export const CreateITStaffModal: React.FC<CreateITStaffModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamRole>('Field Technician');
  const [location, setLocation] = useState('Pasay Terminal (PSY)');
  const [department, setDepartment] = useState('Terminal Operations & PMS');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    onSubmit({
      name: name.trim(),
      email: email.trim(),
      role,
      department: department.trim(),
      status: 'active',
      primaryLocation: location,
    });
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
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="font-semibold text-zinc-700 block mb-1">Specialist Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Angelo P. Cruz"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="font-semibold text-zinc-700 block mb-1">Company Email</label>
            <input
              type="email"
              required
              placeholder="a.cruz@fivestar.com.ph"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-zinc-700 block mb-1">Role Title</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as TeamRole)}
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
                value={location}
                onChange={(e) => setLocation(e.target.value)}
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
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#ECEEF2] rounded-xl text-xs text-ink focus:outline-none focus:border-orange-500"
            />
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
              className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold transition-colors press-fx"
            >
              Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
