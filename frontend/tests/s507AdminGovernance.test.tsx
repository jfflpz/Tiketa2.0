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

  it('3. Removes Admin replacement-password inputs in favor of owner-controlled passwords (F-B3)', () => {
    render(
      <EditITStaffModal
        isOpen={true}
        onClose={vi.fn()}
        member={mockMember}
        onSubmit={vi.fn().mockResolvedValue(true)}
      />
    );

    expect(screen.queryByPlaceholderText('Enter new 12+ character password')).toBeNull();
    expect(screen.queryByPlaceholderText('Re-enter target new password')).toBeNull();
    expect(screen.getByText(/Owner-Controlled Passwords/i)).toBeTruthy();
  });

  it('4. Successfully submits username update with Admin authorization without password reset fields (F-B3)', async () => {
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
    fireEvent.change(usernameInput, { target: { value: 'jdelacruz_updated' } });

    fireEvent.click(screen.getByText('Save Account Changes'));
    const adminPassInput = screen.getByPlaceholderText('Enter your current admin password');
    fireEvent.change(adminPassInput, { target: { value: 'AdminMasterPass123!' } });
    fireEvent.click(screen.getByText('Authorize & Save'));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledTimes(1);
      expect(mockSubmit).toHaveBeenCalledWith(
        'user-uuid-101',
        expect.objectContaining({
          username: 'jdelacruz_updated',
          acting_admin_password: 'AdminMasterPass123!',
          name: 'Juan Dela Cruz',
          email: 'jdelacruz@fivestar.com.ph',
        })
      );
      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  it('6. Dynamically changes button to "Submit for Approval" when role is changed (B-03)', async () => {
    const mockSubmit = vi.fn().mockResolvedValue(true);

    render(
      <EditITStaffModal
        isOpen={true}
        onClose={vi.fn()}
        member={mockMember}
        onSubmit={mockSubmit}
      />
    );

    // Initial button text for direct changes
    expect(screen.getByText('Save Account Changes')).toBeTruthy();

    // Click 'Supervisor' tier
    const supervisorBtn = screen.getByText('Supervisor');
    fireEvent.click(supervisorBtn);

    // Button should now be 'Submit for Approval'
    expect(screen.getByText('Submit for Approval')).toBeTruthy();
    expect(screen.queryByText('Save Account Changes')).toBeNull();

    // Submitting triggers proposal
    const submitBtn = screen.getByText('Submit for Approval');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith(
        'user-uuid-101',
        expect.objectContaining({
          systemRole: 'supervisor',
        })
      );
    });
  });

  it('7. Dynamically changes button to "Submit for Approval" when Deactivated status is selected (B-03)', async () => {
    const mockSubmit = vi.fn().mockResolvedValue(true);

    render(
      <EditITStaffModal
        isOpen={true}
        onClose={vi.fn()}
        member={mockMember}
        onSubmit={mockSubmit}
      />
    );

    // Click 'Deactivated' status
    const deactBtn = screen.getByText('Deactivated');
    fireEvent.click(deactBtn);

    // Button should now be 'Submit for Approval'
    expect(screen.getByText('Submit for Approval')).toBeTruthy();

    const submitBtn = screen.getByText('Submit for Approval');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith(
        'user-uuid-101',
        expect.objectContaining({
          is_active: false,
          status: 'inactive',
        })
      );
    });
  });

  it('8. Requires Admin Password confirmation to save direct account changes in separate pop-up modal', async () => {
    const mockSubmit = vi.fn().mockResolvedValue(true);

    render(
      <EditITStaffModal
        isOpen={true}
        onClose={vi.fn()}
        member={mockMember}
        onSubmit={mockSubmit}
      />
    );

    // Click "Save Account Changes" to open separate modal
    const submitBtn = screen.getByText('Save Account Changes');
    fireEvent.click(submitBtn);

    expect(screen.getByText('Admin Authorization')).toBeTruthy();
    expect(screen.getByText(/Please enter your current Administrator password/i)).toBeTruthy();

    // Click "Authorize & Save" with empty password
    const authSaveBtn = screen.getByText('Authorize & Save');
    fireEvent.click(authSaveBtn);

    // Password input in the authorization popup
    const adminPassInputs = screen.getAllByPlaceholderText('Enter your current admin password');
    const authInput = adminPassInputs[adminPassInputs.length - 1];
    fireEvent.change(authInput, { target: { value: 'AdminSecret123!' } });
    fireEvent.click(authSaveBtn);

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledTimes(1);
      expect(mockSubmit).toHaveBeenCalledWith(
        'user-uuid-101',
        expect.objectContaining({
          acting_admin_password: 'AdminSecret123!',
        })
      );
    });
  });

  it('9. Successfully saves On-leave status and custom permissions via separate authorization modal', async () => {
    const mockSubmit = vi.fn().mockResolvedValue(true);

    render(
      <EditITStaffModal
        isOpen={true}
        onClose={vi.fn()}
        member={mockMember}
        onSubmit={mockSubmit}
      />
    );

    // Select On-leave
    const onLeaveBtn = screen.getByText('On-leave');
    fireEvent.click(onLeaveBtn);

    // Check custom permission (e.g. Create & Edit Saved Repair Guides)
    const notesPermCheckbox = screen.getByLabelText(/Create & Edit Saved Repair Guides/i);
    fireEvent.click(notesPermCheckbox);

    // Click Save Account Changes to trigger the Authorization modal popup
    const submitBtn = screen.getByText('Save Account Changes');
    fireEvent.click(submitBtn);

    // Enter admin password in the authorization popup modal
    const adminPassInputs = screen.getAllByPlaceholderText('Enter your current admin password');
    const authInput = adminPassInputs[adminPassInputs.length - 1];
    fireEvent.change(authInput, { target: { value: 'AdminSecret123!' } });

    const authSaveBtn = screen.getByText('Authorize & Save');
    fireEvent.click(authSaveBtn);

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith(
        'user-uuid-101',
        expect.objectContaining({
          status: 'on_leave',
          custom_permissions: expect.arrayContaining(['notes:edit']),
          acting_admin_password: 'AdminSecret123!',
        })
      );
    });
  });
});
