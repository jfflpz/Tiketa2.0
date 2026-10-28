import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError } from 'axios';
import { QuickIntakeModal } from '../src/components/tickets/QuickIntakeModal';
import { ToastContainer } from '../src/components/common/ToastContainer';
import { useAppStore } from '../src/store/useAppStore';
import { adminApi, directoryApi, ticketsApi, type EmployeeLookupResult, type StaffTicketResponse } from '../src/api/client';

const profile: EmployeeLookupResult = {
  id: 'employee-uuid', employee_id: '001042', full_name: 'Directory Employee',
  email: 'employee@example.com', is_active: true,
  company_id: 'company-uuid', company_name: 'Registered Company',
  location_id: 'location-uuid', location_name: 'Registered Terminal',
  department_id: 'department-uuid', department_name: 'Registered Department',
};
const dictionaries = {
  companies: [{ id: profile.company_id, code: 'COMP', name: profile.company_name }],
  locations: [{ id: profile.location_id, code: 'TERM', name: profile.location_name }],
  departments: [{ id: profile.department_id, code: 'DEPT', name: profile.department_name }],
  tasks: [{ id: '', code: 'PRN-TS', name: 'Printer troubleshooting' }], location_departments: [],
};
const saved: StaffTicketResponse = {
  id: 'saved-ticket', ticket_code: 'T-2610-0001', company_id: profile.company_id,
  location_id: profile.location_id, department_id: profile.department_id,
  requester_name: profile.full_name, task_code: 'PRN-TS', description: 'Saved technical details',
  mode: 'REM', status: 'OPEN', month: 'October 2026', date_started: '2026-10-24',
  date_finished: null, time_started: null, time_finished: null, duration: null,
  assigned_tech_id: null, user_confirmed_at: null, created_at: '2026-10-23T20:00:00Z',
};

const apiError = (status: number, detail: unknown) => Object.assign(new AxiosError('Request failed'), {
  response: { status, data: { detail } },
});
const openModal = () => render(<><QuickIntakeModal /><ToastContainer /></>);
const enterEmployee = async (id = profile.employee_id) => {
  fireEvent.change(screen.getByLabelText('Employee ID'), { target: { value: id } });
  await waitFor(() => expect(screen.getByLabelText('Requestor')).toHaveProperty('value', profile.full_name));
};
const enterDetails = (text = saved.description) => fireEvent.change(screen.getByLabelText('Technical Symptoms & Details'), { target: { value: text } });
const submitForm = () => fireEvent.submit(screen.getByRole('button', { name: 'Add Ticket to Queue' }).closest('form')!);

