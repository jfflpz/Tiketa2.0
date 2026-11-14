import type { ActiveView, AuthenticatedUser, StaffRole } from '../store/slices/uiSlice';

export const STAFF_TITLES = [
  'Intern',
  'Junior IT Analyst',
  'Senior IT Analyst',
  'IT Part-Timer',
  'Supervisor',
  'Admin',
] as const;

export type StaffTitle = (typeof STAFF_TITLES)[number];

export const DEFAULT_ROLE_PERMISSIONS: Record<StaffRole, string[]> = {
  intern: ['workbench:access', 'notes:view'],
  it: ['workbench:access', 'notes:view', 'tickets:view', 'tickets:claim', 'terminals:view'],
  supervisor: ['notes:view', 'terminals:view', 'analytics:view', 'reports:export', 'team:manage'],
  admin: [
    'workbench:access',
    'notes:view',
    'notes:edit',
    'tickets:view',
    'tickets:claim',
    'terminals:view',
    'analytics:view',
    'reports:export',
    'team:manage',
  ],
};

export const ROLE_ALLOWED_VIEWS: Record<StaffRole, ActiveView[]> = {
  intern: ['overview', 'workbench', 'notes', 'joblogs'],
  it: ['overview', 'tickets', 'workbench', 'notes', 'joblogs', 'terminals'],
  supervisor: ['analytics', 'reports', 'team', 'joblogs', 'terminals'],
  admin: [
    'overview',
    'tickets',
    'workbench',
    'notes',
    'joblogs',
    'terminals',
    'analytics',
    'reports',
    'team',
  ],
};

const PERMISSION_TO_VIEWS: Record<string, ActiveView[]> = {
  'workbench:access': ['overview', 'workbench', 'joblogs'],
  'notes:view': ['notes'],
  'notes:edit': ['notes'],
  'tickets:view': ['tickets'],
  'terminals:view': ['terminals'],
  'analytics:view': ['analytics', 'reports'],
  'reports:export': ['reports'],
  'team:manage': ['team'],
};

/**
 * Returns effective permissions for a user, preferring server-supplied
 * effective/custom permissions and falling back to role defaults.
 */
export function getEffectivePermissions(
  user: Pick<AuthenticatedUser, 'role' | 'effectivePermissions' | 'custom_permissions'> | null | undefined
): string[] {
  if (!user) return [];
  if (Array.isArray(user.effectivePermissions)) {
    return user.effectivePermissions;
  }
  if (Array.isArray(user.custom_permissions)) {
    return user.custom_permissions;
  }
  return DEFAULT_ROLE_PERMISSIONS[user.role] ?? [];
}

export function hasPermission(
  user: Pick<AuthenticatedUser, 'role' | 'effectivePermissions' | 'custom_permissions'> | null | undefined,
  permission: string
): boolean {
  return getEffectivePermissions(user).includes(permission);
}

/**
 * Computes allowed views from effective permissions when explicitly supplied,
 * otherwise falls back to ROLE_ALLOWED_VIEWS[user.role].
 */
export function getAllowedViewsForUser(
  user: Pick<AuthenticatedUser, 'role' | 'effectivePermissions' | 'custom_permissions'> | null | undefined
): ActiveView[] {
  if (!user) return [];
  const hasExplicitPerms =
    Array.isArray(user.effectivePermissions) || Array.isArray(user.custom_permissions);
  if (!hasExplicitPerms) {
    return ROLE_ALLOWED_VIEWS[user.role] ?? ['overview'];
  }

  const perms = getEffectivePermissions(user);
  const viewSet = new Set<ActiveView>();
  for (const perm of perms) {
    const views = PERMISSION_TO_VIEWS[perm];
    if (views) {
      for (const v of views) viewSet.add(v);
    }
  }
  if (user.role === 'supervisor') {
    viewSet.add('joblogs');
  }
  return Array.from(viewSet);
}
