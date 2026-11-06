// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TicketChecklistSection } from '../src/components/tickets/checklist/TicketChecklistSection';
import { ToastContainer } from '../src/components/common/ToastContainer';
import { useAppStore } from '../src/store/useAppStore';
import * as repairNotesApi from '../src/api/repairNotes';
import type { SavedRepairNote, TicketChecklist } from '../src/types/ticket';

const mockGuideA: SavedRepairNote = {
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

const mockGuideB: SavedRepairNote = {
  id: 'guide-uuid-2',
  title: 'Network Interface Reset Guide',
  taskCode: 'NET-CFG',
  taskName: 'Network Configuration',
  symptomAndFixNote: 'Reset terminal network interface and verify IP.',
  checklistSteps: ['Verify Ethernet link light', 'Renew DHCP lease', 'Ping gateway'],
  author: 'Nathaniel D. Esguerra',
  authorId: 'user-tech-1',
  revision: 1,
  updatedAt: '2026-10-27T09:00:00Z',
  canEdit: true,
};

const existingChecklistWithSteps: TicketChecklist = {
  id: 'checklist-uuid-1',
  ticketId: 'ticket-uuid-1',
  sourceRepairNoteId: 'guide-old',
  sourceRevision: 1,
  guideTitleSnapshot: 'Existing Guide Title',
  guideTaskCodeSnapshot: 'PRN-TS',
  guideTaskNameSnapshot: 'Printer Troubleshoot',
  guideBody: 'Existing guide symptom details',
  appliedById: 'user-tech-1',
  appliedByName: 'Nathaniel D. Esguerra',
  appliedAt: '2026-10-27T08:00:00Z',
  createdById: 'user-tech-1',
  updatedById: 'user-tech-1',
  revision: 1,
  createdAt: '2026-10-27T08:00:00Z',
  updatedAt: '2026-10-27T08:00:00Z',
  steps: [
    {
      id: 'step-existing-1',
      position: 0,
      text: 'Existing Step 1: Check paper feed',
      completed: true,
    },
    {
      id: 'step-existing-2',
      position: 1,
      text: 'Existing Step 2: Clean print head',
      completed: false,
    },
  ],
};

describe('F-04: Single Active Dialog State Machine for Guide Replacement (S5-11)', () => {
  beforeEach(() => {
    vi.spyOn(repairNotesApi, 'getRepairNotesApi').mockResolvedValue({
      items: [mockGuideA, mockGuideB],
      total: 2,
      offset: 0,
      limit: 50,
    });

    useAppStore.setState({
      currentUser: {
        id: 'user-tech-1',
        name: 'Nathaniel D. Esguerra',
        email: 'nesguerra@fivestar.com.ph',
        role: 'it',
        title: 'IT Specialist',
        avatar: '',
      },
      savedRepairNotes: [mockGuideA, mockGuideB],
      savedRepairNotesTotal: 2,
      checklistsByTicketId: {
        'ticket-uuid-1': { ...existingChecklistWithSteps },
      },
      toasts: [],
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('1. Single Active Dialog Invariant: never mounts picker and replacement dialog at the same time', async () => {
    render(
      <>
        <TicketChecklistSection
          ticketId="ticket-uuid-1"
          ticketStatus="PROG"
          ticketTaskCode="PRN-TS"
        />
        <ToastContainer />
      </>
    );

    // Initial state: No modal dialogs
    expect(document.querySelectorAll('[role="dialog"]').length).toBe(0);

    // Step 1: Open picker modal
    fireEvent.click(screen.getByRole('button', { name: /Apply Saved Guide/i }));
    expect(document.querySelectorAll('[role="dialog"]').length).toBe(1);
    expect(screen.getByText('Apply Saved Repair Guide to Ticket')).toBeTruthy();
    expect(screen.queryByText('Replace Existing Ticket Checklist?')).toBeNull();

    // Step 2: Select a guide while ticket has existing steps
    const selectButtons = screen.getAllByRole('button', { name: /Select Guide/i });
    fireEvent.click(selectButtons[0]);

    // Invariant check: Exactly ONE dialog mounted in DOM
    const activeDialogs = document.querySelectorAll('[role="dialog"]');
    expect(activeDialogs.length).toBe(1);

    // The picker is unmounted and the confirmation dialog is mounted
    expect(screen.queryByText('Apply Saved Repair Guide to Ticket')).toBeNull();
    expect(screen.getByText('Replace Existing Ticket Checklist?')).toBeTruthy();
  });

  it('2. Cancel on confirmation restores guide picker with selection and category filter intact', async () => {
    render(
      <>
        <TicketChecklistSection
          ticketId="ticket-uuid-1"
          ticketStatus="PROG"
          ticketTaskCode="PRN-TS"
        />
        <ToastContainer />
      </>
    );

    // Open picker
    fireEvent.click(screen.getByRole('button', { name: /Apply Saved Guide/i }));
    // Select first guide
    const selectButtons = screen.getAllByRole('button', { name: /Select Guide/i });
    fireEvent.click(selectButtons[0]);

    // Confirmation dialog is displayed
    expect(screen.getByText('Replace Existing Ticket Checklist?')).toBeTruthy();

    // Click "Cancel" in confirmation dialog
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    // Confirmation dialog unmounts, picker reopens
    expect(screen.queryByText('Replace Existing Ticket Checklist?')).toBeNull();
    expect(screen.getByText('Apply Saved Repair Guide to Ticket')).toBeTruthy();

    // Exactly one active dialog in DOM
    expect(document.querySelectorAll('[role="dialog"]').length).toBe(1);

    // Existing ticket checklist steps remain 100% untouched
    const currentTicketChecklist = useAppStore.getState().checklistsByTicketId['ticket-uuid-1'];
    expect(currentTicketChecklist?.steps.length).toBe(2);
    expect(currentTicketChecklist?.steps[0].text).toBe('Existing Step 1: Check paper feed');
  });

  it('3. Confirm Replace applies new guide, updates store, and dismisses all dialogs', async () => {
    const applySpy = vi.spyOn(repairNotesApi, 'applyRepairNoteToTicketApi').mockResolvedValue({
      id: 'checklist-uuid-1',
      ticketId: 'ticket-uuid-1',
      sourceRepairNoteId: mockGuideA.id,
      sourceRevision: mockGuideA.revision,
      guideTitleSnapshot: mockGuideA.title,
      guideTaskCodeSnapshot: mockGuideA.taskCode,
      guideTaskNameSnapshot: mockGuideA.taskName,
      guideBody: mockGuideA.symptomAndFixNote,
      appliedById: 'user-tech-1',
      appliedByName: 'Nathaniel D. Esguerra',
      appliedAt: '2026-10-27T10:00:00Z',
      createdById: 'user-tech-1',
      updatedById: 'user-tech-1',
      revision: 2,
      createdAt: '2026-10-27T08:00:00Z',
      updatedAt: '2026-10-27T10:00:00Z',
      steps: mockGuideA.checklistSteps.map((text, i) => ({
        id: `new-step-${i}`,
        checklistId: 'checklist-uuid-1',
        position: i,
        text,
        completed: false,
        completedAt: null,
        completedById: null,
        completedByName: null,
        createdAt: '2026-10-27T10:00:00Z',
        updatedAt: '2026-10-27T10:00:00Z',
      })),
    });

    render(
      <>
        <TicketChecklistSection
          ticketId="ticket-uuid-1"
          ticketStatus="PROG"
          ticketTaskCode="PRN-TS"
        />
        <ToastContainer />
      </>
    );

    // Open picker and select guide
    fireEvent.click(screen.getByRole('button', { name: /Apply Saved Guide/i }));
    fireEvent.click(screen.getAllByRole('button', { name: /Select Guide/i })[0]);

    // Click "Confirm Replace"
    const confirmBtn = screen.getByRole('button', { name: /Confirm Replace/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(applySpy).toHaveBeenCalledWith('ticket-uuid-1', {
        repair_note_id: mockGuideA.id,
        expected_note_revision: mockGuideA.revision,
        replace_existing: true,
        expected_checklist_revision: 1,
      });
    });

    // All dialogs are completely dismissed
    await waitFor(() => {
      expect(document.querySelectorAll('[role="dialog"]').length).toBe(0);
    });
  });

  it('4. Applies immediately without replacement prompt when ticket has no existing checklist', async () => {
    useAppStore.setState({
      checklistsByTicketId: {
        'ticket-empty-1': {
          ticketId: 'ticket-empty-1',
          sourceRepairNoteId: null,
          sourceRevision: null,
          guideTitleSnapshot: null,
          guideTaskCodeSnapshot: null,
          guideTaskNameSnapshot: null,
          guideBody: null,
          appliedById: null,
          appliedByName: null,
          appliedAt: null,
          revision: 1,
          steps: [],
        },
      },
    });

    const applySpy = vi.spyOn(repairNotesApi, 'applyRepairNoteToTicketApi').mockResolvedValue({
      id: 'checklist-empty-1',
      ticketId: 'ticket-empty-1',
      sourceRepairNoteId: mockGuideA.id,
      sourceRevision: mockGuideA.revision,
      guideTitleSnapshot: mockGuideA.title,
      guideTaskCodeSnapshot: mockGuideA.taskCode,
      guideTaskNameSnapshot: mockGuideA.taskName,
      guideBody: mockGuideA.symptomAndFixNote,
      appliedById: 'user-tech-1',
      appliedByName: 'Nathaniel D. Esguerra',
      appliedAt: '2026-10-27T10:00:00Z',
      createdById: 'user-tech-1',
      updatedById: 'user-tech-1',
      revision: 2,
      createdAt: '2026-10-27T08:00:00Z',
      updatedAt: '2026-10-27T10:00:00Z',
      steps: [],
    });

    render(
      <>
        <TicketChecklistSection
          ticketId="ticket-empty-1"
          ticketStatus="PROG"
          ticketTaskCode="PRN-TS"
        />
        <ToastContainer />
      </>
    );

    fireEvent.click(screen.getByRole('button', { name: /Apply Saved Guide/i }));
    fireEvent.click(screen.getAllByRole('button', { name: /Select Guide/i })[0]);

    // No replacement prompt shown; applied immediately
    expect(screen.queryByText('Replace Existing Ticket Checklist?')).toBeNull();
    await waitFor(() => {
      expect(applySpy).toHaveBeenCalledWith('ticket-empty-1', {
        repair_note_id: mockGuideA.id,
        expected_note_revision: mockGuideA.revision,
        replace_existing: false,
        expected_checklist_revision: 1,
      });
    });
  });

  it('5. Handles API failure gracefully without trapping focus or corrupting existing steps', async () => {
    vi.spyOn(repairNotesApi, 'applyRepairNoteToTicketApi').mockRejectedValue(
      new Error('500 Server Error')
    );

    render(
      <>
        <TicketChecklistSection
          ticketId="ticket-uuid-1"
          ticketStatus="PROG"
          ticketTaskCode="PRN-TS"
        />
        <ToastContainer />
      </>
    );

    fireEvent.click(screen.getByRole('button', { name: /Apply Saved Guide/i }));
    fireEvent.click(screen.getAllByRole('button', { name: /Select Guide/i })[0]);

    // Click confirm replace
    fireEvent.click(screen.getByRole('button', { name: /Confirm Replace/i }));

    // Button reverts from "Replacing..." after rejection
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Confirm Replace/i })).toBeTruthy();
    });

    // Cancel still works and allows technician to exit
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('Apply Saved Repair Guide to Ticket')).toBeTruthy();

    fireEvent.click(screen.getByText('Close'));
    expect(document.querySelectorAll('[role="dialog"]').length).toBe(0);
  });
});
