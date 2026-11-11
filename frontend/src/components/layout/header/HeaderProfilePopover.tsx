function getCleanRoleTitle(role?: string): string {
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'supervisor':
      return 'Supervisor';
    case 'intern':
      return 'IT Intern';
    case 'it':
    default:
      return 'IT Support';
  }
}
// @spec F-02: Header Profile Popover with Deterministic Initials & Self-Photo Profile Modal
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, LogOut, User } from 'lucide-react';
import type { AuthenticatedUser } from '../../../store/useAppStore';
import { StaffAvatar } from '../../common/StaffAvatar';
import { MyProfileModal } from '../../../features/profile/MyProfileModal';

export interface HeaderProfilePopoverProps {
  currentUser: AuthenticatedUser | null;
  onSignOut: () => void;
}

export const HeaderProfilePopover: React.FC<HeaderProfilePopoverProps> = ({
  currentUser,
  onSignOut,
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProfileOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const username = currentUser?.username || (currentUser?.email ? currentUser.email.split('@')[0] : '');
  const canManagePhoto = currentUser && currentUser.role !== 'intern';

  return (
    <>
      <div className="relative" ref={profileRef}>
        <button
          type="button"
          onClick={() => setProfileOpen(!profileOpen)}
          className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-zinc-100 active:scale-95 transition-all text-left"
          title="User Profile & Sign Out"
          aria-label="User Profile"
        >
          <StaffAvatar
            name={currentUser?.name}
            username={username}
            avatarUrl={currentUser?.avatarUrl}
            size="sm"
            className="border-orange-200"
          />
          <div className="hidden sm:block leading-tight">
            <p className="text-xs font-bold text-ink">
              {currentUser?.name || 'Staff User'}
            </p>
            <p className="text-[11px] text-zinc-500">
              {getCleanRoleTitle(currentUser?.role)}
            </p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 hidden sm:block" />
        </button>

        {profileOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-2xl border border-zinc-200/90 p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center gap-3 pb-3 border-b border-zinc-100">
              <StaffAvatar
                name={currentUser?.name}
                username={username}
                avatarUrl={currentUser?.avatarUrl}
                size="md"
                className="border-orange-200"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-ink truncate">
                  {currentUser?.name || 'Staff User'}
                </p>
                <p className="text-[11px] text-zinc-500 truncate">
                  {currentUser?.email || (username ? `@${username}` : '')}
                </p>
                <span className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 uppercase tracking-wider">
                  {getCleanRoleTitle(currentUser?.role)}
                </span>
              </div>
            </div>

            <div className="py-2 space-y-1">
              {canManagePhoto && (
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    setIsProfileModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2 py-2 px-2.5 rounded-xl hover:bg-zinc-100 text-ink text-xs font-semibold transition-colors press-fx text-left"
                >
                  <User className="w-3.5 h-3.5 text-orange-500" />
                  <span>My Profile</span>
                </button>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  onSignOut();
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors press-fx"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out to Employee Kiosk</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {isProfileModalOpen && (
        <MyProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}
    </>
  );
};
