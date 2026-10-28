// @spec SR-04: Authenticated walk-in / Viber intake using the employee directory.
import { createPortal } from 'react-dom';
import { CheckCircle2, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { TASK_CATEGORIES } from '../../constants/domain';
import type { TaskCategoryCode } from '../../types/ticket';
import { useQuickIntake } from './useQuickIntake';

const fieldClass = 'w-full px-3 py-2 bg-canvas border border-line rounded-xl text-sm text-ink';

export const QuickIntakeModal = () => {
  const form = useQuickIntake();
  const setActiveView = useAppStore((state) => state.setActiveView);
  const setSelectedTicketId = useAppStore((state) => state.setSelectedTicketId);
  const copyTicketShareLink = useAppStore((state) => state.copyTicketShareLink);
  const dictionaries = useAppStore((state) => state.serverDictionaries);
  if (!form.isOpen) return null;
  const ticket = form.createdTicket;
  const tasks = dictionaries?.tasks ?? TASK_CATEGORIES;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={form.close} aria-hidden="true" />
      <section role="dialog" aria-modal="true" aria-labelledby="quick-intake-title"
        className="relative w-full max-w-lg max-h-[90dvh] overflow-y-auto bg-surface border border-line rounded-3xl shadow-2xl">
        <header className="px-6 py-4 bg-canvas border-b border-line flex items-center justify-between">
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
          <div className="p-6 space-y-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            <p className="font-bold text-ink">{ticket.ticketCode} created successfully</p>
            <p className="text-sm text-ink-subtle">Created for {ticket.requestor} (Employee ID {ticket.employeeId}).</p>
            <p className="text-sm text-ink">{ticket.task} · {ticket.mode === 'REM' ? 'Remote' : 'On-Site'}</p>
            <p className="text-sm text-ink-subtle whitespace-pre-wrap break-words">{ticket.description}</p>
            <div className="flex flex-wrap justify-end gap-2">
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
          <form onSubmit={form.handleSubmit} className="p-6 space-y-4">
            <fieldset disabled={form.isSubmitting} className="space-y-4 disabled:opacity-70">
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
                  ['Terminal Hub', form.employee?.location_name],
                  ['Department', form.employee?.department_name],
                ].map(([label, value]) => (
                  <label key={label} className="text-xs text-ink-subtle">{label}
                    <input readOnly value={value ?? ''} placeholder="From employee profile" className={fieldClass + ' mt-1'} />
                  </label>
                ))}
              </div>
              <label className="block text-xs font-semibold text-ink">Issue / Task Category
                <select value={form.taskCode} onChange={(event) => form.setTaskCode(event.target.value as TaskCategoryCode)} className={fieldClass + ' mt-1'}>
                  {tasks.map((task) => <option key={task.code} value={task.code}>{task.name}</option>)}
                </select>
              </label>
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
              <div className="flex justify-end gap-2">
                <button type="button" onClick={form.close} className="px-4 py-2 rounded-xl border border-line text-sm text-ink">Cancel</button>
                <button type="submit" disabled={!form.employee || form.lookupPending || form.isSubmitting}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-sm disabled:opacity-50">
                  {form.isSubmitting ? 'Adding to Queue…' : 'Add Ticket to Queue'}
                </button>
              </div>
            </fieldset>
          </form>
        )}
      </section>
    </div>, document.body,
  );
};
