import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { TerminalHubsView } from '../src/features/terminals/TerminalHubsView';
import { TerminalAdminConfigModal } from '../src/features/terminals/components/TerminalAdminConfigModal';
import { KioskIntakeForm } from '../src/features/kiosk/components/KioskIntakeForm';
import { useAppStore } from '../src/store/useAppStore';
import { adminApi, locationApi, type DictionariesResponse } from '../src/api/client';

const mockDictionaries: DictionariesResponse = {
  companies: [{ id: 'comp-1', code: 'P5STAR', name: 'Pangasinan Five Star Bus Co.' }],
  locations: [
    { id: 'loc-1', code: 'MNL-CUBAO', name: 'Cubao Central Terminal', address: 'EDSA, QC', is_active: true },
    { id: 'loc-2', code: 'DAG-MAIN', name: 'Dagupan Main Terminal', address: 'Perez Blvd', is_active: false },
  ],
  departments: [
    { id: 'dept-1', code: 'OPS', name: 'Operations', is_active: true },
    { id: 'dept-2', code: 'MAINT', name: 'Fleet Maintenance', is_active: true },
  ],
  tasks: [{ id: 'task-1', code: 'PRN-TS', name: 'Printer Troubleshooting' }],
  location_departments: [{ location_id: 'loc-1', department_id: 'dept-1' }],
};

