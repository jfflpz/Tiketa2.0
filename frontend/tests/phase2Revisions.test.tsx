import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { CreateITStaffModal } from '../src/features/team/components/CreateITStaffModal';
import { MyProfileModal } from '../src/features/profile/MyProfileModal';
import { StaffLoginModal } from '../src/features/auth/StaffLoginModal';
import { JobLogDrawerTimeline } from '../src/components/tickets/drawer/JobLogDrawerTimeline';
import { authApi, ticketsApi } from '../src/api/client';
import { useAppStore } from '../src/store/useAppStore';

describe('Phase 2 Revisions (F-B2, F-B3, F-C1)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAppStore.setState({
      currentUser: {
        id: 'u-1',
        name: 'Maria Santos',
        email: 'maria@fivestar.com.ph',
        username: 'maria.santos',
        role: 'it',
        title: 'Senior IT Analyst',
        avatar: 'MS',
      },
      loginModalRole: 'it',
      isAuthenticating: false,
      authError: null,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('F-B2: displays server-generated username and collision explanation without role suffixes', async () => {
    const mockSubmit = vi.fn().mockResolvedValue({ username: 'maria.santos2', collision: true });

    render(
      <CreateITStaffModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={mockSubmit}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('e.g. Angelo P. Cruz'), { target: { value: 'Maria Santos' } });
    fireEvent.change(screen.getByPlaceholderText('a.cruz@fivestar.com.ph'), { target: { value: 'maria2@fivestar.com.ph' } });
    fireEvent.change(screen.getByPlaceholderText('Min. 12 characters'), { target: { value: 'StrongPassword123!' } });

    fireEvent.click(screen.getByRole('button', { name: /Submit Proposal for Approval/i }));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({ username: '' }));
      expect(screen.getByText('maria.santos2')).toBeTruthy();
      expect(screen.getByText(/unique numeric suffix/i)).toBeTruthy();
    });
  });

  it('F-B3: allows owner password change and invalidates session on server acceptance', async () => {
    const changeSpy = vi.spyOn(authApi, 'changePassword').mockResolvedValue({ ok: true });
    const logoutSpy = vi.fn().mockResolvedValue(undefined);
    useAppStore.setState({ logoutToKiosk: logoutSpy } as any);

    render(<MyProfileModal isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Change Password/i }));
    fireEvent.change(screen.getByPlaceholderText('Current password'), { target: { value: 'OldPass123456!' } });
    fireEvent.change(screen.getByPlaceholderText('New password (min. 12 characters)'), { target: { value: 'NewStrongPass123!' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'NewStrongPass123!' } });

    fireEvent.click(screen.getByRole('button', { name: /Update Password & Re-Login/i }));

    await waitFor(() => {
      expect(changeSpy).toHaveBeenCalledWith({
        current_password: 'OldPass123456!',
        new_password: 'NewStrongPass123!',
      });
      expect(logoutSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('F-B3: supports owner password recovery request and confirmation in StaffLoginModal', async () => {
    const reqSpy = vi.spyOn(authApi, 'requestPasswordRecovery').mockResolvedValue({ ok: true });
    const confSpy = vi.spyOn(authApi, 'confirmPasswordRecovery').mockResolvedValue({ ok: true });

    render(<StaffLoginModal />);

    fireEvent.click(screen.getByRole('button', { name: /Forgot password/i }));
    fireEvent.change(screen.getByPlaceholderText(/staff username or registered email/i), {
      target: { value: 'maria@fivestar.com.ph' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Send Recovery Code/i }));

    await waitFor(() => {
      expect(reqSpy).toHaveBeenCalledWith({ identifier: 'maria@fivestar.com.ph' });
    });

    fireEvent.change(screen.getByPlaceholderText(/recovery token/i), { target: { value: 'TOKEN-999' } });
    fireEvent.change(screen.getByPlaceholderText('New password (min. 12 characters)'), {
      target: { value: 'RecoveredPass123!' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), {
      target: { value: 'RecoveredPass123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Confirm Password Recovery/i }));

    await waitFor(() => {
      expect(confSpy).toHaveBeenCalledWith({
        token: 'TOKEN-999',
        new_password: 'RecoveredPass123!',
      });
    });
  });

  it('F-C1: renders read-only ticket activity timeline with pagination and error retry', async () => {
    const activitySpy = vi
      .spyOn(ticketsApi, 'getTicketActivity')
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        items: [
          {
            id: 'act-1',
            actor_name: 'Juan Dela Cruz',
            actor_role: 'it',
            action: 'Claimed ticket',
            created_at: '2026-11-14T08:00:00Z',
            changes: [{ field: 'status', from: 'OPEN', to: 'IN_PROG' }],
          },
        ],
        total: 2,
        page: 1,
        page_size: 20,
        has_more: true,
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: 'act-2',
            actor_name: 'Maria Santos',
            actor_role: 'supervisor',
            action: 'Updated priority',
            created_at: '2026-11-14T09:00:00Z',
          },
        ],
        total: 2,
        page: 2,
        page_size: 20,
        has_more: false,
      });

    render(<JobLogDrawerTimeline ticketId="t-100" />);

    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));

    await screen.findByText('Claimed ticket');
    expect(screen.getByText(/status: OPEN → IN_PROG/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Load older activity/i }));
    await screen.findByText('Updated priority');
    expect(activitySpy).toHaveBeenCalledTimes(3);
  });
});