beforeEach(() => {
  vi.spyOn(adminApi, 'getDictionaries').mockResolvedValue(dictionaries);
  vi.spyOn(directoryApi, 'lookupEmployee').mockResolvedValue(profile);
  vi.spyOn(ticketsApi, 'quickIntake').mockResolvedValue(saved);
  vi.spyOn(ticketsApi, 'getQueue').mockResolvedValue([saved]);
  useAppStore.setState({ isQuickIntakeOpen: true, tickets: [], toasts: [], serverDictionaries: dictionaries });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('staff quick intake', () => {
  it('starts empty and prevents unknown employees from creating tickets', async () => {
    vi.mocked(directoryApi.lookupEmployee).mockRejectedValue(apiError(404, 'Active employee not found'));
    openModal();
    expect(screen.getByLabelText('Employee ID')).toHaveProperty('value', '');
    expect(screen.getByRole('button', { name: 'Add Ticket to Queue' })).toHaveProperty('disabled', true);
    fireEvent.change(screen.getByLabelText('Employee ID'), { target: { value: '9999' } });
    await screen.findByText(/Ask an administrator to add or correct/);
    submitForm();
    expect(ticketsApi.quickIntake).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('distinguishes lookup failure from an unlisted employee and supports retry', async () => {
    vi.mocked(directoryApi.lookupEmployee).mockRejectedValueOnce(new Error('Network unavailable'));
    openModal();
    fireEvent.change(screen.getByLabelText('Employee ID'), { target: { value: profile.employee_id } });
    await screen.findByText(/Network unavailable/);
    expect(screen.queryByText(/Ask an administrator/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry lookup' }));
    await waitFor(() => expect(screen.getByLabelText('Requestor')).toHaveProperty('value', profile.full_name));
  });

  it('keeps the modal and entered details when a structured validation error is returned', async () => {
    vi.mocked(ticketsApi.quickIntake).mockRejectedValue(apiError(422, [{ loc: ['body', 'description'], msg: 'Description must have 10 characters' }]));
    openModal();
    await enterEmployee();
    enterDetails();
    submitForm();
    await screen.findByText('Description must have 10 characters');
    expect(screen.getByLabelText('Technical Symptoms & Details')).toHaveProperty('value', saved.description);
    expect(screen.getByRole('button', { name: 'Add Ticket to Queue' })).toHaveProperty('disabled', false);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('validates trimmed description length before calling the API', async () => {
    openModal();
    await enterEmployee();
    enterDetails('     short     ');
    submitForm();
    await screen.findByText(/Enter between 10 and 20,000/);
    expect(ticketsApi.quickIntake).not.toHaveBeenCalled();
  });

  it('discards stale lookups and immediately disables submission after an ID change', async () => {
    let resolveOld!: (value: EmployeeLookupResult) => void;
    vi.mocked(directoryApi.lookupEmployee).mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
    openModal();
    fireEvent.change(screen.getByLabelText('Employee ID'), { target: { value: '1042' } });
    await waitFor(() => expect(directoryApi.lookupEmployee).toHaveBeenCalledWith('1042'));
    await enterEmployee();
    await act(async () => { resolveOld({ ...profile, employee_id: '1042', full_name: 'Stale Employee' }); });
    expect(screen.getByLabelText('Requestor')).toHaveProperty('value', profile.full_name);
    fireEvent.change(screen.getByLabelText('Employee ID'), { target: { value: '8' } });
    expect(screen.getByLabelText('Requestor')).toHaveProperty('value', '');
    expect(screen.getByRole('button', { name: 'Add Ticket to Queue' })).toHaveProperty('disabled', true);
  });

  it.each(['1', '001042'])('accepts numeric ID %s without converting it to a number', async (id) => {
    vi.mocked(directoryApi.lookupEmployee).mockResolvedValue({ ...profile, employee_id: id });
    openModal();
    await enterEmployee(id);
    enterDetails();
    submitForm();
    await screen.findByText(/created successfully/);
    expect(ticketsApi.quickIntake).toHaveBeenCalledWith({ employee_id: id, task_code: 'PRN-TS', description: saved.description, mode: 'REM' });
  });

  it('blocks repeated submission and uses the same saved data after refresh without adding chat', async () => {
    let resolveSubmit!: (value: StaffTicketResponse) => void;
    vi.mocked(ticketsApi.quickIntake).mockImplementationOnce(() => new Promise((resolve) => { resolveSubmit = resolve; }));
    openModal();
    await enterEmployee();
    enterDetails();
    const form = screen.getByRole('button', { name: 'Add Ticket to Queue' }).closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(ticketsApi.quickIntake).toHaveBeenCalledTimes(1);
    await act(async () => { resolveSubmit(saved); });
    await screen.findByText(/created successfully/);
    const created = useAppStore.getState().tickets[0];
    expect(created.messages).toEqual([]);
    expect(created.company).toBe(profile.company_name);
    expect(created.timeStarted).toBe('');
    expect(created.dateStarted).toBe('2026-10-24');
    await act(async () => { await useAppStore.getState().fetchQueueApi(); });
    expect(useAppStore.getState().tickets[0]).toMatchObject({
      description: created.description, mode: created.mode, company: created.company,
      location: created.location, department: created.department, dateStarted: created.dateStarted,
    });
  });
});
