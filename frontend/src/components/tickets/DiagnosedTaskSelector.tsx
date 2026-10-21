// @spec FR-TICK-03 & SR-03: IT Specialist Diagnosed Task Reclassification with Smart Grouped Headers
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Tag,
  ChevronDown,
  Check,
  Search,
  Sparkles,
  Printer,
  Monitor,
  Wifi,
  AppWindow,
  Server,
  X,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { TaskCategoryCode } from '../../types/ticket';

interface TaskGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  categoryPrefixes: string[];
  tasks: { code: TaskCategoryCode; name: string }[];
}

const CANONICAL_TASK_GROUPS: TaskGroup[] = [
  {
    id: 'printer',
    label: 'Printer Tasks',
    icon: <Printer className="w-4 h-4 text-rose-500" />,
    categoryPrefixes: ['PRN-'],
    tasks: [
      { code: 'PRN-TS', name: 'Printer Troubleshoot' },
      { code: 'PRN-NET', name: 'Printer Network Connection' },
      { code: 'PRN-SETUP', name: 'Printer Set-up' },
      { code: 'PRN-PMS', name: 'Printer PMS' },
    ],
  },
  {
    id: 'computer',
    label: 'Computer & Hardware Tasks',
    icon: <Monitor className="w-4 h-4 text-amber-500" />,
    categoryPrefixes: ['PC-', 'PERIPH-'],
    tasks: [
      { code: 'PC-TS', name: 'PC/Laptop Troubleshoot' },
      { code: 'PC-HW-REP', name: 'PC/Laptop Hardware Replacement' },
      { code: 'PERIPH-REP', name: 'Peripherals Replacement' },
      { code: 'PC-SETUP', name: 'PC/Laptop Set-up' },
      { code: 'PC-ASSESS', name: 'PC/Laptop Assessment' },
      { code: 'PC-PMS', name: 'PC/Laptop PMS' },
    ],
  },
  {
    id: 'network',
    label: 'Network Tasks',
    icon: <Wifi className="w-4 h-4 text-sky-500" />,
    categoryPrefixes: ['NET-'],
    tasks: [
      { code: 'NET-CFG', name: 'Network Configuration' },
    ],
  },
  {
    id: 'software',
    label: 'Software Tasks',
    icon: <AppWindow className="w-4 h-4 text-emerald-500" />,
    categoryPrefixes: ['SW-'],
    tasks: [
      { code: 'SW-ASST', name: 'Software Assistance' },
    ],
  },
  {
    id: 'server',
    label: 'Infrastructure & Server',
    icon: <Server className="w-4 h-4 text-purple-500" />,
    categoryPrefixes: ['SRV-'],
    tasks: [
      { code: 'SRV-ASSESS', name: 'Server Assessment' },
    ],
  },
];

interface DiagnosedTaskSelectorProps {
  ticketId: string;
  currentTaskCode: TaskCategoryCode;
  currentTaskName: string;
  compact?: boolean;
}

export const DiagnosedTaskSelector: React.FC<DiagnosedTaskSelectorProps> = ({
  ticketId,
  currentTaskCode,
  currentTaskName,
  compact = false,
}) => {
  const { updateTicketTask } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Determine current group id to place relevant group on top
  const activeGroupId = useMemo(() => {
    for (const group of CANONICAL_TASK_GROUPS) {
      if (group.tasks.some((t) => t.code === currentTaskCode)) {
        return group.id;
      }
    }
    return 'computer';
  }, [currentTaskCode]);

  // Sort groups so the current category is first, then filter by search
  const displayedGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    // Reorder: active group first
    const sorted = [...CANONICAL_TASK_GROUPS].sort((a, b) => {
      if (a.id === activeGroupId) return -1;
      if (b.id === activeGroupId) return 1;
      return 0;
    });

    if (!query) return sorted;

    return sorted
      .map((group) => ({
        ...group,
        tasks: group.tasks.filter(
          (t) =>
            t.name.toLowerCase().includes(query) ||
            t.code.toLowerCase().includes(query)
        ),
      }))
      .filter((group) => group.tasks.length > 0);
  }, [activeGroupId, searchQuery]);

  const handleSelect = (code: TaskCategoryCode) => {
    updateTicketTask(ticketId, code);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left transition-all press-fx flex items-center justify-between gap-2 rounded-xl border ${
          compact
            ? 'px-2.5 py-1.5 bg-[#F4F6F9] hover:bg-[#EBEEF3] border-[#ECEEF2]'
            : 'px-3.5 py-2 bg-[#F4F6F9] hover:bg-[#EBEEF3] border-[#ECEEF2] shadow-2xs'
        } ${isOpen ? 'ring-2 ring-orange-500/30 border-orange-400' : ''}`}
        title="Click to refine or reclassify diagnosed task"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Tag className="w-4 h-4 text-orange-500 shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block leading-tight">
              Diagnosed Task &bull; Col #05
            </span>
            <span className="text-xs font-bold text-ink truncate block">
              {currentTaskName} <span className="text-zinc-500 font-mono text-[11px]">({currentTaskCode})</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 text-zinc-400">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
            Change
          </span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-orange-500' : ''}`} />
        </div>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 bg-white border border-[#E4E7EB] rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header & Search */}
          <div className="p-3 bg-[#FAFBFD] border-b border-[#ECEEF2]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-xs font-bold text-zinc-800">
                  Select Diagnosed Technical Task
                </span>
              </div>
              <span className="text-[10px] font-medium text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded">
                13 Verified Tasks
              </span>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search specific issue or code (e.g. PRN-NET)..."
                className="w-full pl-8 pr-7 py-1.5 bg-white border border-[#E0E3E8] rounded-lg text-xs text-ink placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Grouped Task List */}
          <div className="max-h-80 overflow-y-auto p-2 space-y-3 divide-y divide-[#F0F2F5]">
            {displayedGroups.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-400">
                No task categories match &quot;{searchQuery}&quot;
              </div>
            ) : (
              displayedGroups.map((group, groupIdx) => {
                const isCurrentCategoryGroup = group.id === activeGroupId;
                return (
                  <div key={group.id} className={groupIdx > 0 ? 'pt-2.5' : ''}>
                    {/* Group Header */}
                    <div className="flex items-center justify-between px-2 py-1 mb-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700">
                        {group.icon}
                        <span>{group.label}</span>
                      </div>
                      {isCurrentCategoryGroup && !searchQuery && (
                        <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.2 rounded border border-orange-200">
                          Current Category
                        </span>
                      )}
                    </div>

                    {/* Task Buttons */}
                    <div className="space-y-1">
                      {group.tasks.map((task) => {
                        const isSelected = task.code === currentTaskCode;
                        return (
                          <button
                            key={task.code}
                            type="button"
                            onClick={() => handleSelect(task.code)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors ${
                              isSelected
                                ? 'bg-orange-500 text-white font-bold shadow-2xs'
                                : 'hover:bg-[#F4F6F9] text-zinc-700 hover:text-zinc-900 font-medium'
                            }`}
                          >
                            <span className="truncate pr-2">{task.name}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                                  isSelected
                                    ? 'bg-orange-600 text-white border-orange-400'
                                    : 'bg-[#F2F4F8] text-zinc-500 border-[#E2E5EA]'
                                }`}
                              >
                                {task.code}
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div className="px-3 py-2 bg-[#F9FAFC] border-t border-[#ECEEF2] text-[10px] text-zinc-600 flex items-center justify-between">
            <span>Synchronized with 15-Column Master Job Log</span>
            <span className="font-mono text-zinc-600 font-bold">SR-03 Baseline</span>
          </div>
        </div>
      )}
    </div>
  );
};
