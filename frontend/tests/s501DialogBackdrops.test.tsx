// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EditITStaffModal } from '../src/features/team/components/EditITStaffModal';
import { TicketChecklistSection } from '../src/components/tickets/checklist/TicketChecklistSection';
import { RepairNotesLibraryView } from '../src/features/notes/RepairNotesLibraryView';
import { QuickIntakeModal } from '../src/components/tickets/QuickIntakeModal';
import { useAppStore } from '../src/store/useAppStore';
import * as repairNotesApi from '../src/api/repairNotes';
import { adminApi, directoryApi } from '../src/api/client';
import type { TeamMember } from '../src/types/team';
import type { SavedRepairNote, TicketChecklist } from '../src/types/ticket';

const mockMember: TeamMember = {
  id: 'user-tech-1',
  name: 'Nathaniel D. Esguerra',
  email: 'nesguerra@fivestar.com.ph',
  role: 'Field Technician',
  systemRole: 'it',
  department: 'Terminal Operations & PMS',
  primaryLocation: 'Pasay Terminal (PSY)',
  status: 'active',
  is_active: true,
  username: 'nesguerra',
  avatar: '',
  ticketsClosed: 0,
  activeTickets: 0,
  flameScore: 0,
};

const mockGuide: SavedRepairNote = {
  id: 'guide-uuid-1',
  title: 'Thermal Printer Cutter Jam Fix',
  taskCode: 'PRN-TS',
  taskName: 'Printer Troubleshoot',
  symptomAndFixNote: 'Rotate emergency gear manually.',
  checklistSteps: ['Power off printer', 'Rotate emergency gear', 'Self test print'],
  author: 'Nathaniel D. Esguerra',
  authorId: 'user-tech-1',
  revision: 1,
  updatedAt: '2026-10-27T08:00:00Z',
  canEdit: true,
};

const mockChecklist: TicketChecklist = {
  id: 'checklist-uuid-1',
  ticketId: 'ticket-uuid-1',
  sourceRepairNoteId: null,
  sourceRevision: null,
  guideTitleSnapshot: null,
  guideTaskCodeSnapshot: null,
  guideTaskNameSnapshot: null,
  guideBody: null,
  appliedById: null,
  appliedByName: null,
  appliedAt: null,
  createdById: 'user-tech-1',
  updatedById: 'user-tech-1',
  revision: 1,
  createdAt: '2026-10-27T08:30:00Z',
  updatedAt: '2026-10-27T08:30:00Z',
  steps: [
    {
      id: 'step-1',
      position: 0,
      text: 'Check terminal power',
      completed: false,
    },
  ],
};

