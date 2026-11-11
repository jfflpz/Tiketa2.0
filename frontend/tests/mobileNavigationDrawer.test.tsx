import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Sidebar } from '../src/components/layout/Sidebar';
import { TopHeader } from '../src/components/layout/TopHeader';
import { useAppStore } from '../src/store/useAppStore';
import type { AuthenticatedUser } from '../src/store/slices/uiSlice';

const mockITUser: AuthenticatedUser = {
  id: 'tech-001',
  name: 'Nathaniel D. Esguerra',
  email: 'nathaniel.esguerra@bptransport.ph',
  role: 'it',
  title: 'IT Support Specialist',
  avatar: 'NE',
};

describe('Mobile Navigation Drawer & Responsive Sidebar', () => {
  beforeEach(() => {
    cleanup();
    useAppStore.setState({
      currentUser: mockITUser,
      activeView: 'overview',
      sidebarCollapsed: false,
      mobileSidebarOpen: false,
      tickets: [],
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('1. Desktop sidebar has hidden md:flex classes so it is suppressed on mobile screens', () => {
    const { container } = render(<Sidebar />);
    const desktopAside = container.querySelector('aside.hidden.md\\:flex');
    expect(desktopAside).toBeTruthy();
    expect(desktopAside?.className).toContain('hidden');
    expect(desktopAside?.className).toContain('md:flex');
  });

  it('2. Mobile drawer is NOT rendered when mobileSidebarOpen is false', () => {
    render(<Sidebar />);
    const drawerDialog = screen.queryByRole('dialog', { name: /Mobile Navigation Drawer/i });
    expect(drawerDialog).toBeNull();
  });

  it('3. TopHeader orange toggle button toggles mobile sidebar on small viewport (<768px)', () => {
    vi.stubGlobal('innerWidth', 375);

    render(<TopHeader />);
    const orangeToggleBtn = screen.getByRole('button', { name: /Toggle Navigation/i });
    expect(orangeToggleBtn).toBeTruthy();

    expect(useAppStore.getState().mobileSidebarOpen).toBe(false);
    fireEvent.click(orangeToggleBtn);
    expect(useAppStore.getState().mobileSidebarOpen).toBe(true);

    fireEvent.click(orangeToggleBtn);
    expect(useAppStore.getState().mobileSidebarOpen).toBe(false);
  });

  it('4. TopHeader orange toggle button toggles desktop sidebarCollapsed on desktop (>=768px)', () => {
    vi.stubGlobal('innerWidth', 1024);

    render(<TopHeader />);
    const orangeToggleBtn = screen.getByRole('button', { name: /Toggle Navigation/i });

    expect(useAppStore.getState().sidebarCollapsed).toBe(false);
    fireEvent.click(orangeToggleBtn);
    expect(useAppStore.getState().sidebarCollapsed).toBe(true);
  });

  it('5. When mobileSidebarOpen is true, mobile drawer renders with close button and navigation links', () => {
    useAppStore.setState({ mobileSidebarOpen: true });
    render(<Sidebar />);

    const drawerDialog = screen.getByRole('dialog', { name: /Mobile Navigation Drawer/i });
    expect(drawerDialog).toBeTruthy();

    // Close button X is available
    const closeBtn = screen.getByRole('button', { name: /Close Navigation/i });
    expect(closeBtn).toBeTruthy();

    // Clicking close button dismisses drawer
    fireEvent.click(closeBtn);
    expect(useAppStore.getState().mobileSidebarOpen).toBe(false);
  });

  it('6. Clicking a navigation item inside the mobile drawer switches view and closes the drawer', () => {
    useAppStore.setState({ mobileSidebarOpen: true });
    render(<Sidebar />);

    // IT user has "Job Logs" button
    const jobLogButtons = screen.getAllByRole('button', { name: /Job Logs/i });
    // One in desktop sidebar (hidden by CSS) and one in mobile drawer
    const drawerJobLogBtn = jobLogButtons[jobLogButtons.length - 1];

    fireEvent.click(drawerJobLogBtn);
    expect(useAppStore.getState().activeView).toBe('joblogs');
    expect(useAppStore.getState().mobileSidebarOpen).toBe(false);
  });

  it('7. Pressing Escape key closes the open mobile drawer', () => {
    useAppStore.setState({ mobileSidebarOpen: true });
    render(<Sidebar />);

    expect(useAppStore.getState().mobileSidebarOpen).toBe(true);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useAppStore.getState().mobileSidebarOpen).toBe(false);
  });

  it('8. Resizing viewport to desktop width (>=768px) automatically dismisses mobile drawer', () => {
    useAppStore.setState({ mobileSidebarOpen: true });
    render(<Sidebar />);

    expect(useAppStore.getState().mobileSidebarOpen).toBe(true);
    vi.stubGlobal('innerWidth', 1024);
    fireEvent(window, new Event('resize'));
    expect(useAppStore.getState().mobileSidebarOpen).toBe(false);
  });
});
