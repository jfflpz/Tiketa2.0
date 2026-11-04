import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError } from 'axios';
import { EmployeeTicketScreen } from '../src/features/kiosk/EmployeeTicketScreen';
import { ToastContainer } from '../src/components/common/ToastContainer';
import { useAppStore } from '../src/store/useAppStore';
import { directoryApi, ticketsApi, type EmployeeMatchOut, type PublicTicketResponse } from '../src/api/client';

const mockMatchSuccess: EmployeeMatchOut = {
  status: 'matched',
  match_token: 'valid-match-jwt-token',
  employee: {
    employee_id: '001042',
    full_name: 'Maria Santos',
    company_id: 'comp-uuid',
    company_name: 'Pangasinan Five Star Bus Co.',
    location_id: 'loc-uuid',
    location_name: 'Pasay Terminal',
    department_id: 'dept-uuid',
    department_name: 'Operations',
  },
};

const mockSubmitSuccess: PublicTicketResponse = {
  ticket_code: 'T-2610-0042',
  status: 'OPEN',
  created_at: '2026-10-24T08:00:00Z',
};

const apiError = (status: number, detail: unknown, headers?: Record<string, string>) =>
  Object.assign(new AxiosError('Request failed'), {
    response: { status, data: { detail }, headers: headers || {} },
  });

const renderKiosk = () =>
  render(
    <>
      <EmployeeTicketScreen />
      <ToastContainer />
    </>
  );

