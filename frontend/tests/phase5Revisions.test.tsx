import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { useAppStore } from '../src/store/useAppStore';
import { assetsApi, categoryCatalogApi } from '../src/api/client';
import { JobLogDrawerRecordForm } from '../src/components/tickets/drawer/JobLogDrawerRecordForm';
import { AssetServiceMetricsCard } from '../src/features/reports/components/AssetServiceMetricsCard';
import { CategoryCatalogPanel } from '../src/features/team/components/CategoryCatalogPanel';
import { KioskIntakeForm } from '../src/features/kiosk/components/KioskIntakeForm';
import type { Ticket } from '../src/types/ticket';

describe('Phase 5 Revisions (F-F1, F-F2, F-G1, F-G2)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    if (typeof globalThis.ResizeObserver === 'undefined') {
      globalThis.ResizeObserver = class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
    }
    useAppStore.setState({
      currentUser: {
        id: 'sup-1',
        name: 'Supervisor',
        email: 'sup@omnitick.local',
        role: 'supervisor',
        location: 'Pasay Terminal',
        locationCode: 'PSY',
        custom_permissions: [],
      } as any,
      tickets: [],
      addToast: vi.fn(),
    } as any);
  });

  afterEach(() => {
    cleanup();
  });

  it('F-F1: keeps same-model assets distinct, leaves unknown serials unknown, and retains selection on failed save', async () => {
    vi.spyOn(assetsApi, 'list').mockResolvedValue([
      {
        id: 'asset-1',
        asset_tag: 'AST-001',
        serial_number: 'SN-111',
        model_name: 'Epson L3210',
        location_name: 'Pasay Terminal',
        status: 'ACTIVE',
      },
      {
        id: 'asset-2',
        asset_tag: 'AST-002',
        serial_number: null,
        model_name: 'Epson L3210',
        location_name: 'Cubao Terminal',
        status: 'ACTIVE',
      },
    ]);
    vi.spyOn(assetsApi, 'attachToTicket').mockRejectedValue(new Error('Network timeout'));

    const ticket: Ticket = {
      id: 't-f1',
      ticketCode: 'T-260510',
      company: 'Five Star',
      companyCode: 'FS',
      mode: 'SITE',
      department: 'Operations',
      departmentCode: 'OPS',
      requestor: 'Juan Dela Cruz',
      task: 'Printer Troubleshoot',
      taskCode: 'PRN-TS',
      description: 'Paper jam',
      month: 'November 2026',
      dateStarted: '2026-11-14',
      timeStarted: '09:00:00',
      status: 'PROG',
      location: 'Pasay Terminal',
      locationCode: 'PSY',
      workedById: 'sup-1',
      workedBy: 'Supervisor',
      priority: 'High',
      createdAt: '2026-11-14T09:00:00Z',
    };

    render(
      <JobLogDrawerRecordForm
        ticket={ticket}
        isAdmin={true}
        itTeamMembers={[]}
        onAssignTicket={vi.fn()}
      />
    );

    const select = (await screen.findByLabelText(/Select saved asset/i)) as HTMLSelectElement;
    await waitFor(() => {
      expect(select.options.length).toBe(3);
    });

    // Same-model devices stay distinct & missing serial stays Unknown
    expect(select.options[1].textContent).toContain('AST-001');
    expect(select.options[1].textContent).toContain('SN-111');
    expect(select.options[2].textContent).toContain('AST-002');
    expect(select.options[2].textContent).toContain('S/N: Unknown');

    fireEvent.change(select, { target: { value: 'asset-2' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Asset/i }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Network timeout');
    // Failed save retains user's selection
    expect(select.value).toBe('asset-2');
    // Historical ticket without risk shows Unknown Risk honestly
    expect(screen.getByTestId('ticket-risk-badge').textContent).toContain('Unknown Risk');
  });

  it('F-F2: displays units, data-limitation disclosures, accessible table alternative, and never invents age', () => {
    render(
      <AssetServiceMetricsCard
        metrics={[
          {
            asset_id: 'a-1',
            asset_tag: 'AST-100',
            serial_number: null,
            model_name: 'HP LaserJet',
            acquisition_date: null,
            age_months: null,
            service_incident_count: 4,
            repair_cost_total: 2500,
            acquisition_cost: null,
          },
        ]}
        isLoading={false}
        error={null}
        activePeriodText="Nov 2026"
      />
    );

    const card = screen.getByTestId('asset-service-metrics-card');
    expect(card.textContent).toContain('Incident counts do not represent remaining asset life');
    expect(card.textContent).toContain('omitted from age bars');

    fireEvent.click(screen.getByRole('button', { name: /Accessible Table/i }));
    const table = screen.getByRole('table', { name: /Asset service metrics accessible table/i });
    expect(table.textContent).toContain('AST-100');
    expect(table.textContent).toContain('Unknown');
    expect(table.textContent).toContain('₱2,500');
  });

  it('F-G1: loads category catalog, distinguishes inherited vs explicit risk, and reloads after saving', async () => {
    const getCatalogMock = vi
      .spyOn(categoryCatalogApi, 'getCatalog')
      .mockResolvedValue([
        {
          code: 'PRN-TS',
          name: 'Printer Troubleshoot',
          default_risk: 'HIGH',
          is_active: true,
          subcategories: [
            {
              code: 'PRN-TS-JAM',
              name: 'Paper Jam',
              default_risk: null,
              effective_risk: 'HIGH',
              is_active: true,
            },
            {
              code: 'PRN-TS-BRD',
              name: 'Mainboard Fault',
              default_risk: 'CRITICAL',
              effective_risk: 'CRITICAL',
              is_active: true,
            },
          ],
        },
      ]);
    const updateMock = vi.spyOn(categoryCatalogApi, 'updateCategory').mockResolvedValue({
      code: 'PRN-TS',
      name: 'Printer Troubleshoot',
      default_risk: 'CRITICAL',
      is_active: true,
      subcategories: [],
    });

    render(<CategoryCatalogPanel />);

    expect(await screen.findByText(/HIGH \(Inherited\)/i)).toBeTruthy();
    expect(screen.getByText(/CRITICAL \(Explicit\)/i)).toBeTruthy();

    const riskSelect = screen.getByLabelText(/Default risk for PRN-TS/i) as HTMLSelectElement;
    fireEvent.change(riskSelect, { target: { value: 'CRITICAL' } });

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith('PRN-TS', { default_risk: 'CRITICAL' });
      expect(getCatalogMock).toHaveBeenCalledTimes(2);
    });
  });

  it('F-G2: clears stale subcategory when parent changes and keeps parent-only fallback', async () => {
    vi.spyOn(categoryCatalogApi, 'getCatalog').mockResolvedValue([
      {
        code: 'PRN-TS',
        name: 'Printer Troubleshoot',
        default_risk: 'HIGH',
        is_active: true,
        subcategories: [
          {
            code: 'PRN-TS-JAM',
            name: 'Paper Jam',
            default_risk: null,
            effective_risk: 'HIGH',
            is_active: true,
          },
        ],
      },
      {
        code: 'NET-CFG',
        name: 'Network Configuration',
        default_risk: 'HIGH',
        is_active: true,
        subcategories: [],
      },
    ]);

    const Wrapper: React.FC = () => {
      const [task, setTask] = React.useState<'PRN-TS' | 'NET-CFG'>('PRN-TS');
      const [sub, setSub] = React.useState('PRN-TS-JAM');
      return (
        <KioskIntakeForm
          employeeId="EMP-01"
          onEmployeeIdChange={vi.fn()}
          registeredEmail="emp@omnitick.local"
          onRegisteredEmailChange={vi.fn()}
          isMatching={false}
          isMatched={true}
          matchError={null}
          cooldownSeconds={0}
          onContinueMatching={vi.fn()}
          employeeProfile={{
            fullName: 'Juan',
            company: 'Five Star',
            location: 'Pasay',
            department: 'Ops',
          }}
          locationState={{
            status: 'idle',
            observationId: null,
            accuracy: null,
            capturedAt: null,
            message: null,
          }}
          onCaptureLocation={vi.fn()}
          activeHubName="Pasay"
          selectedTask={task}
          onSelectTask={(next) => {
            setTask(next as 'PRN-TS' | 'NET-CFG');
            setSub('');
          }}
          selectedSubcategory={sub}
          onSelectSubcategory={setSub}
          description="Printer paper jam"
          onDescriptionChange={vi.fn()}
          isSubmitting={false}
          onSubmit={vi.fn()}
        />
      );
    };

    render(<Wrapper />);

    const subSelect = (await screen.findByLabelText(/Specific Issue Subcategory/i)) as HTMLSelectElement;
    expect(subSelect.value).toBe('PRN-TS-JAM');

    // Change parent category to NET-CFG (which has no subcategories)
    fireEvent.click(screen.getByRole('button', { name: /No Internet \/ Wi-Fi/i }));

    await waitFor(() => {
      expect(screen.queryByLabelText(/Specific Issue Subcategory/i)).toBeNull();
    });
  });
});