describe('F-01: Full Viewport Backdrops and Scroll Containment (S5-01, S5-06)', () => {
  beforeEach(() => {
    useAppStore.setState({
      currentUser: {
        id: 'user-tech-1',
        name: 'Nathaniel D. Esguerra',
        email: 'nesguerra@fivestar.com.ph',
        role: 'it',
        title: 'IT Specialist',
        avatar: '',
      },
      savedRepairNotes: [mockGuide],
      savedRepairNotesTotal: 1,
      checklistsByTicketId: {
        'ticket-uuid-1': mockChecklist,
      },
      tickets: [],
      toasts: [],
      isQuickIntakeOpen: false,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('1. EditITStaffModal Backdrop & Scroll Containment', () => {
    it('renders with standardized full viewport backdrop classes and ARIA dialog roles', () => {
      const handleClose = vi.fn();
      render(
        <EditITStaffModal
          isOpen={true}
          member={mockMember}
          onClose={handleClose}
          onSubmit={vi.fn().mockResolvedValue(true)}
        />
      );

      const dialogOverlay = screen.getByRole('dialog');
      expect(dialogOverlay).toBeTruthy();
      expect(dialogOverlay.getAttribute('aria-modal')).toBe('true');
      expect(dialogOverlay.className).toContain('fixed');
      expect(dialogOverlay.className).toContain('inset-0');
      expect(dialogOverlay.className).toContain('z-50');
      expect(dialogOverlay.className).toContain('bg-black/60');
      expect(dialogOverlay.className).toContain('backdrop-blur-sm');

      // Scroll containment on dialog card
      const modalContentCard = dialogOverlay.querySelector('.bg-white');
      expect(modalContentCard).toBeTruthy();
      expect(modalContentCard?.className).toContain('max-h-[85vh]');
      expect(modalContentCard?.className).toContain('overflow-hidden');
      expect(modalContentCard?.className).toContain('flex-col');

      // Internal form body has overflow-y-auto
      const formScrollBody = modalContentCard?.querySelector('.overflow-y-auto');
      expect(formScrollBody).toBeTruthy();
    });

    it('dismisses modal on backdrop click and on Escape key press', () => {
      const handleClose = vi.fn();
      render(
        <EditITStaffModal
          isOpen={true}
          member={mockMember}
          onClose={handleClose}
          onSubmit={vi.fn().mockResolvedValue(true)}
        />
      );

      // Press Escape
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);

      // Click outer backdrop click-catcher
      const overlayCatcher = screen.getByRole('dialog').querySelector('.fixed.inset-0');
      expect(overlayCatcher).toBeTruthy();
      fireEvent.click(overlayCatcher!);
      expect(handleClose).toHaveBeenCalledTimes(2);
    });
  });

  describe('2. TicketChecklistSection Apply Guide Modal Backdrop & Containment', () => {
    it('renders Apply Guide modal with fixed full viewport backdrop and contained scroll body', async () => {
      vi.spyOn(repairNotesApi, 'getRepairNotesApi').mockResolvedValue({
        items: [mockGuide],
        total: 1,
        offset: 0,
        limit: 50,
      });

      render(
        <TicketChecklistSection
          ticketId="ticket-uuid-1"
          ticketStatus="PROG"
          ticketTaskCode="PRN-TS"
        />
      );

      // Open Apply Guide modal
      const openBtn = screen.getByRole('button', { name: /Apply Saved Guide/i });
      fireEvent.click(openBtn);

      const dialogOverlay = screen.getByRole('dialog');
      expect(dialogOverlay).toBeTruthy();
      expect(dialogOverlay.className).toContain('fixed');
      expect(dialogOverlay.className).toContain('inset-0');
      expect(dialogOverlay.className).toContain('z-50');
      expect(dialogOverlay.className).toContain('bg-black/60');
      expect(dialogOverlay.className).toContain('backdrop-blur-sm');

      // Dialog card has max-h-[85vh] and overflow-hidden
      const modalContentCard = dialogOverlay.querySelector('.bg-white');
      expect(modalContentCard?.className).toContain('max-h-[85vh]');
      expect(modalContentCard?.className).toContain('overflow-hidden');

      // Guides list has overflow-y-auto
      const scrollBody = modalContentCard?.querySelector('.overflow-y-auto');
      expect(scrollBody).toBeTruthy();

      // Dismiss on Escape
      fireEvent.keyDown(window, { key: 'Escape' });
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeNull();
      });
    });
  });

  describe('3. RepairNotesLibraryView Delete Modal Backdrop & Containment', () => {
    it('renders delete confirmation modal with standardized backdrop and max-h-[85vh] containment', async () => {
      vi.spyOn(repairNotesApi, 'getRepairNotesApi').mockResolvedValue({
        items: [mockGuide],
        total: 1,
        offset: 0,
        limit: 50,
      });

      render(<RepairNotesLibraryView />);

      // Find delete button on the note card
      const deleteBtn = screen.getByTitle('Delete Repair Note');
      fireEvent.click(deleteBtn);

      // Delete confirmation modal appears
      const dialogOverlay = screen.getByRole('dialog');
      expect(dialogOverlay).toBeTruthy();
      expect(dialogOverlay.className).toContain('fixed');
      expect(dialogOverlay.className).toContain('inset-0');
      expect(dialogOverlay.className).toContain('z-50');
      expect(dialogOverlay.className).toContain('bg-black/60');
      expect(dialogOverlay.className).toContain('backdrop-blur-sm');

      const modalContentCard = dialogOverlay.querySelector('.bg-white');
      expect(modalContentCard?.className).toContain('max-h-[85vh]');
      expect(modalContentCard?.className).toContain('overflow-y-auto');

      // Press Escape to dismiss
      fireEvent.keyDown(window, { key: 'Escape' });
      await waitFor(() => {
        expect(screen.queryByText(/Delete Repair Note\?/i)).toBeNull();
      });
    });
  });

  describe('4. QuickIntakeModal Scroll Containment (S5-06)', () => {
    it('contains intake form scroll inside modal body, keeping header and footer action buttons pinned', async () => {
      vi.spyOn(adminApi, 'getDictionaries').mockResolvedValue({
        companies: [],
        locations: [],
        departments: [],
        tasks: [{ id: '', code: 'PRN-TS', name: 'Printer Troubleshooting' }],
        location_departments: [],
      });
      vi.spyOn(directoryApi, 'lookupEmployee').mockResolvedValue({
        id: 'emp-1',
        employee_id: '1042',
        full_name: 'John Doe',
        email: 'jdoe@fivestar.com.ph',
        is_active: true,
        company_id: 'c-1',
        company_name: 'Five Star',
        location_id: 'loc-1',
        location_name: 'Pasay',
        department_id: 'd-1',
        department_name: 'Operations',
      });

      useAppStore.setState({ isQuickIntakeOpen: true });
      render(<QuickIntakeModal />);

      const dialogOverlay = document.querySelector('.fixed.inset-0.z-50');
      expect(dialogOverlay).toBeTruthy();
      expect(dialogOverlay?.className).toContain('bg-black/60');
      expect(dialogOverlay?.className).toContain('backdrop-blur-sm');

      const modalSection = screen.getByRole('dialog');
      expect(modalSection.className).toContain('max-h-[85vh]');
      expect(modalSection.className).toContain('overflow-hidden');
      expect(modalSection.className).toContain('flex-col');

      // Header has shrink-0
      const header = modalSection.querySelector('header');
      expect(header?.className).toContain('shrink-0');

      // Scrollable form fields body
      const scrollBody = modalSection.querySelector('.overflow-y-auto');
      expect(scrollBody).toBeTruthy();

      // Pinned actions container has shrink-0
      const footerActions = modalSection.querySelector('.border-t');
      expect(footerActions?.className).toContain('shrink-0');

      // Press Escape dismisses intake
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(useAppStore.getState().isQuickIntakeOpen).toBe(false);
    });
  });
});
