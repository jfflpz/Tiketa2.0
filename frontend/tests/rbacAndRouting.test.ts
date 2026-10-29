import { describe, it, expect } from 'vitest';
import { resolvePathToView, viewToCanonicalPath } from '../src/utils/routeUtils';
import { ROLE_ALLOWED_VIEWS } from '../src/App';
import type { ActiveView } from '../src/store/slices/uiSlice';

describe('Route Utils & Canonical Paths', () => {
  it('resolves public root and kiosk paths to public route', () => {
    expect(resolvePathToView('/')).toBe('public');
    expect(resolvePathToView('')).toBe('public');
    expect(resolvePathToView('/report')).toBe('public');
    expect(resolvePathToView('/kiosk')).toBe('public');
  });

  it('resolves dashboard and overview paths to overview view', () => {
    expect(resolvePathToView('/dashboard')).toBe('overview');
    expect(resolvePathToView('/overview')).toBe('overview');
  });

  it('resolves deep link staff routes correctly', () => {
    const validStaffViews: ActiveView[] = [
      'overview',
      'tickets',
      'workbench',
      'notes',
      'joblogs',
      'terminals',
      'analytics',
      'reports',
      'team',
    ];

    for (const view of validStaffViews) {
      expect(resolvePathToView(`/${view}`)).toBe(view);
    }
  });

  it('maps active views to canonical paths', () => {
    expect(viewToCanonicalPath('overview')).toBe('/dashboard');
    expect(viewToCanonicalPath('tickets')).toBe('/tickets');
    expect(viewToCanonicalPath('analytics')).toBe('/analytics');
    expect(viewToCanonicalPath('reports')).toBe('/reports');
    expect(viewToCanonicalPath('workbench')).toBe('/workbench');
  });
});

describe('Role-Based Access Control (RBAC) Matrix', () => {
  it('intern has access ONLY to overview, workbench, notes, joblogs', () => {
    const allowed = ROLE_ALLOWED_VIEWS.intern;
    expect(allowed).toEqual(['overview', 'workbench', 'notes', 'joblogs']);
    expect(allowed).not.toContain('tickets');
    expect(allowed).not.toContain('terminals');
    expect(allowed).not.toContain('analytics');
    expect(allowed).not.toContain('reports');
    expect(allowed).not.toContain('team');
  });

  it('it role has access to operational fleet views', () => {
    const allowed = ROLE_ALLOWED_VIEWS.it;
    expect(allowed).toEqual(['overview', 'tickets', 'workbench', 'notes', 'joblogs', 'terminals']);
    expect(allowed).toContain('tickets');
    expect(allowed).toContain('terminals');
    expect(allowed).not.toContain('analytics');
    expect(allowed).not.toContain('reports');
    expect(allowed).not.toContain('team');
  });

  it('supervisor role has access to analytics and governance views with zero queue operational views', () => {
    const allowed = ROLE_ALLOWED_VIEWS.supervisor;
    expect(allowed).toEqual(['overview', 'analytics', 'reports', 'team', 'joblogs']);
    expect(allowed).not.toContain('tickets');
    expect(allowed).not.toContain('workbench');
    expect(allowed).not.toContain('terminals');
  });

  it('admin role has full access to all 9 views without omission', () => {
    const allowed = ROLE_ALLOWED_VIEWS.admin;
    expect(allowed).toHaveLength(9);
    expect(allowed).toEqual([
      'overview',
      'tickets',
      'workbench',
      'notes',
      'joblogs',
      'terminals',
      'analytics',
      'reports',
      'team',
    ]);
  });
});
