import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError } from 'axios';
import { TicketChecklistSection } from '../src/components/tickets/checklist/TicketChecklistSection';
import { RepairNotesLibraryView } from '../src/features/notes/RepairNotesLibraryView';
import { ToastContainer } from '../src/components/common/ToastContainer';
import { useAppStore } from '../src/store/useAppStore';
import * as repairNotesApi from '../src/api/repairNotes';
import type { SavedRepairNote, TicketChecklist } from '../src/types/ticket';

const mockGuide: SavedRepairNote = {
  id: 'guide-uuid-1',
  title: 'Thermal Printer Cutter Jam Fix',
  taskCode: 'PRN-TS',
  taskName: 'Printer Troubleshoot',
  symptomAndFixNote: 'Cutter blade jammed mid-cut. Rotate gear manually and clean head.',
  checklistSteps: ['Power off printer', 'Rotate emergency gear', 'Test self-test print'],
  author: 'Nathaniel D. Esguerra',
  authorId: 'user-tech-1',
  revision: 1,
  updatedAt: '2026-10-27T08:00:00Z',
  canEdit: true,
};

const mockChecklist: TicketChecklist = {
  id: 'checklist-uuid-1',
  ticketId: 'ticket-uuid-1',
  sourceRepairNoteId: mockGuide.id,
  sourceRevision: 1,
  guideTitleSnapshot: mockGuide.title,
  guideTaskCodeSnapshot: mockGuide.taskCode,
  guideTaskNameSnapshot: mockGuide.taskName,
  guideBody: mockGuide.symptomAndFixNote,
  appliedById: 'user-tech-1',
  appliedByName: 'Tech Nathaniel',
  appliedAt: '2026-10-27T08:30:00Z',
  createdById: 'user-tech-1',
  updatedById: 'user-tech-1',
  revision: 1,
  createdAt: '2026-10-27T08:30:00Z',
  updatedAt: '2026-10-27T08:30:00Z',
  steps: [
    {
      id: 'step-uuid-1',
      checklistId: 'checklist-uuid-1',
      position: 0,
      text: 'Power off printer',
      completed: false,
      completedAt: null,
      completedById: null,
      completedByName: null,
    },
    {
      id: 'step-uuid-2',
      checklistId: 'checklist-uuid-1',
      position: 1,
      text: 'Rotate emergency gear',
      completed: true,
      completedAt: '2026-10-27T08:35:00Z',
      completedById: 'user-tech-1',
      completedByName: 'Tech Nathaniel',
    },
  ],
};

