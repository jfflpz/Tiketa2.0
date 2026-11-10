// @vitest-environment jsdom
// @spec S5-12 & S5-13: Admin Governance Security Test Suite (Password Reset & Username Cooldown)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { EditITStaffModal } from '../src/features/team/components/EditITStaffModal';
import type { TeamMember } from '../src/types/team';

describe('F-07: Admin Governance Security (S5-12 & S5-13)', () => {
  const mockMember: TeamMember = {
    id: 'user-uuid-101',
    name: 'Juan Dela Cruz',
    username: 'jdelacruz_it',
    email: 'jdelacruz@fivestar.com.ph',
    role: 'Field Technician',
    systemRole: 'it',
    avatar: 'https://avatar.test/jdc.jpg',
    department: 'Terminal Operations & PMS',
    status: 'active',
    primaryLocation: 'Pasay Terminal Hub (PSY)',
    ticketsClosed: 14,
    activeTickets: 2,
    flameScore: 88,
    is_active: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('1. Renders editable username input when no cooldown is active (S5-13)', () => {
    render(
      <EditITStaffModal
        isOpen={true}
        onClose={vi.fn()}
        member={mockMember}
        onSubmit={vi.fn().mockResolvedValue(true)}
      />
    );

    const usernameInput = screen.getByPlaceholderText('e.g. jdoe_it') as HTMLInputElement;
    expect(usernameInput).toBeTruthy();
    expect(usernameInput.disabled).toBe(false);
    expect(usernameInput.value).toBe('jdelacruz_it');
    expect(screen.getByText(/Immediate update eligible/i)).toBeTruthy();
  });

  it('2. Disables username input and displays cooldown banner when inside 168-hour cooldown (S5-13)', () => {
    const recentDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago
    const cooldownMember: TeamMember = {
      ...mockMember,
      last_username_change_at: recentDate,
    };

    render(
      <EditITStaffModal
        isOpen={true}
        onClose={vi.fn()}
        member={cooldownMember}
        onSubmit={vi.fn().mockResolvedValue(true)}
      />
    );

    const usernameInput = screen.getByPlaceholderText('e.g. jdoe_it') as HTMLInputElement;
    expect(usernameInput).toBeTruthy();
    expect(usernameInput.disabled).toBe(true);
    expect(screen.getByText(/Cooldown active until/i)).toBeTruthy();
    expect(screen.getByText(/168 hours/i)).toBeTruthy();
  });

  it('3. Rejects password reset if acting Admin password is omitted (S5-12)', async () => {
    const mockSubmit = vi.fn().mockResolvedValue(true);

    render(
      <EditITStaffModal
        isOpen={true}
        onClose={vi.fn()}
        member={mockMember}
        onSubmit={mockSubmit}
      />
    );

    // Enter new password without entering acting Admin password
    const newPassInput = screen.getByPlaceholderText('Enter new 12+ character password');
    const confirmPassInput = screen.getByPlaceholderText('Re-enter target new password');

    fireEvent.change(newPassInput, { target: { value: 'ValidP@ssword123!' } });
    fireEvent.change(confirmPassInput, { target: { value: 'ValidP@ssword123!' } });

    const submitBtn = screen.getByText('Save Account Changes');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Your current Admin password is required to reset target credentials/i)).toBeTruthy();
      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });

  it('4. Rejects password reset if target new password and confirmation mismatch (S5-12)', async () => {
    const mockSubmit = vi.fn().mockResolvedValue(true);

    render(
      <EditITStaffModal
        isOpen={true}
        onClose={vi.fn()}
        member={mockMember}
        onSubmit={mockSubmit}
      />
    );

    const actingPassInput = screen.getByPlaceholderText('Enter your current admin password');
    const newPassInput = screen.getByPlaceholderText('Enter new 12+ character password');
    const confirmPassInput = screen.getByPlaceholderText('Re-enter target new password');

    fireEvent.change(actingPassInput, { target: { value: 'AdminMasterPass123!' } });
    fireEvent.change(newPassInput, { target: { value: 'ValidP@ssword123!' } });
    fireEvent.change(confirmPassInput, { target: { value: 'MismatchP@ssword999!' } });

    const submitBtn = screen.getByText('Save Account Changes');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Target new password and confirmation do not match/i)).toBeTruthy();
      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });

  it('5. Successfully submits username update and verified administrative password reset (S5-12 & S5-13)', async () => {
    const mockSubmit = vi.fn().mockResolvedValue(true);
    const mockClose = vi.fn();

    render(
      <EditITStaffModal
        isOpen={true}
        onClose={mockClose}
        member={mockMember}
        onSubmit={mockSubmit}
      />
    );

    const usernameInput = screen.getByPlaceholderText('e.g. jdoe_it');
    const actingPassInput = screen.getByPlaceholderText('Enter your current admin password');
    const newPassInput = screen.getByPlaceholderText('Enter new 12+ character password');
    const confirmPassInput = screen.getByPlaceholderText('Re-enter target new password');

    fireEvent.change(usernameInput, { target: { value: 'jdelacruz_updated' } });
    fireEvent.change(actingPassInput, { target: { value: 'AdminMasterPass123!' } });
    fireEvent.change(newPassInput, { target: { value: 'SecureNewPassword2026!' } });
    fireEvent.change(confirmPassInput, { target: { value: 'SecureNewPassword2026!' } });

    const submitBtn = screen.getByText('Save Account Changes');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledTimes(1);
      expect(mockSubmit).toHaveBeenCalledWith(
        'user-uuid-101',
        expect.objectContaining({
          username: 'jdelacruz_updated',
          password: 'SecureNewPassword2026!',
          acting_admin_password: 'AdminMasterPass123!',
          name: 'Juan Dela Cruz',
          email: 'jdelacruz@fivestar.com.ph',
        })
      );
      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });
});