beforeEach(() => {
  sessionStorage.clear();
  useAppStore.setState({
    currentUser: null,
    verifyTicketCode: null,
    isHydratingAuth: false,
    tickets: [],
    toasts: [],
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('kiosk employee record matching and intake', () => {
  it('preserves leading zeros in employee ID and does not query on keystroke', async () => {
    const matchSpy = vi.spyOn(directoryApi, 'matchEmployee').mockResolvedValue(mockMatchSuccess);
    renderKiosk();

    const idInput = screen.getByPlaceholderText('e.g. 1042');
    const emailInput = screen.getByPlaceholderText('e.g. employee@fivestarbus.com');

    // Type leading zeros and digits
    fireEvent.change(idInput, { target: { value: '001042' } });
    expect(idInput).toHaveProperty('value', '001042');

    // Type non-digit characters - should be stripped
    fireEvent.change(idInput, { target: { value: 'FS-001042' } });
    expect(idInput).toHaveProperty('value', '001042');

    fireEvent.change(emailInput, { target: { value: 'maria.santos@customdomain.ph' } });
    expect(emailInput).toHaveProperty('value', 'maria.santos@customdomain.ph');

    // No matching API call should have happened on keystrokes
    expect(matchSpy).not.toHaveBeenCalled();

    // Issue choices and submit button should be locked
    const submitBtn = screen.getByRole('button', { name: /Match Employee Details to Submit/i });
    expect(submitBtn).toHaveProperty('disabled', true);
  });

  it('displays generic mismatch error on 404 and retains input values', async () => {
    vi.spyOn(directoryApi, 'matchEmployee').mockRejectedValue(
      apiError(404, 'Employee ID and email do not match an active employee record.')
    );
    renderKiosk();

    const idInput = screen.getByPlaceholderText('e.g. 1042');
    const emailInput = screen.getByPlaceholderText('e.g. employee@fivestarbus.com');
    const continueBtn = screen.getByRole('button', { name: /Continue/i });

    fireEvent.change(idInput, { target: { value: '99999' } });
    fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });

    fireEvent.click(continueBtn);

    await screen.findByText('Employee ID and email do not match an active employee record.');

    // Inputs must be retained
    expect(idInput).toHaveProperty('value', '99999');
    expect(emailInput).toHaveProperty('value', 'wrong@example.com');
  });

  it('handles 429 cooldown with countdown display and automatic re-enabling', async () => {
    vi.useFakeTimers();
    vi.spyOn(directoryApi, 'matchEmployee').mockRejectedValue(
      apiError(429, { detail: 'Too many failed attempts. Cooldown active.', retry_after: 102 }, { 'retry-after': '102' })
    );

    renderKiosk();

    const idInput = screen.getByPlaceholderText('e.g. 1042');
    const emailInput = screen.getByPlaceholderText('e.g. employee@fivestarbus.com');
    const continueBtn = screen.getByRole('button', { name: /Continue/i });

    fireEvent.change(idInput, { target: { value: '1042' } });
    fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });

    fireEvent.click(continueBtn);
    await act(async () => {
      await Promise.resolve();
    });

    // Should display cooldown time: 102s = "1:42"
    expect(screen.getByText(/Please try again in 1:42/i)).toBeTruthy();

    // Advance 2 seconds -> "1:40"
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText(/Please try again in 1:40/i)).toBeTruthy();

    // Advance 100 seconds -> cooldown expires
    act(() => {
      vi.advanceTimersByTime(100000);
    });

    expect(screen.queryByText(/Please try again in/i)).toBeNull();
    expect(screen.getByRole('button', { name: /Continue/i })).toBeTruthy();
  });

  it('matches employee record, unlocks form, and submits ticket with match_token', async () => {
    vi.spyOn(directoryApi, 'matchEmployee').mockResolvedValue(mockMatchSuccess);
    const submitSpy = vi.spyOn(ticketsApi, 'submitPublicTicket').mockResolvedValue(mockSubmitSuccess);

    renderKiosk();

    const idInput = screen.getByPlaceholderText('e.g. 1042');
    const emailInput = screen.getByPlaceholderText('e.g. employee@fivestarbus.com');
    const continueBtn = screen.getByRole('button', { name: /Continue/i });

    fireEvent.change(idInput, { target: { value: '001042' } });
    fireEvent.change(emailInput, { target: { value: 'maria.santos@fivestarbus.com' } });

    fireEvent.click(continueBtn);

    // Displays success message
    await screen.findByText('Employee details matched.');
    expect(screen.getByText('Maria Santos')).toBeTruthy();
    expect(screen.getByText('Pangasinan Five Star Bus Co.')).toBeTruthy();
    expect(screen.getByText('Pasay Terminal')).toBeTruthy();

    // Submit button should now be unlocked
    const submitBtn = screen.getByRole('button', { name: /Submit Help Request/i });
    expect(submitBtn).toHaveProperty('disabled', false);

    // Select issue category
    const wifiOption = screen.getByRole('button', { name: /No Internet \/ Wi-Fi/i });
    fireEvent.click(wifiOption);

    // Add optional description
    const descInput = screen.getByPlaceholderText(/Briefly describe what happened/i);
    fireEvent.change(descInput, { target: { value: 'Booth 3 POS offline' } });

    // Submit ticket
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(submitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          employee_id: '001042',
          task_code: 'NET-CFG',
          description: 'Booth 3 POS offline',
          match_token: 'valid-match-jwt-token',
        }),
        expect.any(String)
      );
    });

    // Receipt should display ticket code
    await screen.findByText('T-2610-0042');
  });

  it('allows reporting even if optional location is denied or unavailable', async () => {
    vi.spyOn(directoryApi, 'matchEmployee').mockResolvedValue(mockMatchSuccess);
    const submitSpy = vi.spyOn(ticketsApi, 'submitPublicTicket').mockResolvedValue(mockSubmitSuccess);

    // Mock geolocation permission denied
    const mockGeolocation = {
      getCurrentPosition: vi.fn((_success, error) => {
        error({ code: 1, PERMISSION_DENIED: 1, message: 'User denied geolocation' });
      }),
    };
    vi.stubGlobal('navigator', { geolocation: mockGeolocation });

    renderKiosk();

    fireEvent.change(screen.getByPlaceholderText('e.g. 1042'), { target: { value: '001042' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. employee@fivestarbus.com'), {
      target: { value: 'maria.santos@fivestarbus.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    await screen.findByText('Employee details matched.');

    // Click optional capture location
    const captureBtn = screen.getByRole('button', { name: /Capture Location/i });
    fireEvent.click(captureBtn);

    await screen.findByText('Location permission denied. Reporting remains fully available.');

    // Form can still be submitted normally
    const submitBtn = screen.getByRole('button', { name: /Submit Help Request/i });
    expect(submitBtn).toHaveProperty('disabled', false);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(submitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          employee_id: '001042',
          match_token: 'valid-match-jwt-token',
          observation_id: null,
        }),
        expect.any(String)
      );
    });
  });
});
