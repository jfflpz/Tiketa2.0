// @spec F-01: Reliable Authentication and Remembered-Profile Login Test Suite
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isPublicEndpoint, setAccessToken, getAccessToken } from '../src/api/client';
import { getDefaultHomeForRole, viewToCanonicalPath } from '../src/utils/routeUtils';
import { useAppStore } from '../src/store/useAppStore';

describe('F-01 Authentication & Session Segregation', () => {
  beforeEach(() => {
    localStorage.clear();
    setAccessToken(null);
    vi.clearAllMocks();
  });

  describe('1. Endpoint Context Segregation', () => {
    it('correctly classifies public intake, track, and employee lookup as public', () => {
      expect(isPublicEndpoint('/tickets/submit')).toBe(true);
      expect(isPublicEndpoint('/tickets/track/T-12345')).toBe(true);
      expect(isPublicEndpoint('/employees/lookup')).toBe(true);
      expect(isPublicEndpoint('/employees/match-request')).toBe(true);
      expect(isPublicEndpoint('/employees/match-verify')).toBe(true);
    });

    it('correctly classifies operational staff endpoints as non-public', () => {
      expect(isPublicEndpoint('/tickets')).toBe(false);
      expect(isPublicEndpoint('/tickets/T-12345/claim')).toBe(false);
      expect(isPublicEndpoint('/admin/users')).toBe(false);
      expect(isPublicEndpoint('/reports/executive-kpis')).toBe(false);
      expect(isPublicEndpoint('/locations/hub-summaries')).toBe(false);
      expect(isPublicEndpoint('/dictionaries')).toBe(false);
    });
  });

  describe('2. Role-to-Home Canonical Mapping', () => {
    it('maps Admin to overview (/dashboard)', () => {
      const home = getDefaultHomeForRole('admin');
      expect(home).toBe('overview');
      expect(viewToCanonicalPath(home)).toBe('/dashboard');
    });

    it('maps IT to tickets (/tickets)', () => {
      const home = getDefaultHomeForRole('it');
      expect(home).toBe('tickets');
      expect(viewToCanonicalPath(home)).toBe('/tickets');
    });

    it('maps Supervisor to analytics (/analytics)', () => {
      const home = getDefaultHomeForRole('supervisor');
      expect(home).toBe('analytics');
      expect(viewToCanonicalPath(home)).toBe('/analytics');
    });

    it('maps Intern to workbench (/workbench)', () => {
      const home = getDefaultHomeForRole('intern');
      expect(home).toBe('workbench');
      expect(viewToCanonicalPath(home)).toBe('/workbench');
    });
  });

  describe('3. Remembered Profile Storage on Logout', () => {
    it('persists consented profile when rememberProfile is true and revokes session', async () => {
      // Set an active staff user
      useAppStore.setState({
        currentUser: {
          id: 'usr-1',
          name: 'Maria Dela Cruz',
          email: 'maria.delacruz@fivestar.com.ph',
          role: 'it',
          title: 'Senior IT Support',
          avatar: 'MD',
        },
      });

      await useAppStore.getState().logoutToKiosk({ rememberProfile: true });

      // In-memory access token must be wiped
      expect(getAccessToken()).toBeNull();
      // Store current user must be cleared
      expect(useAppStore.getState().currentUser).toBeNull();

      // Consented profile card stored without credentials or tokens
      const stored = localStorage.getItem('tiketa_remembered_profile');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed).toEqual({
        name: 'Maria Dela Cruz',
        username: 'maria.delacruz',
        role: 'it',
      });
      expect(parsed.password).toBeUndefined();
      expect(parsed.access_token).toBeUndefined();
    });

    it('clears remembered profile when rememberProfile is false', async () => {
      localStorage.setItem(
        'tiketa_remembered_profile',
        JSON.stringify({ name: 'Maria', username: 'maria', role: 'it' })
      );

      useAppStore.setState({
        currentUser: {
          id: 'usr-1',
          name: 'Maria',
          email: 'maria@fivestar.com.ph',
          role: 'it',
          title: 'IT Support',
          avatar: 'M',
        },
      });

      await useAppStore.getState().logoutToKiosk({ rememberProfile: false });

      expect(localStorage.getItem('tiketa_remembered_profile')).toBeNull();
      expect(useAppStore.getState().currentUser).toBeNull();
      expect(getAccessToken()).toBeNull();
    });
  });
});
