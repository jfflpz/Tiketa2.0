import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Edit3,
  RotateCcw,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { REPORT_TABS, EXPORTABLE_REPORT_TABS, HARDWARE_HOTSPOTS_REPORT_ID, REPORT_SLUGS } from '../types/reportSchemas';
import { executePptxExport, mapReportData } from '../export/exportPptx';
import { generateExplanation } from '../export/explanationGenerator';
import { ExportChartRenderer } from '../export/ExportChartRenderer';
import { reportsApi } from '../../../api/client';
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
  const safeInitialReportId =
    initialReportId && initialReportId !== HARDWARE_HOTSPOTS_REPORT_ID ? initialReportId : 1;
  const [selectedIds, setSelectedIds] = useState<number[]>([safeInitialReportId]);

  const [customCommentary, setCustomCommentary] = useState<Record<number, string>>({});
  const [isCustomized, setIsCustomized] = useState<Record<number, boolean>>({});
  const [autoExplanations, setAutoExplanations] = useState<Record<number, string>>({});
  const [slideDataCache, setSlideDataCache] = useState<Record<number, any[]>>({});
  const [activeCommentaryTab, setActiveCommentaryTab] = useState<number>(safeInitialReportId);
  const [isEditingCommentary, setIsEditingCommentary] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxSlideIndex, setLightboxSlideIndex] = useState(0);
  const [chartScale, setChartScale] = useState(0.45);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const activeReportData = useAppStore((state) => state.activeReportData);

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

  useEffect(() => {
    if (isOpen) {
      setMode('current');
      const startId = safeInitialReportId;
      setSelectedIds([startId]);
      setActiveCommentaryTab(startId);
      setDateFrom(defaultDates.dateFrom);
      setDateTo(defaultDates.dateTo);
      setIsExporting(false);
      setProgress(null);
      setCustomCommentary({});
      setIsCustomized({});
      setAutoExplanations({});
      setSlideDataCache({});
      setIsEditingCommentary(false);
      setIsLightboxOpen(false);
      setLightboxSlideIndex(0);
    } else {
      activeOpIdRef.current++;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setActiveExportController(null);
      setIsExporting(false);
      setProgress(null);
      setIsEditingCommentary(false);
      setIsLightboxOpen(false);
    }
  }, [isOpen, initialReportId, defaultDates, setActiveExportController]);

  useEffect(() => {
    if (!isOpen) return;

    // Fast path: use active report data from store if viewing current report tab
    if (activeCommentaryTab === initialReportId && activeReportData && activeReportData.length > 0) {
      const mapped = mapReportData(activeCommentaryTab, activeReportData);
      setSlideDataCache((prev) => ({ ...prev, [activeCommentaryTab]: mapped }));
      const expl = generateExplanation(activeCommentaryTab, mapped, { dateFrom, dateTo });
      setAutoExplanations((prev) => ({ ...prev, [activeCommentaryTab]: expl.text }));
      return;
    }

    // Async path: fetch report snapshot to generate live preview
    const slug = REPORT_SLUGS[activeCommentaryTab];
    if (slug) {
      let isMounted = true;
      reportsApi
        .getReport(slug, {
          ...filterParams,
          date_from: dateFrom,
          date_to: dateTo,
        })
        .then((res) => {
          if (!isMounted) return;
          const mapped = mapReportData(activeCommentaryTab, res?.rows || []);
          setSlideDataCache((prev) => ({ ...prev, [activeCommentaryTab]: mapped }));
          const expl = generateExplanation(activeCommentaryTab, mapped, { dateFrom, dateTo });
          setAutoExplanations((prev) => ({ ...prev, [activeCommentaryTab]: expl.text }));
        })
        .catch(() => {
          if (!isMounted) return;
          setSlideDataCache((prev) => ({ ...prev, [activeCommentaryTab]: [] }));
          const expl = generateExplanation(activeCommentaryTab, [], { dateFrom, dateTo });
          setAutoExplanations((prev) => ({ ...prev, [activeCommentaryTab]: expl.text }));
        });

      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, activeCommentaryTab, initialReportId, activeReportData, dateFrom, dateTo, filterParams]);

  // Keyboard navigation & escape listener for Lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      } else if (e.key === 'ArrowLeft') {
        setLightboxSlideIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        setLightboxSlideIndex((prev) => Math.min(selectedIds.length - 1, prev + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, selectedIds.length]);

  // Fetch slide data for current lightbox slide if missing
  const activeLightboxReportId = selectedIds[lightboxSlideIndex] || selectedIds[0] || initialReportId || 1;
  const lightboxSlideMeta = REPORT_TABS.find((t) => t.id === activeLightboxReportId) || REPORT_TABS[0];
  const currentLightboxSlideData = slideDataCache[activeLightboxReportId] || [];
  const currentLightboxCommentary = isCustomized[activeLightboxReportId]
    ? (customCommentary[activeLightboxReportId] ?? '')
    : (autoExplanations[activeLightboxReportId] || generateExplanation(activeLightboxReportId, [], { dateFrom, dateTo }).text);

  useEffect(() => {
    if (!isOpen || !isLightboxOpen || !activeLightboxReportId) return;
    if (slideDataCache[activeLightboxReportId] !== undefined) return;

    const slug = REPORT_SLUGS[activeLightboxReportId];
    if (slug) {
      reportsApi
        .getReport(slug, {
          ...filterParams,
          date_from: dateFrom,
          date_to: dateTo,
        })
        .then((res) => {
          const mapped = mapReportData(activeLightboxReportId, res?.rows || []);
          setSlideDataCache((prev) => ({ ...prev, [activeLightboxReportId]: mapped }));
          const expl = generateExplanation(activeLightboxReportId, mapped, { dateFrom, dateTo });
          setAutoExplanations((prev) => ({ ...prev, [activeLightboxReportId]: expl.text }));
        })
        .catch(() => {
          setSlideDataCache((prev) => ({ ...prev, [activeLightboxReportId]: [] }));
        });
    }
  }, [isOpen, isLightboxOpen, activeLightboxReportId, slideDataCache, filterParams, dateFrom, dateTo]);

  // Measure chart container width and calculate scale factor to fit 1896x640 canvas
  useEffect(() => {
    if (!isLightboxOpen) return;
    const el = chartContainerRef.current;
    if (!el) return;

    const updateScale = () => {
      const width = el.clientWidth || 800;
      if (width > 0) {
        setChartScale(width / 1896);
      }
    };

    updateScale();

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(updateScale);
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, [isLightboxOpen, activeLightboxReportId, lightboxSlideIndex]);

  // Mode change handlers
  const handleModeChange = (newMode: ExportMode) => {
    setMode(newMode);
    if (newMode === 'current') {
      const id = safeInitialReportId;
      setSelectedIds([id]);
      setActiveCommentaryTab(id);
    } else if (newMode === 'all') {
      const allIds = EXPORTABLE_REPORT_TABS.map((t) => t.id);
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

    const startingUser = useAppStore.getState().currentUser;
    const opId = ++activeOpIdRef.current;
    setIsExporting(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setActiveExportController(controller);

    try {
          const customizedOnly: Record<number, string> = {};
          for (const id of selectedIds) {
            if (isCustomized[id] && customCommentary[id] && customCommentary[id].trim().length > 0) {
              customizedOnly[id] = customCommentary[id].trim();
            }
          }

      const result = await executePptxExport({
        selectedReportIds: selectedIds,
        dateRange: { dateFrom, dateTo },
        filterParams,
        customCommentaryByReportId: customizedOnly,
        onProgress: (p) => {
          if (activeOpIdRef.current === opId) {
            setProgress(p);
          }
        },
        signal: controller.signal,
        checkSession: () => {
          const user = useAppStore.getState().currentUser;
          return Boolean(startingUser && user && user.id === startingUser.id &&
            (user.role === 'admin' || user.role === 'supervisor'));
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

  const isCurrentlyCustomized = Boolean(isCustomized[activeCommentaryTab]);
  const defaultExplanationText =
    autoExplanations[activeCommentaryTab] ||
    generateExplanation(activeCommentaryTab, [], { dateFrom, dateTo }).text;
  const displayedText = isCurrentlyCustomized
    ? (customCommentary[activeCommentaryTab] ?? '')
    : defaultExplanationText;
  const activeCommentaryLength = displayedText.length;
  const activeReportMeta = REPORT_TABS.find((t) => t.id === activeCommentaryTab);

  const handleEnableCustomization = () => {
    setIsCustomized((prev) => ({ ...prev, [activeCommentaryTab]: true }));
    setIsEditingCommentary(true);
    if (customCommentary[activeCommentaryTab] === undefined) {
      setCustomCommentary((prev) => ({
        ...prev,
        [activeCommentaryTab]: defaultExplanationText,
      }));
    }
  };

  const handleRevertToAuto = () => {
    setIsCustomized((prev) => ({ ...prev, [activeCommentaryTab]: false }));
    setIsEditingCommentary(false);
    setCustomCommentary((prev) => {
      const next = { ...prev };
      delete next[activeCommentaryTab];
      return next;
    });
  };

  const renderSlidePreview = (text: string) => {
    if (!text || text.trim().length === 0) {
      return <span className="italic text-zinc-400">No commentary entered.</span>;
    }
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? (
        <strong key={i} className="font-bold text-ink">
          {part.slice(2, -2)}
        </strong>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
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
              {EXPORTABLE_REPORT_TABS.map((tab) => {
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

        {selectedIds.length > 0 && (
          <div className="space-y-2 p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-600 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-orange-500" />
                <span>Executive Commentary Draft</span>
              </span>
              <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    {isCurrentlyCustomized && (
                      <span
                        className={`text-[11px] font-mono font-bold ${
                          activeCommentaryLength > MAX_COMMENTARY_LENGTH
                            ? 'text-rose-600'
                            : 'text-zinc-500'
                        }`}
                      >
                        {activeCommentaryLength} / {MAX_COMMENTARY_LENGTH} chars
                      </span>
                    )}
                  </div>
              </div>
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
                      onClick={() => {
                        setActiveCommentaryTab(id);
                        setIsEditingCommentary(false);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                        isCurrent
                          ? 'bg-zinc-900 text-white'
                          : isOverflow
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                      }`}
                    >
                      {tab?.shortTitle || `R${id}`}
                    </button>
                  );
                })}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] text-zinc-500">
                  Slide note for: <span className="font-semibold text-zinc-700">{activeReportMeta?.title}</span>
                </p>
                <div className="flex items-center gap-1.5">
                  {!isEditingCommentary ? (
                    <button
                      type="button"
                      disabled={isExporting}
                      onClick={handleEnableCustomization}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-[11px] font-semibold transition-colors"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Customize Note</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={isExporting}
                        onClick={handleRevertToAuto}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-200/70 hover:bg-zinc-200 text-zinc-700 text-[11px] font-semibold transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Revert to Auto</span>
                      </button>
                      <button
                        type="button"
                        disabled={isExporting}
                        onClick={() => setIsEditingCommentary(false)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-semibold transition-colors shadow-2xs"
                      >
                        <span>Done Editing</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Single Field Toggle: ONLY ONE box visible at any time */}
              {!isEditingCommentary ? (
                <>
                  <div
                    onClick={handleEnableCustomization}
                    className="p-3 rounded-xl bg-orange-50/50 border border-orange-200/80 text-xs cursor-pointer hover:bg-orange-50/70 transition-all shadow-2xs group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-orange-800 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-orange-600" />
                        <span>Live Slide Preview (PowerPoint View)</span>
                      </span>
                    </div>
                    <p className="text-zinc-800 leading-relaxed font-normal">
                      {renderSlidePreview(displayedText)}
                    </p>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-orange-400 shrink-0" />
                    <span>Showing slide commentary. Click the box or press <strong>Customize Note</strong> to edit.</span>
                  </p>
                </>
              ) : (
                <p className="text-[10px] text-zinc-400 mb-1">
                  Tip: Surround key numbers with <code className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-600 font-mono">**double asterisks**</code> to bold them on the slide. Press <strong>Done Editing</strong> above when finished.
                </p>
              )}

              {/* Single Textarea: fully visible when editing, or hidden when viewing preview */}
              <textarea
                rows={3}
                disabled={isExporting}
                readOnly={!isEditingCommentary}
                value={displayedText}
                onChange={(e) => {
                  setIsCustomized((prev) => ({ ...prev, [activeCommentaryTab]: true }));
                  setCustomCommentary({
                    ...customCommentary,
                    [activeCommentaryTab]: e.target.value,
                  });
                }}
                placeholder="Enter custom executive commentary with **key metrics** bolded..."
                className={
                  !isEditingCommentary
                    ? 'sr-only'
                    : `w-full p-2.5 rounded-xl text-xs bg-white border transition-colors focus:outline-none ${
                        activeCommentaryLength > MAX_COMMENTARY_LENGTH
                          ? 'border-rose-400 focus:border-rose-500 ring-1 ring-rose-200 text-ink'
                          : 'border-orange-500 ring-1 ring-orange-200 text-ink'
                      }`
                }
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
                onClick={() => {
                  setLightboxSlideIndex(0);
                  setIsLightboxOpen(true);
                }}
                className="py-2 px-3.5 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs transition-colors inline-flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5 text-orange-600" />
                <span>Preview Slide Deck</span>
              </button>
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

  {/* Lightbox / Full-Screen Slide Deck Modal (Messenger / Viber photo-viewer style) */}
  {isLightboxOpen && (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="PowerPoint Slide Preview Lightbox"
      className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex flex-col items-center justify-between p-4 md:p-6 animate-fade-in"
      onClick={() => setIsLightboxOpen(false)}
    >
      {/* Top Bar */}
      <div
        className="w-full max-w-5xl flex items-center justify-between text-white pb-2 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-600/30 border border-orange-500/40 flex items-center justify-center text-orange-400">
            <Presentation className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              {lightboxSlideMeta?.title || 'Slide Preview'}
            </h3>
            <p className="text-[11px] text-zinc-400">
              Slide {lightboxSlideIndex + 1} of {selectedIds.length} &bull; 16:9 Executive PowerPoint Presentation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-block text-[11px] text-zinc-400 font-mono bg-zinc-800/80 px-2 py-1 rounded-md border border-zinc-700">
            ESC to close
          </span>
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors border border-zinc-700"
            aria-label="Close Slide Preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main 16:9 Slide Canvas */}
      <div
        className="relative w-full max-w-4xl flex items-center justify-center my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Nav Arrow (when multiple slides) */}
        {selectedIds.length > 1 && (
          <button
            type="button"
            disabled={lightboxSlideIndex === 0}
            onClick={() => setLightboxSlideIndex((prev) => Math.max(0, prev - 1))}
            className={`absolute -left-4 md:-left-12 z-10 p-2.5 rounded-full bg-zinc-900/90 border border-zinc-700 text-white shadow-xl transition-all ${
              lightboxSlideIndex === 0
                ? 'opacity-30 cursor-not-allowed'
                : 'hover:bg-orange-600 hover:border-orange-500 cursor-pointer'
            }`}
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

            {/* 16:9 Slide Canvas */}
            <div className="w-full aspect-[16/9] bg-white rounded-sm shadow-2xl px-[6.9%] pt-[4.3%] pb-[4.3%] flex flex-col justify-between border
            border-zinc-300 select-none overflow-hidden relative">
              {/* Slide Title & Period */}
              <div>
                <h2 className="text-lg md:text-2xl font-bold text-[#333333] tracking-tight leading-tight">
                  {lightboxSlideMeta?.title}
                </h2>
                <p className="text-xs md:text-sm font-normal text-[#555555] mt-0.5">
                  {formattedPeriod}
                </p>
              </div>

              {/* Slide Chart Body (Scaled 1896x640 exact PowerPoint canvas) */}
              <div
                ref={chartContainerRef}
                className="w-full relative overflow-hidden my-auto"
                style={{ aspectRatio: '1896 / 640' }}
              >
                <div
                  style={{
                    width: '1896px',
                    height: '640px',
                    transform: `scale(${chartScale})`,
                    transformOrigin: 'top left',
                  }}
                >
                  <ExportChartRenderer
                    reportId={activeLightboxReportId}
                    data={currentLightboxSlideData}
                  />
                </div>
              </div>

              {/* Slide Bottom Commentary */}
              <div className="text-xs md:text-[13px] text-[#333333] leading-relaxed pt-1">
                {renderSlidePreview(currentLightboxCommentary)}
              </div>
            </div>

            {/* Right Nav Arrow (when multiple slides) */}
            {selectedIds.length > 1 && (
              <button
                type="button"
                disabled={lightboxSlideIndex === selectedIds.length - 1}
                onClick={() => setLightboxSlideIndex((prev) => Math.min(selectedIds.length - 1, prev + 1))}
                className={`absolute -right-4 md:-right-12 z-10 p-2.5 rounded-full bg-zinc-900/90 border border-zinc-700 text-white shadow-xl transition-all ${
                  lightboxSlideIndex === selectedIds.length - 1
                    ? 'opacity-30 cursor-not-allowed'
                    : 'hover:bg-orange-600 hover:border-orange-500 cursor-pointer'
                }`}
                aria-label="Next slide"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Bottom Slide Strip */}
          <div
            className="w-full max-w-5xl flex items-center justify-center gap-3 pt-2 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedIds.length > 1 && (
              <div className="flex items-center gap-1.5 bg-zinc-900/80 px-3 py-1.5 rounded-full border border-zinc-800">
                {selectedIds.map((id, idx) => {
                  const isCurrent = idx === lightboxSlideIndex;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setLightboxSlideIndex(idx)}
                      className={`h-2 rounded-full transition-all ${
                        isCurrent ? 'bg-orange-500 w-6' : 'bg-zinc-600 hover:bg-zinc-400 w-2'
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
