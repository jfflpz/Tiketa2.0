import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { readableError } from '../src/utils/errorMessages';
import { ToastContainer } from '../src/components/common/ToastContainer';
import { useAppStore } from '../src/store/useAppStore';

afterEach(() => { cleanup(); useAppStore.setState({ toasts: [] }); });

it('handles malformed validation entries without throwing or printing input payloads', () => {
  expect(readableError([null, {}, { msg: 'Check your description', input: 'private details' }], 'Fallback')).toBe('Check your description');
  expect(readableError({ nested: 'private details' }, 'Fallback')).toBe('Fallback');
});

it('renders a legacy object-valued toast without crashing React', () => {
  useAppStore.getState().addToast('Validation error', [{ msg: 'Please check the ID' }] as unknown as string, 'warning');
  render(<ToastContainer />);
  expect(screen.getByText('Please check the ID')).toBeTruthy();
});
