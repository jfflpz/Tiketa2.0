import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Building2,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Layers,
  MapPin,
  Building,
} from 'lucide-react';
import { adminApi, type DictionaryItem } from '../../../api/client';
import { useAppStore } from '../../../store/useAppStore';

interface TerminalAdminConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshHubs: () => Promise<void> | void;
}

type ConfigTab = 'HUBS' | 'DEPARTMENTS' | 'MEMBERSHIPS' | 'COMPANIES';

export const TerminalAdminConfigModal: React.FC<TerminalAdminConfigModalProps> = ({
  isOpen,
  onClose,
  onRefreshHubs,
}) => {
  const serverDictionaries = useAppStore((state) => state.serverDictionaries);
  const fetchDictionaries = useAppStore((state) => state.fetchDictionaries);

  const [activeTab, setActiveTab] = useState<ConfigTab>('HUBS');
  const [error, setError] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Terminal Hub Form
  const [newHubCode, setNewHubCode] = useState('');
  const [newHubName, setNewHubName] = useState('');
  const [newHubAddress, setNewHubAddress] = useState('');

  // Editing Hub State
  const [editingHubId, setEditingHubId] = useState<string | null>(null);
  const [editHubName, setEditHubName] = useState('');
  const [editHubAddress, setEditHubAddress] = useState('');

  // Deactivation confirmation target for Hub
  const [deactivatingHub, setDeactivatingHub] = useState<DictionaryItem | null>(null);

  // New Department Form
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptName, setNewDeptName] = useState('');

  // Editing Department State
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editDeptName, setEditDeptName] = useState('');

  // Deactivation confirmation target for Department
  const [deactivatingDept, setDeactivatingDept] = useState<DictionaryItem | null>(null);

  // Companies state
  const companies = serverDictionaries?.companies || [];
  const [newCompanyCode, setNewCompanyCode] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [editCompanyName, setEditCompanyName] = useState('');
  const [deactivatingCompany, setDeactivatingCompany] = useState<DictionaryItem | null>(null);

  // Membership Form
  const [selectedHubId, setSelectedHubId] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');

  // Reload dictionaries on open
  useEffect(() => {
    if (isOpen) {
      fetchDictionaries();
      setError(null);
      setConflictMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, fetchDictionaries]);

  if (!isOpen) return null;

  const locations: DictionaryItem[] = serverDictionaries?.locations ?? [];
  const departments: DictionaryItem[] = serverDictionaries?.departments ?? [];
  const locationDepartments: Array<{ location_id: string; department_id: string }> = serverDictionaries?.location_departments ?? [];

  // ==================== HUB HANDLERS ====================
  const handleCreateHub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHubCode.trim() || !newHubName.trim()) {
      setError('Station code and terminal name are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setConflictMessage(null);

    try {
      await adminApi.createLocation({
        code: newHubCode.trim().toUpperCase(),
        name: newHubName.trim(),
        address: newHubAddress.trim() || undefined,
      });

      setSuccessMessage(`Location '${newHubName}' created successfully.`);
      setNewHubCode('');
      setNewHubName('');
      setNewHubAddress('');
      await fetchDictionaries();
      await onRefreshHubs();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { detail?: string } }; message?: string };
      if (axiosErr.response?.status === 409) {
        setConflictMessage(
          axiosErr.response?.data?.detail ||
            `Conflict (409): Location code '${newHubCode}' or name already exists in the system.`
        );
      } else {
        setError(axiosErr.response?.data?.detail || axiosErr.message || 'Failed to create terminal hub.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateHub = async (id: string) => {
    if (!editHubName.trim()) {
      setError('Location name cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setConflictMessage(null);

    try {
      await adminApi.updateLocation(id, {
        name: editHubName.trim(),
        address: editHubAddress.trim() || undefined,
      });

      setSuccessMessage('Location updated successfully.');
      setEditingHubId(null);
      await fetchDictionaries();
      await onRefreshHubs();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { detail?: string } }; message?: string };
      if (axiosErr.response?.status === 409) {
        setConflictMessage(
          axiosErr.response?.data?.detail || 'Conflict (409): Location name already in use.'
        );
      } else {
        setError(axiosErr.response?.data?.detail || axiosErr.message || 'Failed to update terminal hub.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleHubActive = async (hub: DictionaryItem, targetActive: boolean) => {
    if (!hub.id) return;

    setIsSubmitting(true);
    setError(null);
    setConflictMessage(null);

    try {
      await adminApi.updateLocation(hub.id, {
        is_active: targetActive,
      });

      setSuccessMessage(
        `Location '${hub.name}' has been ${targetActive ? 'reactivated' : 'deactivated'} successfully.`
      );
      setDeactivatingHub(null);
      await fetchDictionaries();
      await onRefreshHubs();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { detail?: string } }; message?: string };
      if (axiosErr.response?.status === 409) {
        setConflictMessage(
          axiosErr.response?.data?.detail ||
            `Conflict (409): Location '${hub.name}' is currently in use with active tickets or assigned staff. Reassign or resolve active workloads before deactivating.`
        );
      } else {
        setError(axiosErr.response?.data?.detail || axiosErr.message || 'Failed to change terminal hub status.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==================== DEPARTMENT HANDLERS ====================
  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptCode.trim() || !newDeptName.trim()) {
      setError('Department code and department name are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setConflictMessage(null);

    try {
      await adminApi.createDepartment({
        code: newDeptCode.trim().toUpperCase(),
        name: newDeptName.trim(),
      });

      setSuccessMessage(`Department '${newDeptName}' created successfully.`);
      setNewDeptCode('');
      setNewDeptName('');
      await fetchDictionaries();
      await onRefreshHubs();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { detail?: string } }; message?: string };
      if (axiosErr.response?.status === 409) {
        setConflictMessage(
          axiosErr.response?.data?.detail ||
            `Conflict (409): Department code '${newDeptCode}' or name already exists.`
        );
      } else {
        setError(axiosErr.response?.data?.detail || axiosErr.message || 'Failed to create department.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateDept = async (id: string) => {
    if (!editDeptName.trim()) {
      setError('Department name cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setConflictMessage(null);

    try {
      await adminApi.updateDepartment(id, {
        name: editDeptName.trim(),
      });

      setSuccessMessage('Department updated successfully.');
      setEditingDeptId(null);
      await fetchDictionaries();
      await onRefreshHubs();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { detail?: string } }; message?: string };
      if (axiosErr.response?.status === 409) {
        setConflictMessage(
          axiosErr.response?.data?.detail || 'Conflict (409): Department name already in use.'
        );
      } else {
        setError(axiosErr.response?.data?.detail || axiosErr.message || 'Failed to update department.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleDeptActive = async (dept: DictionaryItem, targetActive: boolean) => {
    if (!dept.id) return;

    setIsSubmitting(true);
    setError(null);
    setConflictMessage(null);

    try {
      await adminApi.updateDepartment(dept.id, {
        is_active: targetActive,
      });

      setSuccessMessage(
        `Department '${dept.name}' has been ${targetActive ? 'reactivated' : 'deactivated'} successfully.`
      );
      setDeactivatingDept(null);
      await fetchDictionaries();
      await onRefreshHubs();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { detail?: string } }; message?: string };
      if (axiosErr.response?.status === 409) {
        setConflictMessage(
          axiosErr.response?.data?.detail ||
            `Conflict (409): Department '${dept.name}' is currently in use with active tickets or employees. Please reassign workloads before deactivating.`
        );
      } else {
        setError(axiosErr.response?.data?.detail || axiosErr.message || 'Failed to change department status.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==================== COMPANY HANDLERS ====================
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyCode.trim() || !newCompanyName.trim()) {
      setError('Please provide both Company Code and Company Name.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setConflictMessage(null);

    try {
      await adminApi.createCompany({
        code: newCompanyCode.trim().toUpperCase(),
        name: newCompanyName.trim(),
      });

      setSuccessMessage(`Company '${newCompanyName.trim()}' created successfully.`);
      setNewCompanyCode('');
      setNewCompanyName('');
      await fetchDictionaries();
      await onRefreshHubs();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { detail?: string } }; message?: string };
      if (axiosErr.response?.status === 409) {
        setConflictMessage(
          axiosErr.response?.data?.detail || 'Conflict (409): Company code or name already exists.'
        );
      } else {
        setError(axiosErr.response?.data?.detail || axiosErr.message || 'Failed to create company.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCompany = async (id: string) => {
    if (!editCompanyName.trim()) {
      setError('Company name cannot be blank.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setConflictMessage(null);

    try {
      await adminApi.updateCompany(id, {
        name: editCompanyName.trim(),
      });

      setSuccessMessage('Company updated successfully.');
      setEditingCompanyId(null);
      await fetchDictionaries();
      await onRefreshHubs();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { detail?: string } }; message?: string };
      if (axiosErr.response?.status === 409) {
        setConflictMessage(
          axiosErr.response?.data?.detail || 'Conflict (409): Company name already in use.'
        );
      } else {
        setError(axiosErr.response?.data?.detail || axiosErr.message || 'Failed to update company.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleCompanyActive = async (comp: DictionaryItem, targetActive: boolean) => {
    if (!comp.id) return;

    setIsSubmitting(true);
    setError(null);
    setConflictMessage(null);

    try {
      await adminApi.updateCompany(comp.id, {
        is_active: targetActive,
      });

      setSuccessMessage(
        `Company '${comp.name}' has been ${targetActive ? 'reactivated' : 'deactivated'} successfully.`
      );
      setDeactivatingCompany(null);
      await fetchDictionaries();
      await onRefreshHubs();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { detail?: string } }; message?: string };
      if (axiosErr.response?.status === 409) {
        setConflictMessage(
          axiosErr.response?.data?.detail ||
            `Conflict (409): Company '${comp.name}' has active assigned tickets or employees.`
        );
      } else {
        setError(axiosErr.response?.data?.detail || axiosErr.message || 'Failed to change company status.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==================== MEMBERSHIP HANDLER ====================
  const handleAssignScope = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHubId || !selectedDeptId) {
      setError('Please select both a Location and a Department to link.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setConflictMessage(null);

    try {
      await adminApi.createLocationDepartment({
        location_id: selectedHubId,
        department_id: selectedDeptId,
      });

      setSuccessMessage('Location-Department membership linked successfully.');
      setSelectedHubId('');
      setSelectedDeptId('');
      await fetchDictionaries();
      await onRefreshHubs();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { detail?: string } }; message?: string };
      if (axiosErr.response?.status === 409) {
        setConflictMessage('Conflict (409): This Department is already assigned to this Location.');
      } else {
        setError(axiosErr.response?.data?.detail || axiosErr.message || 'Failed to link terminal membership.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-zinc-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terminal-admin-title"
    >
      <div
        className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-zinc-200 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#ECEEF2] flex items-center justify-between gap-4 bg-[#F8F9FA] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-600/20 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="terminal-admin-title" className="text-base sm:text-lg font-bold text-ink">
                Location Administration
              </h2>
              <p className="text-xs text-zinc-500">
                Authoritative configuration for transit terminal stations, operating departments, and station memberships.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors"
            aria-label="Close configuration modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-[#ECEEF2] px-6 bg-white gap-4 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('HUBS');
              setError(null);
              setConflictMessage(null);
            }}
            className={`py-3.5 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'HUBS'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Locations ({locations.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('DEPARTMENTS');
              setError(null);
              setConflictMessage(null);
            }}
            className={`py-3.5 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'DEPARTMENTS'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Departments ({departments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('MEMBERSHIPS');
              setError(null);
              setConflictMessage(null);
            }}
            className={`py-3.5 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'MEMBERSHIPS'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Hub-Dept Memberships ({locationDepartments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('COMPANIES');
              setError(null);
              setConflictMessage(null);
            }}
            className={`py-3.5 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'COMPANIES'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Companies ({companies.length})</span>
          </button>
        </div>

        {/* Alerts Container */}
        <div className="px-6 pt-4 space-y-2 shrink-0">
          {conflictMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <strong className="block font-bold">Operation Blocked:</strong>
                <span>{conflictMessage}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto min-h-0 flex-1 space-y-6">
          {/* ================= TAB 1: TERMINAL HUBS ================= */}
          {activeTab === 'HUBS' && (
            <div className="space-y-6">
              {/* Create Hub Card */}
              <form onSubmit={handleCreateHub} className="p-4 bg-orange-50/40 border border-orange-200/60 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-orange-900">
                  <Plus className="w-4 h-4 text-orange-600" />
                  <span>Add New Location</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Station Code *</label>
                    <input
                      type="text"
                      value={newHubCode}
                      onChange={(e) => setNewHubCode(e.target.value.toUpperCase())}
                      placeholder="e.g. MNL-CUBAO"
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-mono uppercase focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Location Name *</label>
                    <input
                      type="text"
                      value={newHubName}
                      onChange={(e) => setNewHubName(e.target.value)}
                      placeholder="e.g. Cubao Central Terminal"
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Physical Address</label>
                    <input
                      type="text"
                      value={newHubAddress}
                      onChange={(e) => setNewHubAddress(e.target.value)}
                      placeholder="e.g. EDSA, Quezon City"
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting || !newHubCode.trim() || !newHubName.trim()}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5 disabled:opacity-50 press-fx"
                  >
                    {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>Create Station</span>
                  </button>
                </div>
              </form>

              {/* Hubs Table */}
              <div className="border border-[#ECEEF2] rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#F8F9FA] text-zinc-500 border-b border-[#ECEEF2]">
                    <tr>
                      <th className="py-3 px-4 font-bold">Code</th>
                      <th className="py-3 px-4 font-bold">Location Name</th>
                      <th className="py-3 px-4 font-bold">Status</th>
                      <th className="py-3 px-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECEEF2]">
                    {locations.map((loc: DictionaryItem) => {
                      const isEditing = editingHubId === loc.id;
                      const isActive = loc.is_active !== false;

                      return (
                        <tr key={loc.id || loc.code} className="hover:bg-zinc-50/60 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-ink whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200">
                              {loc.code}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {isEditing ? (
                              <div className="space-y-1.5 max-w-sm">
                                <input
                                  type="text"
                                  value={editHubName}
                                  onChange={(e) => setEditHubName(e.target.value)}
                                  placeholder="Location Name"
                                  className="w-full px-2.5 py-1.5 border border-orange-300 rounded-lg text-xs"
                                />
                                <input
                                  type="text"
                                  value={editHubAddress}
                                  onChange={(e) => setEditHubAddress(e.target.value)}
                                  placeholder="Address (optional)"
                                  className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs"
                                />
                              </div>
                            ) : (
                              <div>
                                <span className="font-bold text-ink block">{loc.name}</span>
                                {loc.address && <span className="text-[11px] text-zinc-400">{loc.address}</span>}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {isActive ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                Active
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 text-[10px] font-bold">
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  disabled={isSubmitting}
                                  onClick={() => handleUpdateHub(loc.id!)}
                                  className="px-2.5 py-1 bg-orange-600 text-white rounded-lg font-bold text-[11px] hover:bg-orange-700 transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingHubId(null)}
                                  className="px-2.5 py-1 bg-zinc-100 text-zinc-600 rounded-lg font-semibold text-[11px] hover:bg-zinc-200 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingHubId(loc.id!);
                                    setEditHubName(loc.name);
                                    setEditHubAddress(loc.address || '');
                                  }}
                                  className="p-1.5 rounded-lg text-zinc-500 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                                  title="Edit terminal hub"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                {isActive ? (
                                  <button
                                    type="button"
                                    onClick={() => setDeactivatingHub(loc)}
                                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                    title="Deactivate station"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleHubActive(loc, true)}
                                    className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                    title="Reactivate station"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= TAB 2: DEPARTMENTS ================= */}
          {activeTab === 'DEPARTMENTS' && (
            <div className="space-y-6">
              {/* Create Department Form */}
              <form onSubmit={handleCreateDept} className="p-4 bg-sky-50/40 border border-sky-200/60 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-900">
                  <Plus className="w-4 h-4 text-sky-600" />
                  <span>Add New Department</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Department Code *</label>
                    <input
                      type="text"
                      value={newDeptCode}
                      onChange={(e) => setNewDeptCode(e.target.value.toUpperCase())}
                      placeholder="e.g. LOG"
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-mono uppercase focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Department Name *</label>
                    <input
                      type="text"
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      placeholder="e.g. Logistics &amp; Cargo"
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting || !newDeptCode.trim() || !newDeptName.trim()}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5 disabled:opacity-50 press-fx"
                  >
                    {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>Create Department</span>
                  </button>
                </div>
              </form>

              {/* Departments Table */}
              <div className="border border-[#ECEEF2] rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#F8F9FA] text-zinc-500 border-b border-[#ECEEF2]">
                    <tr>
                      <th className="py-3 px-4 font-bold">Code</th>
                      <th className="py-3 px-4 font-bold">Department Name</th>
                      <th className="py-3 px-4 font-bold">Status</th>
                      <th className="py-3 px-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECEEF2]">
                    {departments.map((dept: DictionaryItem) => {
                      const isEditing = editingDeptId === dept.id;
                      const isActive = dept.is_active !== false;

                      return (
                        <tr key={dept.id || dept.code} className="hover:bg-zinc-50/60 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-ink whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200">
                              {dept.code}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editDeptName}
                                onChange={(e) => setEditDeptName(e.target.value)}
                                className="w-full max-w-sm px-2.5 py-1.5 border border-sky-300 rounded-lg text-xs"
                              />
                            ) : (
                              <span className="font-bold text-ink block">{dept.name}</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {isActive ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                Active
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 text-[10px] font-bold">
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  disabled={isSubmitting}
                                  onClick={() => handleUpdateDept(dept.id!)}
                                  className="px-2.5 py-1 bg-sky-600 text-white rounded-lg font-bold text-[11px] hover:bg-sky-700 transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingDeptId(null)}
                                  className="px-2.5 py-1 bg-zinc-100 text-zinc-600 rounded-lg font-semibold text-[11px] hover:bg-zinc-200 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingDeptId(dept.id!);
                                    setEditDeptName(dept.name);
                                  }}
                                  className="p-1.5 rounded-lg text-zinc-500 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                                  title="Edit department"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                {isActive ? (
                                  <button
                                    type="button"
                                    onClick={() => setDeactivatingDept(dept)}
                                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                    title="Deactivate department"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleDeptActive(dept, true)}
                                    className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                    title="Reactivate department"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= TAB 3: MEMBERSHIPS ================= */}
          {activeTab === 'MEMBERSHIPS' && (
            <div className="space-y-6">
              {/* Assign Form */}
              <form onSubmit={handleAssignScope} className="p-4 bg-purple-50/40 border border-purple-200/60 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
                  <Plus className="w-4 h-4 text-purple-600" />
                  <span>Assign Operating Department to Location</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Location *</label>
                    <select
                      value={selectedHubId}
                      onChange={(e) => setSelectedHubId(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-purple-500"
                    >
                      <option value="">-- Choose Location --</option>
                      {locations.filter((l: DictionaryItem) => l.is_active !== false).map((loc: DictionaryItem) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name} ({loc.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Department *</label>
                    <select
                      value={selectedDeptId}
                      onChange={(e) => setSelectedDeptId(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-purple-500"
                    >
                      <option value="">-- Choose Department --</option>
                      {departments.filter((d: DictionaryItem) => d.is_active !== false).map((dept: DictionaryItem) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name} ({dept.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedHubId || !selectedDeptId}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5 disabled:opacity-50 press-fx"
                  >
                    {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>Assign Membership</span>
                  </button>
                </div>
              </form>

              {/* Memberships Table */}
              <div className="border border-[#ECEEF2] rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#F8F9FA] text-zinc-500 border-b border-[#ECEEF2]">
                    <tr>
                      <th className="py-3 px-4 font-bold">Location</th>
                      <th className="py-3 px-4 font-bold">Operating Department</th>
                      <th className="py-3 px-4 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECEEF2]">
                    {locationDepartments.map((m: { location_id: string; department_id: string }, idx: number) => {
                      const matchedLoc = locations.find((l: DictionaryItem) => l.id === m.location_id);
                      const matchedDept = departments.find((d: DictionaryItem) => d.id === m.department_id);

                      return (
                        <tr key={`${m.location_id}-${m.department_id}-${idx}`} className="hover:bg-zinc-50/60 transition-colors">
                          <td className="py-3 px-4 font-bold text-ink">
                            {matchedLoc?.name || m.location_id}
                          </td>
                          <td className="py-3 px-4 text-zinc-700">
                            {matchedDept?.name || m.department_id}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                              Linked Active
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= TAB 4: COMPANIES ================= */}
          {activeTab === 'COMPANIES' && (
            <div className="space-y-6">
              {/* Create Company Form */}
              <form onSubmit={handleCreateCompany} className="p-4 bg-indigo-50/40 border border-indigo-200/60 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                  <Plus className="w-4 h-4 text-indigo-600" />
                  <span>Add New Transit Entity / Bus Company</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Company Code *</label>
                    <input
                      type="text"
                      value={newCompanyCode}
                      onChange={(e) => setNewCompanyCode(e.target.value.toUpperCase())}
                      placeholder="e.g. VIC"
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-mono uppercase focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Company Full Name *</label>
                    <input
                      type="text"
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      placeholder="e.g. Victory Liner Inc."
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting || !newCompanyCode.trim() || !newCompanyName.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5
                    disabled:opacity-50 press-fx"
                  >
                    {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>Create Company</span>
                  </button>
                </div>
              </form>

              {/* Companies Table */}
              <div className="border border-[#ECEEF2] rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#F8F9FA] text-zinc-500 border-b border-[#ECEEF2]">
                    <tr>
                      <th className="py-3 px-4 font-bold">Code</th>
                      <th className="py-3 px-4 font-bold">Company Name</th>
                      <th className="py-3 px-4 font-bold">Status</th>
                      <th className="py-3 px-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECEEF2]">
                    {companies.map((comp: DictionaryItem) => {
                      const isEditing = editingCompanyId === comp.id;
                      const isActive = comp.is_active !== false;

                      return (
                        <tr key={comp.id || comp.code} className="hover:bg-zinc-50/60 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-ink whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200">
                              {comp.code}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editCompanyName}
                                onChange={(e) => setEditCompanyName(e.target.value)}
                                className="w-full max-w-sm px-2.5 py-1.5 border border-indigo-300 rounded-lg text-xs"
                              />
                            ) : (
                              <span className="font-bold text-ink block">{comp.name}</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {isActive ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                Active
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 text-[10px] font-bold">
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  disabled={isSubmitting}
                                  onClick={() => handleUpdateCompany(comp.id!)}
                                  className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg font-bold text-[11px] hover:bg-indigo-700 transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingCompanyId(null)}
                                  className="px-2.5 py-1 bg-zinc-100 text-zinc-600 rounded-lg font-semibold text-[11px] hover:bg-zinc-200 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCompanyId(comp.id!);
                                    setEditCompanyName(comp.name);
                                  }}
                                  className="p-1.5 rounded-lg text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                  title="Edit company"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                {isActive ? (
                                  <button
                                    type="button"
                                    onClick={() => setDeactivatingCompany(comp)}
                                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                    title="Deactivate company"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleCompanyActive(comp, true)}
                                    className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                    title="Reactivate company"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[#ECEEF2] bg-[#F8F9FA] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-zinc-400">
            All configuration updates use authoritative server dictionaries and UUIDs.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl transition-colors press-fx"
          >
            Done
          </button>
        </div>
      </div>

      {/* Deactivation Confirmation Dialog for Hub */}
      {deactivatingHub && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-xs animate-fade-in"
          role="dialog"
          aria-labelledby="deactivate-hub-dialog-title"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 id="deactivate-hub-dialog-title" className="text-sm font-bold text-ink">
                  Confirm Location Deactivation
                </h3>
                <p className="text-xs text-zinc-500">
                  Station: <strong>{deactivatingHub.name} ({deactivatingHub.code})</strong>
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              Are you sure you want to deactivate <strong>{deactivatingHub.name}</strong>?
              Inactive terminal hubs cannot be selected for new ticket intake. Historical tickets and past performance logs will be preserved.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setDeactivatingHub(null)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleToggleHubActive(deactivatingHub, false)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5 press-fx"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Confirm Deactivation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivation Confirmation Dialog for Department */}
      {deactivatingDept && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-xs animate-fade-in"
          role="dialog"
          aria-labelledby="deactivate-dept-dialog-title"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 id="deactivate-dept-dialog-title" className="text-sm font-bold text-ink">
                  Confirm Department Deactivation
                </h3>
                <p className="text-xs text-zinc-500">
                  Department: <strong>{deactivatingDept.name} ({deactivatingDept.code})</strong>
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              Are you sure you want to deactivate department <strong>{deactivatingDept.name}</strong>?
              Inactive departments cannot receive new tickets. Active tickets or staff in this department must be reassigned.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setDeactivatingDept(null)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleToggleDeptActive(deactivatingDept, false)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5 press-fx"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Confirm Deactivation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivation Confirmation Dialog for Company */}
      {deactivatingCompany && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-xs animate-fade-in"
          role="dialog"
          aria-labelledby="deactivate-comp-dialog-title"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 id="deactivate-comp-dialog-title" className="text-sm font-bold text-ink">
                  Confirm Company Deactivation
                </h3>
                <p className="text-xs text-zinc-500">
                  Company: <strong>{deactivatingCompany.name} ({deactivatingCompany.code})</strong>
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              Are you sure you want to deactivate company <strong>{deactivatingCompany.name}</strong>?
              Inactive companies cannot be assigned to new tickets. Any active tickets or employees must be reassigned first.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setDeactivatingCompany(null)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleToggleCompanyActive(deactivatingCompany, false)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5 press-fx"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Confirm Deactivation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
