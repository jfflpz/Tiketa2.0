import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X,
  Presentation,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
  Layers,
  Sparkles,
  FileText,
} from 'lucide-react';
import { REPORT_TABS } from '../types/reportSchemas';
import { executePptxExport } from '../export/exportPptx';
import { validatePmsDateRange, formatPeriodDisplay, formatIsoDate, getLastDayOfMonth } from '../export/pmsDateValidation';
import type { ExportMode, ExportProgress, ReportFilterParams } from '../export/types';
import { useAppStore } from '../../../store/useAppStore';

export const MAX_COMMENTARY_LENGTH = 380;

export interface ExportPptxModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialReportId: number;
  initialDateRange?: { dateFrom: string; dateTo: string };
  filterParams?: ReportFilterParams;
}

export const ExportPptxModal: React.FC<ExportPptxModalProps> = ({
  isOpen,
  onClose,
  initialReportId,
  initialDateRange,
  filterParams,
}) => {
  const addToast = useAppStore((state) => state.addToast);
  const setActiveExportController = useAppStore((state) => state.setActiveExportController);

  // Default mode is strictly 'current' (1 slide)
  const [mode, setMode] = useState<ExportMode>('current');
  const [selectedIds, setSelectedIds] = useState<number[]>([initialReportId || 1]);

  // @spec F-06: Editable commentary per report with preflight length checks
  const [customCommentary, setCustomCommentary] = useState<Record<number, string>>({});
  const [activeCommentaryTab, setActiveCommentaryTab] = useState<number>(initialReportId || 1);

  // Date range state
  const defaultDates = useMemo(() => {
    if (initialDateRange?.dateFrom && initialDateRange?.dateTo) {
      return initialDateRange;
    }
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const dateFrom = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const dateTo = formatIsoDate(now);
    return { dateFrom, dateTo };
  }, [initialDateRange]);

  const [dateFrom, setDateFrom] = useState(defaultDates.dateFrom);
  const [dateTo, setDateTo] = useState(defaultDates.dateTo);

  // Progress & in-flight state
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeOpIdRef = useRef<number>(0);

  // Clean up controller and abort export on unmount or disposal
  useEffect(() => {
    return () => {
      activeOpIdRef.current++;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setActiveExportController(null);
    };
  }, [setActiveExportController]);

  // Synchronize when initialReportId or modal opens
  useEffect(() => {
    if (isOpen) {
      setMode('current');
      const startId = initialReportId || 1;
      setSelectedIds([startId]);
      setActiveCommentaryTab(startId);
      setDateFrom(defaultDates.dateFrom);
      setDateTo(defaultDates.dateTo);
      setIsExporting(false);
      setProgress(null);
    } else {
      activeOpIdRef.current++;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setActiveExportController(null);
      setIsExporting(false);
      setProgress(null);
    }
  }, [isOpen, initialReportId, defaultDates, setActiveExportController]);

  // Mode change handlers
  const handleModeChange = (newMode: ExportMode) => {
    setMode(newMode);
    if (newMode === 'current') {
      const id = initialReportId || 1;
      setSelectedIds([id]);
      setActiveCommentaryTab(id);
    } else if (newMode === 'all') {
      const allIds = REPORT_TABS.map((t) => t.id);
      setSelectedIds(allIds);
      setActiveCommentaryTab(allIds[0]);
    }
  };

  const handleToggleReport = (id: number) => {
    let newSelected: number[];
    if (selectedIds.includes(id)) {
      newSelected = selectedIds.filter((item) => item !== id);
    } else {
      newSelected = [...selectedIds, id].sort((a, b) => a - b);
    }
    setSelectedIds(newSelected);
    if (!newSelected.includes(activeCommentaryTab) && newSelected.length > 0) {
      setActiveCommentaryTab(newSelected[0]);
    }
  };

  // PMS complete month validation
  const includesPms = selectedIds.includes(7);
  const pmsValidation = useMemo(() => {
    if (!includesPms) return { isValid: true };
    return validatePmsDateRange(dateFrom, dateTo);
  }, [includesPms, dateFrom, dateTo]);

  // Preflight commentary length check across all selected reports
  const overflowingReport = useMemo(() => {
    for (const id of selectedIds) {
      const text = customCommentary[id] || '';
      if (text.length > MAX_COMMENTARY_LENGTH) {
        const tab = REPORT_TABS.find((t) => t.id === id);
        return {
          id,
          title: tab?.title || `Report ${id}`,
          length: text.length,
        };
      }
    }
    return null;
  }, [selectedIds, customCommentary]);

  const hasCommentaryOverflow = overflowingReport !== null;

  // Actionable handler to apply suggested complete months
  const handleUseCompleteMonths = () => {
    if (pmsValidation.suggestedFrom && pmsValidation.suggestedTo) {
      setDateFrom(pmsValidation.suggestedFrom);
      setDateTo(pmsValidation.suggestedTo);
    } else {
      const [y, m] = dateFrom.split('-').map(Number);
      const lastDay = getLastDayOfMonth(y, m - 1);
      setDateFrom(`${y}-${String(m).padStart(2, '0')}-01`);
      setDateTo(`${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
    }
  };

  const isExportDisabled =
    selectedIds.length === 0 ||
    isExporting ||
    (includesPms && !pmsValidation.isValid) ||
    hasCommentaryOverflow;

  const slideCount = selectedIds.length;
  const formattedPeriod = formatPeriodDisplay(dateFrom, dateTo);

  const handleCancelExport = () => {
    activeOpIdRef.current++;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setActiveExportController(null);
    setIsExporting(false);
    setProgress(null);
    addToast('Export Cancelled', 'PowerPoint export was cancelled.', 'info');
  };

  const handleStartExport = async () => {
    if (isExportDisabled) return;

    const opId = ++activeOpIdRef.current;
    setIsExporting(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setActiveExportController(controller);

    try {
      const result = await executePptxExport({
        selectedReportIds: selectedIds,
        dateRange: { dateFrom, dateTo },
        filterParams,
        customCommentaryByReportId: customCommentary,
        onProgress: (p) => {
          if (activeOpIdRef.current === opId) {
            setProgress(p);
          }
        },
        signal: controller.signal,
        checkSession: () => {
          const user = useAppStore.getState().currentUser;
          return Boolean(user && user.role === 'admin');
        },
      });

      if (activeOpIdRef.current === opId) {
        addToast(
          'Export Complete',
          `Successfully generated ${result.slideCount}-slide PowerPoint deck (${result.fileName}).`,
          'success'
        );
        onClose();
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) {
        return;
      }
      if (activeOpIdRef.current === opId) {
        console.error('PPTX export error:', err);
        addToast(
          'Export Failed',
          err.message || 'Failed to generate PowerPoint export.',
          'warning'
        );
      }
    } finally {
      if (activeOpIdRef.current === opId) {
        setIsExporting(false);
        setProgress(null);
        abortControllerRef.current = null;
        setActiveExportController(null);
      }
    }
  };

  const activeCommentaryText = customCommentary[activeCommentaryTab] || '';
  const activeCommentaryLength = activeCommentaryText.length;
  const activeReportMeta = REPORT_TABS.find((t) => t.id === activeCommentaryTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-xl w-full p-6 space-y-4 text-ink max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
              <Presentation className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">Export Executive PowerPoint Deck</h2>
              <p className="text-xs text-zinc-500">16:9 widescreen presentation matching Tiketa executive standard</p>
            </div>
          </div>
          {!isExporting && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Export Mode Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Export Scope</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={isExporting}
              onClick={() => handleModeChange('current')}
              className={`p-3 rounded-2xl border text-left transition-all ${
                mode === 'current'
                  ? 'border-orange-500 bg-orange-50/50 shadow-sm'
                  : 'border-zinc-200 hover:border-zinc-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink">Current report</span>
                {mode === 'current' && <CheckCircle2 className="w-4 h-4 text-orange-600" />}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">1 slide (active)</p>
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={() => handleModeChange('all')}
              className={`p-3 rounded-2xl border text-left transition-all ${
                mode === 'all'
                  ? 'border-orange-500 bg-orange-50/50 shadow-sm'
                  : 'border-zinc-200 hover:border-zinc-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink">All reports</span>
                {mode === 'all' && <CheckCircle2 className="w-4 h-4 text-orange-600" />}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">8 slides (full suite)</p>
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={() => handleModeChange('custom')}
              className={`p-3 rounded-2xl border text-left transition-all ${
                mode === 'custom'
                  ? 'border-orange-500 bg-orange-50/50 shadow-sm'
                  : 'border-zinc-200 hover:border-zinc-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink">Custom selection</span>
                {mode === 'custom' && <CheckCircle2 className="w-4 h-4 text-orange-600" />}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">{slideCount} selected</p>
            </button>
          </div>
        </div>

        {/* Custom Selection Checkboxes */}
        {mode === 'custom' && (
          <div className="space-y-1.5 p-3 rounded-2xl bg-zinc-50 border border-zinc-200 max-h-40 overflow-y-auto">
            <div className="text-[11px] font-semibold text-zinc-500 uppercase px-1">Choose Reports to Include:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {REPORT_TABS.map((tab) => {
                const isChecked = selectedIds.includes(tab.id);
                return (
                  <label
                    key={tab.id}
                    className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white text-xs cursor-pointer select-none transition-colors"
                  >
                    <input
                      type="checkbox"
                      disabled={isExporting}
                      checked={isChecked}
                      onChange={() => handleToggleReport(tab.id)}
                      className="rounded text-orange-600 focus:ring-orange-500 w-3.5 h-3.5"
                    />
                    <span className={`truncate ${isChecked ? 'font-semibold text-ink' : 'text-zinc-600'}`}>
                      {tab.title}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* @spec F-06: Editable Commentary Draft with Preflight Fit Validator */}
        {selectedIds.length > 0 && (
          <div className="space-y-2 p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-600 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-orange-500" />
                <span>Executive Commentary Draft (Editable)</span>
              </span>
              <span
                className={`text-[11px] font-mono font-bold ${
                  activeCommentaryLength > MAX_COMMENTARY_LENGTH
                    ? 'text-rose-600'
                    : 'text-zinc-500'
                }`}
              >
                {activeCommentaryLength} / {MAX_COMMENTARY_LENGTH} chars
              </span>
            </div>

            {selectedIds.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {selectedIds.map((id) => {
                  const tab = REPORT_TABS.find((t) => t.id === id);
                  const isCurrent = activeCommentaryTab === id;
                  const isOverflow = (customCommentary[id] || '').length > MAX_COMMENTARY_LENGTH;
                  return (
                    <button
                      key={id}
                      type="button"
                      disabled={isExporting}
                      onClick={() => setActiveCommentaryTab(id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                        isCurrent
                          ? 'bg-zinc-900 text-white'
                          : isOverflow
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                      }`}
                    >
                      {tab?.code || `R${id}`}
                    </button>
                  );
                })}
              </div>
            )}

            <div>
              <p className="text-[11px] text-zinc-400 mb-1">
                Editing slide note for: <span className="font-semibold text-zinc-700">{activeReportMeta?.title}</span> (leave blank to use auto-generated analysis)
              </p>
              <textarea
                rows={3}
                disabled={isExporting}
                value={activeCommentaryText}
                onChange={(e) => {
                  setCustomCommentary({
                    ...customCommentary,
                    [activeCommentaryTab]: e.target.value,
                  });
                }}
                placeholder="Enter custom executive commentary with **key metrics** bolded..."
                className={`w-full p-2.5 rounded-xl text-xs bg-white border transition-colors focus:outline-none ${
                  activeCommentaryLength > MAX_COMMENTARY_LENGTH
                    ? 'border-rose-400 focus:border-rose-500 ring-1 ring-rose-200'
                    : 'border-zinc-300 focus:border-orange-500'
                }`}
              />
            </div>

            {overflowingReport && (
              <div
                role="alert"
                className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  <strong>Capacity Overflow:</strong> Commentary for <em>{overflowingReport.title}</em> exceeds the single-slide budget ({overflowingReport.length} / {MAX_COMMENTARY_LENGTH} chars). Shorten text to avoid layout overlap.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Reporting Period & Confirmation Banner */}
        <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              Reporting Period:
            </span>
            <span className="font-mono font-bold text-ink">{formattedPeriod}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-zinc-400" />
              Total Slide Count:
            </span>
            <span className="font-mono font-bold text-orange-600">{slideCount} Slide{slideCount !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* PMS Validation Alert & Proposed Complete Months Action */}
        {includesPms && !pmsValidation.isValid && (
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2 animate-fade-in">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Complete Month Required for PMS:</span>
                <p className="mt-0.5 text-amber-800">
                  Fleet PMS Compliance requires full calendar months (from the 1st to the last day) to calculate planned denominators.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={isExporting}
              onClick={handleUseCompleteMonths}
              className="w-full py-1.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shadow-sm inline-flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Use complete months ({pmsValidation.suggestedFrom} to {pmsValidation.suggestedTo})</span>
            </button>
          </div>
        )}

        {/* In-Flight Progress Bar */}
        {isExporting && progress && (
          <div className="space-y-2 p-3 rounded-2xl bg-zinc-100 border border-zinc-200 animate-fade-in">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-700 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 text-orange-600 animate-spin" />
                {progress.phase === 'fetching' && 'Fetching verified audit rows...'}
                {progress.phase === 'rendering' && 'Rendering 2.96:1 chart canvas...'}
                {progress.phase === 'assembling' && 'Assembling 16:9 presentation slide...'}
                {progress.phase === 'saving' && 'Packaging presentation file...'}
              </span>
              <span className="font-mono text-zinc-500">
                {progress.currentStep} / {progress.totalSteps}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-zinc-200 overflow-hidden">
              <div
                className="h-full bg-orange-600 transition-all duration-300"
                style={{
                  width: `${(progress.currentStep / progress.totalSteps) * 100}%`,
                }}
              />
            </div>
            <div className="text-[11px] text-zinc-500 truncate font-mono">
              Current: {progress.currentReportName}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100">
          {isExporting ? (
            <button
              type="button"
              onClick={handleCancelExport}
              className="py-2 px-4 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-semibold text-xs transition-colors"
            >
              Cancel Export
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="py-2 px-4 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-700 font-semibold text-xs transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                disabled={isExportDisabled}
                onClick={handleStartExport}
                className={`py-2 px-5 rounded-xl font-bold text-xs shadow-sm transition-all inline-flex items-center gap-2 ${
                  isExportDisabled
                    ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-white press-fx'
                }`}
              >
                <Presentation className="w-4 h-4 text-orange-400" />
                <span>Generate {slideCount}-Slide PPTX</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
