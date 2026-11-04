// @spec BF-02: URL-Aware Employee and Staff Routing Utilities
import type { ActiveView, StaffRole } from '../store/slices/uiSlice';

export type AppRoute = ActiveView | 'public';

/**
 * Returns the canonical home view for a given staff role:
 * Admin -> overview (/dashboard)
 * IT -> tickets (/tickets)
 * Supervisor -> analytics (/analytics)
 * Intern -> workbench (/workbench)
 */
export function getDefaultHomeForRole(role: StaffRole): ActiveView {
  switch (role) {
    case 'admin':
      return 'overview';
    case 'it':
      return 'tickets';
    case 'supervisor':
      return 'analytics';
    case 'intern':
      return 'workbench';
    default:
      return 'overview';
  }
}

/**
 * Resolves a URL pathname to an application view.
 * /report or / maps to 'public' (Employee Ticket Screen).
 * /dashboard or /overview maps to 'overview' (IT Overview Dashboard).
 * Deep links (/tickets, /workbench, /notes, /joblogs, /terminals, /analytics, /reports, /team) map to their respective views.
 */
export function resolvePathToView(pathname: string): AppRoute {
  if (!pathname) return 'public';
  const clean = pathname.replace(/^\/+/, '').split('?')[0].split('#')[0].toLowerCase();

  if (!clean || clean === 'report' || clean === 'kiosk') return 'public';
  if (clean === 'dashboard' || clean === 'overview') return 'overview';

  const staffViews: ActiveView[] = [
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

  if (staffViews.includes(clean as ActiveView)) {
    return clean as ActiveView;
  }

  return 'public';
}

/**
 * Maps an internal active view to its canonical URL path.
 */
export function viewToCanonicalPath(view: ActiveView): string {
  if (view === 'overview') return '/dashboard';
  return `/${view}`;
}
