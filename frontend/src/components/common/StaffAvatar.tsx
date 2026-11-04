// @spec F-02: Universal Staff Avatar with Deterministic Initials Fallback
import React, { useState, useEffect } from 'react';

export interface StaffAvatarProps {
  name?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  roleBadge?: string;
}

export function computeInitials(name?: string | null, username?: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length > 0) {
      return parts[0][0].toUpperCase();
    }
  }

  if (username && username.trim()) {
    return username.trim()[0].toUpperCase();
  }

  return '?';
}

const SIZE_CLASSES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
};

export const StaffAvatar: React.FC<StaffAvatarProps> = ({
  name,
  username,
  avatarUrl,
  size = 'md',
  className = '',
}) => {
  const [hasImageError, setHasImageError] = useState(false);
  const initials = computeInitials(name, username);
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  // Reset error flag if a new avatarUrl is provided
  useEffect(() => {
    setHasImageError(false);
  }, [avatarUrl]);

  const showImage = Boolean(avatarUrl && !hasImageError);

  if (showImage && avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || username || 'Staff Avatar'}
        onError={() => setHasImageError(true)}
        className={`${sizeClass} rounded-full object-cover border border-[#ECEEF2] bg-zinc-100 shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      aria-label={name || username || 'Staff Avatar'}
      className={`${sizeClass} rounded-full bg-zinc-900 text-white font-bold flex items-center justify-center shrink-0 border border-zinc-700/50 select-none shadow-sm ${className}`}
    >
      <span>{initials}</span>
    </div>
  );
};
