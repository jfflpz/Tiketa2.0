// @spec SR-04: Authenticated walk-in / Viber intake using the employee directory.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { TASK_CATEGORIES } from '../../constants/domain';
import type { TaskCategoryCode } from '../../types/ticket';
import { useQuickIntake } from './useQuickIntake';
import { useCategoryCatalog } from '../../hooks/useCategoryCatalog';

const fieldClass = 'w-full px-3 py-2 bg-canvas border border-line rounded-xl text-sm text-ink';

export const QuickIntakeModal = () => {
  const form = useQuickIntake();
  const { activeSubcategories } = useCategoryCatalog(form.taskCode);
  const setActiveView = useAppStore((state) => state.setActiveView);
  const setSelectedTicketId = useAppStore((state) => state.setSelectedTicketId);
  const copyTicketShareLink = useAppStore((state) => state.copyTicketShareLink);
  const dictionaries = useAppStore((state) => state.serverDictionaries);
  const [showNewNonemployee, setShowNewNonemployee] = useState(false);
  const [newNeName, setNewNeName] = useState('');
  const [newNeCompanyId, setNewNeCompanyId] = useState('');
  const [newNeLocationId, setNewNeLocationId] = useState('');
  const [newNeDepartmentId, setNewNeDepartmentId] = useState('');
  const [newNeContactHint, setNewNeContactHint] = useState('');

  // Handle ESC key dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && form.isOpen && !form.isSubmitting) {
        form.close();
      }
    };
    if (form.isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [form.isOpen, form.isSubmitting, form.close]);

  if (!form.isOpen) return null;
  const ticket = form.createdTicket;
  const tasks = dictionaries?.tasks ?? TASK_CATEGORIES;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-0" onClick={() => !form.isSubmitting && form.close()} aria-hidden="true" />
      <section role="dialog" aria-modal="true" aria-labelledby="quick-intake-title"
        className="relative w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden bg-surface border border-line rounded-3xl shadow-2xl">
        <header className="px-6 py-4 bg-canvas border-b border-line flex items-center justify-between shrink-0">
          <div>
            <h2 id="quick-intake-title" className="text-sm font-bold text-ink">
              {ticket ? 'Ticket Created' : 'Log Walk-In / Viber Support Ticket'}
            </h2>
            <p className="text-xs text-ink-subtle">{ticket ? 'Saved to the support queue.' : 'Find the employee, then describe the issue.'}</p>
          </div>
          <button type="button" onClick={form.close} disabled={form.isSubmitting} aria-label="Close intake"
            className="p-2 text-ink-subtle disabled:opacity-50"><X className="w-4 h-4" /></button>
        </header>
        {ticket ? (
          <div className="p-6 space-y-4 flex-1 overflow-y-auto">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            <p className="font-bold text-ink">{ticket.ticketCode} created successfully</p>
            <p className="text-sm text-ink-subtle">Created for {ticket.requestor} (Employee ID {ticket.employeeId}).</p>
            <p className="text-sm text-ink">{ticket.task} · {ticket.mode === 'REM' ? 'Remote' : 'On-Site'}</p>
            <p className="text-sm text-ink-subtle whitespace-pre-wrap break-words">{ticket.description}</p>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button type="button" onClick={() => void copyTicketShareLink(ticket.ticketCode)} className="px-4 py-2 border border-line rounded-xl text-sm text-ink">Copy Ticket Link</button>
              <button type="button" onClick={form.reset} className="px-4 py-2 border border-line rounded-xl text-sm text-ink">Log Another</button>
              <button type="button" onClick={() => {
                setSelectedTicketId(ticket.id);
                setActiveView('workbench');
                form.close();
              }} className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm">Open in Workbench</button>
            </div>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className={`flex-1 overflow-y-auto p-6 space-y-4 min-h-0 ${form.isSubmitting ? 'opacity-70 pointer-events-none' : ''}`}>
              {/* Requester Type Toggle (Employee vs Authorized Nonemployee) */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => form.setRequesterType('employee')}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold border ${
                    form.requesterType === 'employee'
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-canvas text-ink-subtle border-line'
                  }`}
                >
                  Registered Employee
                </button>
                <button
                  type="button"
                  onClick={() => form.setRequesterType('nonemployee')}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold border ${
                    form.requesterType === 'nonemployee'
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-canvas text-ink-subtle border-line'
                  }`}
                >
                  Nonemployee / Focal
                </button>
              </div>

              {form.requesterType === 'employee' ? (
                <>
                  <label className="block text-xs font-semibold text-ink">
                    Employee ID
                    <input autoFocus required type="text" inputMode="numeric" maxLength={50} pattern="[0-9]{1,50}"
                      value={form.employeeId} onChange={(event) => form.changeEmployeeId(event.target.value)}
                      placeholder="e.g. 1042" aria-describedby="quick-intake-lookup" className={fieldClass + ' mt-1'} />
                  </label>
                  <div id="quick-intake-lookup" role="status" className="text-xs text-ink-subtle">
                    {form.lookupMessage}
                    {!form.employee && !form.lookupPending && /^[0-9]{1,50}$/.test(form.employeeId.trim()) && (
                      <button type="button" onClick={form.retryLookup} className="ml-2 underline text-ink">Retry lookup</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Requestor', form.employee?.full_name],
                      ['Company', form.employee?.company_name],
                      ['Location', form.employee?.location_name],
                      ['Department', form.employee?.department_name],
                    ].map(([label, value]) => (
                      <label key={label} className="text-xs text-ink-subtle">{label}
                        <input readOnly value={value ?? ''} placeholder="From employee profile" className={fieldClass + ' mt-1'} />
                      </label>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-3 p-3 rounded-2xl bg-canvas border border-line">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-ink">Search Nonemployee Requester</label>
                    <button
                      type="button"
                      onClick={() => setShowNewNonemployee((v) => !v)}
                      className="text-[11px] font-bold text-orange-600 hover:underline"
                    >
                      {showNewNonemployee ? 'Back to Search' : '+ Register Nonemployee'}
                    </button>
                  </div>
                  {!showNewNonemployee ? (
                    <>
                      <input
                        type="text"
                        value={form.nonemployeeQuery}
                        onChange={(e) => void form.searchNonemployees(e.target.value)}
                        placeholder="Search by full name (disambiguated by location/dept)..."
                        className={fieldClass}
                      />
                      {form.isSearchingNonemployees && (
                        <p className="text-[11px] text-ink-subtle">Searching nonemployee directory...</p>
                      )}
                      {form.nonemployeeResults.length > 0 && (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto">
                          {form.nonemployeeResults.map((person) => (
                            <button
                              key={person.id}
                              type="button"
                              onClick={() => form.setSelectedNonemployee(person)}
                              className={`w-full text-left p-2 rounded-xl border text-xs ${
                                form.selectedNonemployee?.id === person.id
                                  ? 'bg-orange-50 border-orange-400 text-ink font-semibold'
                                  : 'bg-surface border-line text-ink hover:bg-zinc-50'
                              }`}
                            >
                              <div className="font-bold">{person.full_name}</div>
                              <div className="text-[11px] text-ink-subtle">
                                {person.company_name} · {person.location_name} · {person.department_name}
                                {person.contact_hint ? ` · ${person.contact_hint}` : ''}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {form.selectedNonemployee && (
                        <div data-testid="selected-nonemployee-summary" className="text-[11px] text-emerald-700 font-semibold">
                          Selected: {form.selectedNonemployee.full_name} ({form.selectedNonemployee.location_name} — {form.selectedNonemployee.department_name})
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newNeName}
                        onChange={(e) => setNewNeName(e.target.value)}
                        placeholder="Nonemployee full name"
                        className={fieldClass}
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <select value={newNeCompanyId} onChange={(e) => setNewNeCompanyId(e.target.value)} className={fieldClass}>
                          <option value="">Company</option>
                          {(dictionaries?.companies ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <select value={newNeLocationId} onChange={(e) => setNewNeLocationId(e.target.value)} className={fieldClass}>
                          <option value="">Location</option>
                          {(dictionaries?.locations ?? []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                        <select value={newNeDepartmentId} onChange={(e) => setNewNeDepartmentId(e.target.value)} className={fieldClass}>
                          <option value="">Department</option>
                          {(dictionaries?.departments ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </div>
                      <input
                        type="text"
                        value={newNeContactHint}
                        onChange={(e) => setNewNeContactHint(e.target.value)}
                        placeholder="Context / badge or phone hint (optional)"
                        className={fieldClass}
                      />
                      <button
                        type="button"
                        disabled={!newNeName.trim() || !newNeCompanyId || !newNeLocationId || !newNeDepartmentId}
                        onClick={async () => {
                          const created = await form.createNonemployee({
                            full_name: newNeName.trim(),
                            company_id: newNeCompanyId,
                            location_id: newNeLocationId,
                            department_id: newNeDepartmentId,
                            contact_hint: newNeContactHint.trim() || undefined,
                          });
                          if (created) setShowNewNonemployee(false);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-orange-600 text-white text-xs font-bold disabled:opacity-40"
                      >
                        Save Nonemployee Record
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Separate Reporter / Focal Person Field (F-E1) */}
              <label className="block text-xs font-semibold text-ink">
                Reporter / Focal Person (Optional — if reporting on behalf of requestor)
                <input
                  type="text"
                  value={form.reporterName}
                  onChange={(e) => form.setReporterName(e.target.value)}
                  placeholder="e.g. Dispatch Focal Person (leave blank if self-reported)"
                  className={fieldClass + ' mt-1'}
                />
              </label>
              <label className="block text-xs font-semibold text-ink">Issue / Task Category
                <select value={form.taskCode} onChange={(event) => form.setTaskCode(event.target.value as TaskCategoryCode)} className={fieldClass + ' mt-1'}>
                  {tasks.map((task) => <option key={task.code} value={task.code}>{task.name}</option>)}
                </select>
              </label>
              {activeSubcategories.length > 0 && (
                <label className="block text-xs font-semibold text-ink">
                  Subcategory (Optional)
                  <select
                    aria-label="Subcategory (Optional)"
                    value={form.subcategoryCode}
                    onChange={(event) => form.setSubcategoryCode(event.target.value)}
                    className={fieldClass + ' mt-1'}
                  >
                    <option value="">General / Parent category only</option>
                    {activeSubcategories.map((sub) => (
                      <option key={sub.code} value={sub.code}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="block text-xs font-semibold text-ink">Support Mode
                <select value={form.mode} onChange={(event) => form.setMode(event.target.value === 'REM' ? 'REM' : 'SITE')} className={fieldClass + ' mt-1'}>
                  <option value="REM">Remote</option><option value="SITE">On-Site</option>
                </select>
              </label>
              <label className="block text-xs font-semibold text-ink">Technical Symptoms &amp; Details
                <textarea required minLength={10} maxLength={20000} rows={3} value={form.description}
                  onChange={(event) => form.setDescription(event.target.value)} aria-describedby="quick-intake-details-help"
                  placeholder="Describe the issue, booth number, or error message…" className={fieldClass + ' mt-1'} />
              </label>
              <p id="quick-intake-details-help" className="text-xs text-ink-subtle">10–20,000 characters. Saved in the ticket description.</p>
              {form.error && <p role="alert" className="text-sm text-red-600">{form.error}</p>}
            </div>

            <div className="px-6 py-4 border-t border-line bg-canvas flex justify-end gap-2 shrink-0">
              <button type="button" onClick={form.close} disabled={form.isSubmitting} className="px-4 py-2 rounded-xl border border-line text-sm text-ink hover:bg-surface disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={(form.requesterType === 'employee' ? !form.employee || form.lookupPending : !form.selectedNonemployee) || form.isSubmitting}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold disabled:opacity-50">
                {form.isSubmitting ? 'Adding to Queue…' : 'Add Ticket to Queue'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>, document.body,
  );
};