describe('F-04 Terminal Configuration, Station Confirmation & Administration Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(adminApi, 'getDictionaries').mockResolvedValue(mockDictionaries);
    useAppStore.setState({
      currentUser: {
        id: 'admin-uuid-1',
        name: 'Jefferson Lopez',
        username: 'admin.jfflpz',
        email: 'jefferson@fivestarbus.com',
        role: 'admin',
        title: 'System Administrator',
        avatar: '',
      },
      serverDictionaries: mockDictionaries,
      tickets: [],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('1. TerminalHubsView renders Station Administration button for admin role and hides for it/intern', () => {
    vi.spyOn(locationApi, 'getHubSummaries').mockResolvedValue([]);
    const { rerender } = render(<TerminalHubsView />);

    expect(screen.getByRole('button', { name: /station administration/i })).toBeDefined();

    // Switch to IT role
    useAppStore.setState({
      currentUser: {
        id: 'it-uuid-1',
        name: 'Rafael Cadiente',
        username: 'tech.rafael',
        email: 'rafael@fivestarbus.com',
        role: 'it',
        title: 'IT Support Technician',
        avatar: '',
      },
    });
    rerender(<TerminalHubsView />);
    expect(screen.queryByRole('button', { name: /station administration/i })).toBeNull();
  });

  it('2. TerminalAdminConfigModal displays terminal hubs and allows creating a new terminal station', async () => {
    const mockRefreshHubs = vi.fn().mockResolvedValue(undefined);
    const createLocationSpy = vi.spyOn(adminApi, 'createLocation').mockResolvedValue({
      id: 'loc-3',
      code: 'PASAY-INT',
      name: 'Pasay Intermodal Station',
      is_active: true,
    });

    render(
      <TerminalAdminConfigModal
        isOpen={true}
        onClose={vi.fn()}
        onRefreshHubs={mockRefreshHubs}
      />
    );

    expect(screen.getByText(/Terminal Hub & Station Administration/i)).toBeDefined();
    expect(screen.getByText('Cubao Central Terminal')).toBeDefined();

    // Fill form to create new station
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. MNL-CUBAO/i), {
      target: { value: 'PASAY-INT' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Cubao Central Terminal/i), {
      target: { value: 'Pasay Intermodal Station' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. EDSA, Quezon City/i), {
      target: { value: 'Taft Avenue, Pasay City' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create station/i }));

    await waitFor(() => {
      expect(createLocationSpy).toHaveBeenCalledWith({
        code: 'PASAY-INT',
        name: 'Pasay Intermodal Station',
        address: 'Taft Avenue, Pasay City',
      });
      expect(mockRefreshHubs).toHaveBeenCalled();
    });
  });

  it('3. TerminalAdminConfigModal handles deactivation confirmation and handles 409 conflict gracefully', async () => {
    const mockRefreshHubs = vi.fn().mockResolvedValue(undefined);
    const updateLocationSpy = vi.spyOn(adminApi, 'updateLocation').mockRejectedValue({
      response: {
        status: 409,
        data: {
          detail: "Conflict (409): Terminal Hub 'Cubao Central Terminal' is currently in use with active tickets or assigned staff.",
        },
      },
    });

    render(
      <TerminalAdminConfigModal
        isOpen={true}
        onClose={vi.fn()}
        onRefreshHubs={mockRefreshHubs}
      />
    );

    // Click trash button on active Cubao terminal
    const deactivateBtn = screen.getAllByTitle('Deactivate station')[0];
    fireEvent.click(deactivateBtn);

    // Verify confirmation modal opens
    expect(screen.getByText(/Confirm Terminal Hub Deactivation/i)).toBeDefined();
    expect(
      screen.getByText(/Are you sure you want to deactivate/i)
    ).toBeDefined();

    // Click confirm deactivation
    const confirmBtn = screen.getByRole('button', { name: /confirm deactivation/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(updateLocationSpy).toHaveBeenCalledWith('loc-1', { is_active: false });
      // Verify conflict message is rendered clearly
      expect(
        screen.getByText(/Conflict \(409\): Terminal Hub 'Cubao Central Terminal' is currently in use/i)
      ).toBeDefined();
    });
  });

  it('4. TerminalAdminConfigModal supports Department creation and Hub-Dept Membership assignment', async () => {
    const mockRefreshHubs = vi.fn().mockResolvedValue(undefined);
    const createDeptSpy = vi.spyOn(adminApi, 'createDepartment').mockResolvedValue({
      id: 'dept-3',
      code: 'LOG',
      name: 'Logistics',
      is_active: true,
    });
    const createMembershipSpy = vi
      .spyOn(adminApi, 'createLocationDepartment')
      .mockResolvedValue({ location_id: 'loc-1', department_id: 'dept-2' });

    render(
      <TerminalAdminConfigModal
        isOpen={true}
        onClose={vi.fn()}
        onRefreshHubs={mockRefreshHubs}
      />
    );

    // Switch to Departments tab
    fireEvent.click(screen.getByRole('button', { name: /departments/i }));
    expect(screen.getByText('Operations')).toBeDefined();

    // Create department using exact placeholder match
    fireEvent.change(screen.getByPlaceholderText(/^e\.g\. LOG$/i), {
      target: { value: 'LOG' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Logistics & Cargo/i), {
      target: { value: 'Logistics' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create department/i }));

    await waitFor(() => {
      expect(createDeptSpy).toHaveBeenCalledWith({
        code: 'LOG',
        name: 'Logistics',
      });
    });

    // Switch to Memberships tab
    fireEvent.click(screen.getByRole('button', { name: /hub-dept memberships/i }));
    expect(screen.getByText(/Assign Operating Department to Terminal Hub/i)).toBeDefined();

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'loc-1' } });
    fireEvent.change(selects[1], { target: { value: 'dept-2' } });

    fireEvent.click(screen.getByRole('button', { name: /assign membership/i }));

    await waitFor(() => {
      expect(createMembershipSpy).toHaveBeenCalledWith({
        location_id: 'loc-1',
        department_id: 'dept-2',
      });
    });
  });

  it('5. KioskIntakeForm renders confirmed official station prominently and binds to matched record', () => {
    render(
      <KioskIntakeForm
        employeeId="1042"
        onEmployeeIdChange={vi.fn()}
        registeredEmail="emp@fivestarbus.com"
        onRegisteredEmailChange={vi.fn()}
        isMatching={false}
        isMatched={true}
        matchError={null}
        cooldownSeconds={0}
        onContinueMatching={vi.fn()}
        employeeProfile={{
          fullName: 'Juan Dela Cruz',
          company: 'Pangasinan Five Star Bus Co.',
          location: 'Cubao Central Terminal',
          department: 'Operations',
        }}
        locationState={{
          status: 'idle',
          observationId: null,
          accuracy: null,
          capturedAt: null,
          message: null,
        }}
        onCaptureLocation={vi.fn()}
        activeHubName="Pasay Station"
        selectedTask="PRN-TS"
        onSelectTask={vi.fn()}
        description="Printer paper jam"
        onDescriptionChange={vi.fn()}
        isSubmitting={false}
        onSubmit={vi.fn()}
      />
    );

    // Official station is shown in header and confirmed station banner
    expect(screen.getAllByText(/Official Station/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Confirmed Official Station:/i)).toBeDefined();
    expect(screen.getAllByText('Cubao Central Terminal').length).toBeGreaterThanOrEqual(1);
  });
});