describe('Saved Repair Notes & Ticket Checklists', () => {
  beforeEach(() => {
    useAppStore.setState({
      savedRepairNotes: [mockGuide],
      savedRepairNotesTotal: 1,
      checklistsByTicketId: {
        'ticket-uuid-1': mockChecklist,
      },
      isLoadingChecklists: {},
      toasts: [],
      currentUser: {
        id: 'user-tech-1',
        name: 'Tech Nathaniel',
        email: 'tech@example.com',
        role: 'it',
        title: 'IT Specialist',
        avatar: 'TN',
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders applied guide snapshot and interactive checklist steps', () => {
    render(
      <TicketChecklistSection
        ticketId="ticket-uuid-1"
        ticketStatus="PROG"
        ticketTaskCode="PRN-TS"
      />
    );

    // Guide snapshot title
    expect(screen.getByText('Thermal Printer Cutter Jam Fix')).toBeTruthy();
    // Guide body snippet
    expect(
      screen.getByText(/Cutter blade jammed mid-cut\. Rotate gear manually and clean head\./)
    ).toBeTruthy();

    // Steps
    expect(screen.getByText('Power off printer')).toBeTruthy();
    expect(screen.getByText('Rotate emergency gear')).toBeTruthy();
    expect(screen.getByText(/Completed by Tech Nathaniel/)).toBeTruthy();
  });

  it('enforces read-only behavior when ticket is not in PROG status', () => {
    render(
      <TicketChecklistSection
        ticketId="ticket-uuid-1"
        ticketStatus="OPEN"
        ticketTaskCode="PRN-TS"
      />
    );

    // Read-only banner is displayed
    expect(
      screen.getByText(/Checklist is read-only\. Steps can only be checked or modified when ticket is in/)
    ).toBeTruthy();

    // "Apply Saved Guide" button is not visible
    expect(screen.queryByRole('button', { name: /Apply Saved Guide/i })).toBeNull();

    // Checkbox buttons are disabled
    const checkboxes = screen.getAllByRole('button').filter(
      (btn) => btn.getAttribute('disabled') !== null
    );
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  it('toggles step completion with explicit boolean and expected revision', async () => {
    const updateSpy = vi
      .spyOn(repairNotesApi, 'updateTicketChecklistStepApi')
      .mockResolvedValue({
        ...mockChecklist,
        revision: 2,
        steps: [
          { ...mockChecklist.steps[0], completed: true, completedByName: 'Tech Nathaniel' },
          mockChecklist.steps[1],
        ],
      });

    render(
      <TicketChecklistSection
        ticketId="ticket-uuid-1"
        ticketStatus="PROG"
        ticketTaskCode="PRN-TS"
      />
    );

    // Click first checkbox (currently uncompleted)
    const checkboxes = screen.getAllByRole('button').filter(
      (b) => !b.textContent && !b.getAttribute('title')
    );
    expect(checkboxes.length).toBe(2);
    fireEvent.click(checkboxes[0]);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith('ticket-uuid-1', 'step-uuid-1', {
        expected_checklist_revision: 1,
        completed: true,
      });
    });
  });

  it('requires explicit replacement confirmation when checklist already exists', async () => {
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

    // Click Apply Saved Guide
    fireEvent.click(screen.getByRole('button', { name: /Apply Saved Guide/i }));

    // Modal opens, click "Select Guide"
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Select Guide/i })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: /Select Guide/i }));

    // Replacement warning dialog must appear!
    await waitFor(() => {
      expect(screen.getByText('Replace Existing Ticket Checklist?')).toBeTruthy();
      expect(
        screen.getByText(/Applying a new guide will replace the current checklist steps/)
      ).toBeTruthy();
    });

    const applySpy = vi
      .spyOn(repairNotesApi, 'applyRepairNoteToTicketApi')
      .mockResolvedValue(mockChecklist);

    // Click "Confirm Replace"
    fireEvent.click(screen.getByRole('button', { name: /Confirm Replace/i }));

    await waitFor(() => {
      expect(applySpy).toHaveBeenCalledWith('ticket-uuid-1', {
        repair_note_id: mockGuide.id,
        expected_note_revision: 1,
        replace_existing: true,
        expected_checklist_revision: 1,
      });
    });
  });

  it('retains draft inputs in RepairNotesLibraryView when API write fails', async () => {
    vi.spyOn(repairNotesApi, 'getRepairNotesApi').mockResolvedValue({
      items: [mockGuide],
      total: 1,
      offset: 0,
      limit: 50,
    });

    vi.spyOn(repairNotesApi, 'createRepairNoteApi').mockRejectedValue(
      new AxiosError('Network connection timeout')
    );

    render(
      <>
        <RepairNotesLibraryView />
        <ToastContainer />
      </>
    );

    // Open create form
    fireEvent.click(screen.getByRole('button', { name: /New Repair Note/i }));

    // Fill in title and note draft
    const titleInput = screen.getByPlaceholderText(/e\.g\. Epson TM-T82/i);
    const noteInput = screen.getByPlaceholderText(/Detail the exact troubleshooting/i);

    fireEvent.change(titleInput, { target: { value: 'Draft Unsaved Title' } });
    fireEvent.change(noteInput, { target: { value: 'Detailed Draft Note' } });

    // Click Save Guide
    fireEvent.click(screen.getByRole('button', { name: /Save Guide/i }));

    // Error toast appears
    await waitFor(() => {
      expect(screen.getByText('Save Failed')).toBeTruthy();
    });

    // CRITICAL REQUIREMENT: Form must remain open with draft values preserved!
    expect(screen.getByDisplayValue('Draft Unsaved Title')).toBeTruthy();
    expect(screen.getByDisplayValue('Detailed Draft Note')).toBeTruthy();
  });

  it('clears state on resetNotesState and drops stale in-flight responses', async () => {
    let resolveFirstQuery: (val: any) => void = () => {};
    const firstPromise = new Promise((resolve) => {
      resolveFirstQuery = resolve;
    });

    vi.spyOn(repairNotesApi, 'getRepairNotesApi').mockImplementation(() => firstPromise as any);

    // Initiate first fetch
    const fetchPromise = useAppStore.getState().fetchSavedRepairNotes();
    expect(useAppStore.getState().isLoadingNotes).toBe(true);

    // Trigger logout / resetNotesState
    act(() => {
      useAppStore.getState().resetNotesState();
    });

    expect(useAppStore.getState().savedRepairNotes).toEqual([]);
    expect(useAppStore.getState().checklistsByTicketId).toEqual({});
    expect(useAppStore.getState().isLoadingNotes).toBe(false);

    // Now resolve the late first query
    resolveFirstQuery({
      items: [mockGuide],
      total: 1,
      offset: 0,
      limit: 50,
    });
    await fetchPromise;

    // Stale response must be dropped because sequence changed!
    expect(useAppStore.getState().savedRepairNotes).toEqual([]);
  });
});
