// @spec F-02: Staff Profiles, Initials Fallback, and Photo Upload Tests
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { StaffAvatar, computeInitials } from '../src/components/common/StaffAvatar';
import { MyProfileModal } from '../src/features/profile/MyProfileModal';
import { useAppStore } from '../src/store/useAppStore';

describe('F-02: Staff Profiles with Initials or Uploaded Photos', () => {
  let revokeSpy: ReturnType<typeof vi.fn>;
  let createSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();

    // Mock JSDOM window.URL methods
    revokeSpy = vi.fn();
    createSpy = vi.fn().mockReturnValue('blob:http://localhost/test-uuid');
    window.URL.revokeObjectURL = revokeSpy;
    window.URL.createObjectURL = createSpy;
  });

  afterEach(() => {
    cleanup();
  });

  describe('1. Initials Computation Logic', () => {
    it('computes two initials from two-word full name', () => {
      expect(computeInitials('Jefferson Lopez')).toBe('JL');
      expect(computeInitials('Maria Santos')).toBe('MS');
      expect(computeInitials('Juan Dela Cruz')).toBe('JD');
    });

    it('computes single initial from single-word name', () => {
      expect(computeInitials('Jefferson')).toBe('J');
    });

    it('falls back to username initial when name is missing or blank', () => {
      expect(computeInitials('', 'technician')).toBe('T');
      expect(computeInitials('   ', 'admin')).toBe('A');
      expect(computeInitials(null, 'supervisor')).toBe('S');
    });

    it('returns question mark when both name and username are absent', () => {
      expect(computeInitials(null, null)).toBe('?');
      expect(computeInitials('', '')).toBe('?');
    });
  });

  describe('2. StaffAvatar Fallback Renderer', () => {
    it('renders text initials by default without external image generator', () => {
      render(<StaffAvatar name="Jefferson Lopez" username="jeff" />);
      expect(screen.getByText('JL')).toBeDefined();
      expect(screen.queryByRole('img')).toBeNull();
    });

    it('renders image when avatarUrl is valid', () => {
      render(
        <StaffAvatar
          name="Jefferson Lopez"
          username="jeff"
          avatarUrl="https://example.com/avatar.png"
        />
      );
      const img = screen.getByRole('img');
      expect(img).toBeDefined();
      expect(img.getAttribute('src')).toBe('https://example.com/avatar.png');
    });

    it('falls back to text initials when image fails to load without infinite loop', () => {
      render(
        <StaffAvatar
          name="Jefferson Lopez"
          username="jeff"
          avatarUrl="https://example.com/broken.png"
        />
      );

      const img = screen.getByRole('img');
      fireEvent.error(img);

      // Image should be removed and text initials rendered
      expect(screen.getByText('JL')).toBeDefined();
      expect(screen.queryByRole('img')).toBeNull();
    });
  });

  describe('3. MyProfileModal Client-Side Size & Format Validation', () => {
    it('rejects files larger than 2 MiB with an accessible error banner', () => {
      useAppStore.setState({
        currentUser: {
          id: 'usr-1',
          name: 'Jefferson Lopez',
          email: 'jlopez@fivestar.com.ph',
          role: 'it',
          title: 'IT Support',
          avatar: 'JL',
        },
      });

      render(<MyProfileModal isOpen={true} onClose={vi.fn()} />);

      // Create a mock 3 MiB file (3 * 1024 * 1024 bytes)
      const oversizedFile = new File(['x'.repeat(1024)], 'large.png', { type: 'image/png' });
      Object.defineProperty(oversizedFile, 'size', { value: 3 * 1024 * 1024 });

      const fileInput = screen.getByLabelText(/upload profile photo file/i);
      fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText(/exceeds 2 MiB limit/i)).toBeDefined();
    });

    it('rejects unsupported file formats', () => {
      useAppStore.setState({
        currentUser: {
          id: 'usr-1',
          name: 'Jefferson Lopez',
          email: 'jlopez@fivestar.com.ph',
          role: 'it',
          title: 'IT Support',
          avatar: 'JL',
        },
      });

      render(<MyProfileModal isOpen={true} onClose={vi.fn()} />);

      const invalidFile = new File(['dummy'], 'document.pdf', { type: 'application/pdf' });
      const fileInput = screen.getByLabelText(/upload profile photo file/i);
      fireEvent.change(fileInput, { target: { files: [invalidFile] } });

      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText(/invalid image format/i)).toBeDefined();
    });

    it('revokes object URLs on modal close to prevent memory leaks', () => {
      useAppStore.setState({
        currentUser: {
          id: 'usr-1',
          name: 'Jefferson Lopez',
          email: 'jlopez@fivestar.com.ph',
          role: 'it',
          title: 'IT Support',
          avatar: 'JL',
        },
      });

      const { unmount } = render(<MyProfileModal isOpen={true} onClose={vi.fn()} />);

      const validFile = new File(['valid'], 'avatar.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByLabelText(/upload profile photo file/i);
      fireEvent.change(fileInput, { target: { files: [validFile] } });

      unmount();

      expect(revokeSpy).toHaveBeenCalledWith('blob:http://localhost/test-uuid');
    });
  });
});
