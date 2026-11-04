// @spec F-03: Two-Man Rule Account Proposals & Supervisor Approval Queue Test Suite
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PendingApprovalsQueue } from '../src/features/team/components/PendingApprovalsQueue';
import { CreateITStaffModal } from '../src/features/team/components/CreateITStaffModal';
import { accountRequestsApi } from '../src/api/client';
import { useAppStore } from '../src/store/useAppStore';
import type { AccountRequest } from '../src/types/team';

vi.mock('../src/api/client', async () => {
  const actual = await vi.importActual('../src/api/client');
  return {
    ...actual,
    accountRequestsApi: {
      list: vi.fn(),
      create: vi.fn(),
      approve: vi.fn(),
      reject: vi.fn(),
    },
  };
});

const MOCK_PROPOSALS: AccountRequest[] = [
  {
    id: 'req-1',
    username: 'r.cadiente',
    email: 'r.cadiente@fivestar.com.ph',
    full_name: 'Rafael Cadiente',
    role: 'it',
    department: 'POS & Depot Hardware Repair',
    location_id: 'loc-psy',
    location_name: 'Pasay Hub',
    status: 'pending',
    requested_by_id: 'admin-1',
    requester_name: 'Jefferson Lopez',
    created_at: '2026-10-29T10:00:00Z',
  },
  {
    id: 'req-2',
    username: 'm.intern',
    email: 'm.intern@fivestar.com.ph',
    full_name: 'Mark Intern',
    role: 'intern',
    department: 'Terminal Operations',
    location_id: 'loc-avn',
    location_name: 'Avenida Hub',
    status: 'pending',
    requested_by_id: 'admin-1',
    requester_name: 'Jefferson Lopez',
    created_at: '2026-10-29T11:00:00Z',
  },
];

describe('F-03 Two-Man Rule & Supervisor Approval Queue Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(),
      },
    });
    useAppStore.setState({
      currentUser: {
        id: 'sup-1',
        name: 'Supervisor User',
        username: 'supervisor',
        email: 'supervisor@example.com',
        role: 'supervisor',
        title: 'Operations Supervisor',
        avatar: '',
      },
      fetchITMembers: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('1. PendingApprovalsQueue renders pending proposals and reviewer details', async () => {
    vi.mocked(accountRequestsApi.list).mockResolvedValue(MOCK_PROPOSALS);

    render(<PendingApprovalsQueue />);

    await waitFor(() => {
      expect(screen.getByText('Rafael Cadiente')).toBeTruthy();
      expect(screen.getByText('@r.cadiente')).toBeTruthy();
      expect(screen.getByText('Mark Intern')).toBeTruthy();
      expect(screen.getByText('@m.intern')).toBeTruthy();
    });

    expect(screen.getByText(/Pending Supervisor Decisions \(2\)/i)).toBeTruthy();
  });

  it('2. Supervisor approves proposal: triggers approval API and displays one-time credentials', async () => {
    vi.mocked(accountRequestsApi.list).mockResolvedValue(MOCK_PROPOSALS);
    vi.mocked(accountRequestsApi.approve).mockResolvedValue({
      user: {
        id: 'u-new',
        username: 'r.cadiente',
        email: 'r.cadiente@fivestar.com.ph',
        full_name: 'Rafael Cadiente',
        role: 'it',
        is_active: true,
      },
      temporary_password: 'Secr3t-Passw0rd-2026!',
    });

    render(<PendingApprovalsQueue />);

    await waitFor(() => {
      expect(screen.getAllByText('Rafael Cadiente')[0]).toBeTruthy();
    });

    // Click "Approve" button
    const approveButtons = screen.getAllByRole('button', { name: /approve/i });
    fireEvent.click(approveButtons[0]);

    await waitFor(() => {
      expect(accountRequestsApi.approve).toHaveBeenCalledWith('req-1');
      // Secure One-Time Credential Reveal Modal should be shown
      expect(screen.getByText(/Account Activated!/i)).toBeTruthy();
      expect(screen.getByText('Secr3t-Passw0rd-2026!')).toBeTruthy();
    });
  });

  it('3. Supervisor rejects proposal: prompts for mandatory reason and updates status', async () => {
    vi.mocked(accountRequestsApi.list).mockResolvedValue(MOCK_PROPOSALS);
    vi.mocked(accountRequestsApi.reject).mockResolvedValue({
      ...MOCK_PROPOSALS[0],
      status: 'rejected',
      rejection_reason: 'Duplicate role request for this hub',
    });

    render(<PendingApprovalsQueue />);

    await waitFor(() => {
      expect(screen.getAllByText('Rafael Cadiente')[0]).toBeTruthy();
    });

    // Click "Reject" on the first proposal
    const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
    fireEvent.click(rejectButtons[0]);

    // Rejection reason modal appears
    await waitFor(() => {
      expect(screen.getByText(/Reject Account Proposal/i)).toBeTruthy();
    });

    // Attempting to submit empty reason does not call API
    const confirmBtn = screen.getByRole('button', { name: /confirm rejection/i });
    fireEvent.click(confirmBtn);
    expect(accountRequestsApi.reject).not.toHaveBeenCalled();

    // Fill in required reason
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Duplicate role request for this hub' } });

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(accountRequestsApi.reject).toHaveBeenCalledWith(
        'req-1',
        'Duplicate role request for this hub'
      );
    });
  });

  it('4. CreateITStaffModal retains form inputs on submission error or conflict', async () => {
    const handleSubmit = vi.fn().mockImplementation(async () => {
      const err: any = new Error('A staff member with this username already exists.');
      err.response = { status: 409 };
      throw err;
    });

    render(
      <CreateITStaffModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={handleSubmit}
      />
    );

    // Fill form
    fireEvent.change(screen.getByPlaceholderText('e.g. j.doe'), { target: { value: 'r.cadiente' } });
    fireEvent.change(screen.getByPlaceholderText('Min. 12 characters'), { target: { value: 'ValidPassword123!' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Angelo P. Cruz'), { target: { value: 'Rafael Cadiente' } });
    fireEvent.change(screen.getByPlaceholderText('a.cruz@fivestar.com.ph'), { target: { value: 'r.cadiente@fivestar.com.ph' } });

    // Submit proposal
    fireEvent.click(screen.getByRole('button', { name: /submit proposal for approval/i }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalled();
      // Form fields are preserved
      expect((screen.getByPlaceholderText('e.g. j.doe') as HTMLInputElement).value).toBe('r.cadiente');
      expect((screen.getByPlaceholderText('e.g. Angelo P. Cruz') as HTMLInputElement).value).toBe('Rafael Cadiente');
    });
  });
});
