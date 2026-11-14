// @spec F-G1: Authorized Category Catalog, Optional Subcategory & Default Risk Management
import React, { useEffect, useState, useCallback } from 'react';
import { Layers, Plus, RefreshCw, AlertCircle, Check } from 'lucide-react';
import {
  categoryCatalogApi,
  extractApiErrorMessage,
  type CategoryCatalogItem,
  type CategoryRiskLevel,
} from '../../../api/client';
import { TASK_CATEGORIES } from '../../../constants/domain';
import { useAppStore } from '../../../store/useAppStore';

const RISK_OPTIONS: CategoryRiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const RISK_BADGE_CLASSES: Record<CategoryRiskLevel, string> = {
  CRITICAL: 'bg-rose-50 text-rose-700 border-rose-200',
  HIGH: 'bg-amber-50 text-amber-700 border-amber-200',
  MEDIUM: 'bg-sky-50 text-sky-700 border-sky-200',
  LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  UNKNOWN: 'bg-zinc-100 text-zinc-600 border-zinc-200',
};

export const CategoryCatalogPanel: React.FC = () => {
  const currentUser = useAppStore((state) => state.currentUser);
  const addToast = useAppStore((state) => state.addToast);
  const canEditCatalog = currentUser?.role === 'admin' || currentUser?.role === 'supervisor';

  const [catalog, setCatalog] = useState<CategoryCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingCode, setSavingCode] = useState<string | null>(null);

  // Add/edit subcategory draft per parent code
  const [subDraftParent, setSubDraftParent] = useState<string | null>(null);
  const [subCode, setSubCode] = useState('');
  const [subName, setSubName] = useState('');
  const [subRiskMode, setSubRiskMode] = useState<'INHERIT' | CategoryRiskLevel>('INHERIT');

  const loadCatalog = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const items = await categoryCatalogApi.getCatalog(true);
      setCatalog(Array.isArray(items) ? items : []);
    } catch (err) {
      setLoadError(
        extractApiErrorMessage(
          err,
          'Unable to load server category catalog. Showing read-only canonical codes.'
        )
      );
      setCatalog(
        TASK_CATEGORIES.map((c) => ({
          code: c.code,
          name: c.name,
          default_risk: c.defaultPriority.toUpperCase() as CategoryRiskLevel,
          is_active: true,
          subcategories: [],
        }))
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const handleUpdateParent = async (
    item: CategoryCatalogItem,
    patch: { default_risk?: CategoryRiskLevel; is_active?: boolean }
  ) => {
    if (!canEditCatalog || savingCode) return;
    setSaveError(null);
    setSavingCode(item.code);
    try {
      await categoryCatalogApi.updateCategory(item.code, patch);
      addToast('Catalog Updated', `${item.code} configuration saved.`, 'success');
      await loadCatalog();
    } catch (err) {
      setSaveError(extractApiErrorMessage(err, `Failed to update ${item.code}.`));
    } finally {
      setSavingCode(null);
    }
  };

  const handleSaveSubcategory = async (parentCode: string) => {
    if (!canEditCatalog || savingCode) return;
    const cleanCode = subCode.trim().toUpperCase();
    const cleanName = subName.trim();
    if (!cleanCode || !cleanName) {
      setSaveError('Subcategory code and name are required.');
      return;
    }
    setSaveError(null);
    setSavingCode(`${parentCode}:${cleanCode}`);
    try {
      await categoryCatalogApi.upsertSubcategory(parentCode, {
        code: cleanCode,
        name: cleanName,
        default_risk: subRiskMode === 'INHERIT' ? null : subRiskMode,
        is_active: true,
      });
      addToast('Subcategory Saved', `${cleanCode} saved under ${parentCode}.`, 'success');
      setSubDraftParent(null);
      setSubCode('');
      setSubName('');
      setSubRiskMode('INHERIT');
      await loadCatalog();
    } catch (err) {
      setSaveError(extractApiErrorMessage(err, `Failed to save subcategory ${cleanCode}.`));
    } finally {
      setSavingCode(null);
    }
  };

  const handleToggleSubcategoryActive = async (
    parentCode: string,
    sub: CategoryCatalogItem['subcategories'][number]
  ) => {
    if (!canEditCatalog || savingCode) return;
    setSaveError(null);
    setSavingCode(`${parentCode}:${sub.code}`);
    try {
      await categoryCatalogApi.upsertSubcategory(parentCode, {
        code: sub.code,
        name: sub.name,
        default_risk: sub.default_risk ?? null,
        is_active: !sub.is_active,
      });
      addToast(
        sub.is_active ? 'Subcategory Deactivated' : 'Subcategory Activated',
        `${sub.code} updated.`,
        'success'
      );
      await loadCatalog();
    } catch (err) {
      setSaveError(extractApiErrorMessage(err, `Failed to update ${sub.code}.`));
    } finally {
      setSavingCode(null);
    }
  };

  return (
    <div className="bg-white border border-[#ECEEF2] rounded-2xl p-5 shadow-card space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-ink flex items-center gap-2">
            <Layers className="w-4 h-4 text-orange-600" />
            <span>Approved Category Catalog &amp; Default Risk</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            One optional subcategory level per canonical category. Historical tickets keep their recorded risk.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadCatalog()}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#ECEEF2] text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Reload Catalog</span>
        </button>
      </div>

      {!canEditCatalog && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          Read-only view: Admin or Supervisor authorization is required to modify category defaults.
        </div>
      )}

      {loadError && (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {saveError && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      <div className="divide-y divide-line border border-line rounded-2xl overflow-hidden">
        {catalog.map((cat) => (
          <div key={cat.code} className="p-4 space-y-3 bg-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-ink">{cat.code}</span>
                  <span className="text-xs font-bold text-ink">{cat.name}</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      RISK_BADGE_CLASSES[cat.default_risk] ?? RISK_BADGE_CLASSES.UNKNOWN
                    }`}
                  >
                    Default Risk: {cat.default_risk}
                  </span>
                  {!cat.is_active && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-200 text-zinc-700">
                      Deactivated
                    </span>
                  )}
                </div>
              </div>

              {canEditCatalog && !loadError && (
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="text-[11px] text-zinc-500 font-medium">
                    Default Risk
                    <select
                      aria-label={`Default risk for ${cat.code}`}
                      value={cat.default_risk}
                      disabled={savingCode === cat.code}
                      onChange={(e) =>
                        void handleUpdateParent(cat, {
                          default_risk: e.target.value as CategoryRiskLevel,
                        })
                      }
                      className="ml-1.5 px-2 py-1 rounded-lg border border-line bg-canvas text-xs font-semibold text-ink"
                    >
                      {RISK_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    type="button"
                    disabled={savingCode === cat.code}
                    onClick={() => void handleUpdateParent(cat, { is_active: !cat.is_active })}
                    className="px-2.5 py-1 rounded-lg border border-line text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    {cat.is_active ? 'Deactivate' : 'Activate'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSubDraftParent(subDraftParent === cat.code ? null : cat.code);
                      setSubCode('');
                      setSubName('');
                      setSubRiskMode('INHERIT');
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 text-white text-[11px] font-bold hover:bg-zinc-800"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Subcategory</span>
                  </button>
                </div>
              )}
            </div>

            {subDraftParent === cat.code && canEditCatalog && (
              <div className="rounded-xl bg-canvas border border-line p-3 grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                    Subcategory Code
                  </label>
                  <input
                    type="text"
                    value={subCode}
                    onChange={(e) => setSubCode(e.target.value)}
                    placeholder={`${cat.code}-JAM`}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-line bg-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                    Subcategory Name
                  </label>
                  <input
                    type="text"
                    value={subName}
                    onChange={(e) => setSubName(e.target.value)}
                    placeholder="Paper Jam / Roller Fault"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-line bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                    Risk Inheritance
                  </label>
                  <select
                    value={subRiskMode}
                    onChange={(e) => setSubRiskMode(e.target.value as 'INHERIT' | CategoryRiskLevel)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-line bg-white text-xs"
                  >
                    <option value="INHERIT">Inherited ({cat.default_risk})</option>
                    {RISK_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        Explicit: {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void handleSaveSubcategory(cat.code)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-bold hover:bg-orange-700"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubDraftParent(null)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-500 hover:text-zinc-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {cat.subcategories.length > 0 && (
              <div className="pl-4 border-l-2 border-zinc-200 space-y-1.5">
                {cat.subcategories.map((sub) => {
                  const isExplicit = Boolean(sub.default_risk);
                  return (
                    <div
                      key={sub.code}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-canvas px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-ink">{sub.code}</span>
                        <span className="font-medium text-ink">{sub.name}</span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            RISK_BADGE_CLASSES[sub.effective_risk] ?? RISK_BADGE_CLASSES.UNKNOWN
                          }`}
                        >
                          {sub.effective_risk} ({isExplicit ? 'Explicit' : 'Inherited'})
                        </span>
                        {!sub.is_active && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-200 text-zinc-700">
                            Deactivated
                          </span>
                        )}
                      </div>
                      {canEditCatalog && !loadError && (
                        <button
                          type="button"
                          disabled={savingCode === `${cat.code}:${sub.code}`}
                          onClick={() => void handleToggleSubcategoryActive(cat.code, sub)}
                          className="text-[11px] font-semibold text-zinc-600 hover:text-zinc-900 underline self-start sm:self-auto"
                        >
                          {sub.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
