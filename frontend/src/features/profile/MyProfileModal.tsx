// @spec F-02: Staff Profile Modal with Photo Upload, Initials Fallback & Object URL Revocation
import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Trash2, Loader2, AlertCircle, CheckCircle2, User } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { StaffAvatar } from '../../components/common/StaffAvatar';
import { usersApi } from '../../api/client';
import { normalizeApiError } from '../../utils/errorUtils';

export interface MyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MiB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

export const MyProfileModal: React.FC<MyProfileModalProps> = ({ isOpen, onClose }) => {
  const currentUser = useAppStore((state) => state.currentUser);
  const setCurrentUser = useAppStore((state) => state.setCurrentUser);
  const addToast = useAppStore((state) => state.addToast);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  // Keep previewUrlRef in sync for cleanup
  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrlRef.current && previewUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting]);

  if (!isOpen || !currentUser) return null;

  const handleClose = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSelectedFile(null);
    setErrorMsg(null);
    setSuccessMsg(null);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrorMsg('Invalid image format. Allowed formats: PNG, JPG, JPEG, WebP.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrorMsg('File exceeds 2 MiB limit. Please choose a smaller image.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(objectUrl);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await usersApi.uploadSelfPhoto(selectedFile);
      const newAvatarUrl = res.avatar_url;

      if (currentUser) {
        setCurrentUser({
          ...currentUser,
          avatarUrl: newAvatarUrl,
        });

        // Also reflect immediately in IT Team Roster
        useAppStore.setState((state) => ({
          itTeamMembers: state.itTeamMembers.map((m) =>
            m.id === currentUser.id || m.email.toLowerCase() === currentUser.email.toLowerCase()
              ? { ...m, avatar: newAvatarUrl }
              : m
          ),
        }));
      }

      setSuccessMsg('Profile photo updated successfully.');
      addToast('Profile Updated', 'Your profile photo has been saved.', 'success');

      // Clear local file state and use saved URL
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      const msg = normalizeApiError(err, 'Failed to upload profile photo. Please try again.');
      setErrorMsg(msg);
      // Retain draft/preview so user can retry or adjust
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemovePhoto = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await usersApi.removeSelfPhoto();

      if (currentUser) {
        setCurrentUser({
          ...currentUser,
          avatarUrl: null,
        });

        // Revert in IT Team Roster
        useAppStore.setState((state) => ({
          itTeamMembers: state.itTeamMembers.map((m) =>
            m.id === currentUser.id || m.email.toLowerCase() === currentUser.email.toLowerCase()
              ? {
                  ...m,
                  avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                    m.username || currentUser.username || 'staff'
                  )}&backgroundColor=${m.systemRole === 'admin' ? 'fed7aa' : 'b6e3f4'}`,
                }
              : m
          ),
        }));
      }

      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      setSuccessMsg('Profile photo removed.');
      addToast('Photo Removed', 'Reverted to your staff initials.', 'info');
    } catch (err) {
      const msg = normalizeApiError(err, 'Failed to remove photo.');
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentDisplayAvatarUrl = previewUrl || currentUser.avatarUrl || null;
  const username = currentUser.username || currentUser.email.split('@')[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="my-profile-modal-title"
    >
      <div
        className="fixed inset-0"
        onClick={() => !isSubmitting && handleClose()}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md bg-surface border border-line rounded-3xl shadow-2xl overflow-hidden my-auto animate-scale-up">
        {/* Header */}
        <div className="px-6 py-5 bg-canvas border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center">
              <User className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <h3 id="my-profile-modal-title" className="text-sm font-bold text-ink">
                My Staff Profile
              </h3>
              <p className="text-[11px] text-ink-subtle">
                Personal details and photo management
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-xl bg-surface border border-line text-ink-subtle hover:text-ink press-fx disabled:opacity-50"
            aria-label="Close profile modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Feedback Messages */}
          {errorMsg && (
            <div
              role="alert"
              className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 animate-shake"
            >
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              role="status"
              className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Avatar & Photo Actions */}
          <div className="flex items-center gap-4 p-4 bg-canvas rounded-2xl border border-line">
            <StaffAvatar
              name={currentUser.name}
              username={username}
              avatarUrl={currentDisplayAvatarUrl}
              size="xl"
              className="shadow-sm ring-2 ring-white"
            />
            <div className="space-y-2 flex-1 min-w-0">
              <div className="text-xs font-semibold text-ink">
                Profile Photo
              </div>
              <p className="text-[11px] text-ink-subtle">
                PNG, JPG, WebP up to 2 MiB.
              </p>

              <input
                ref={fileInputRef}
                id="profile-photo-input"
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp"
                onChange={handleFileChange}
                disabled={isSubmitting}
                className="hidden"
                aria-label="Upload profile photo file"
              />

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                  className="py-1.5 px-3 rounded-lg bg-surface border border-line text-ink hover:bg-zinc-100 text-xs font-semibold inline-flex items-center gap-1.5 press-fx disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5 text-orange-500" />
                  <span>{currentDisplayAvatarUrl ? 'Replace' : 'Upload'}</span>
                </button>

                {selectedFile && (
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={isSubmitting}
                    className="py-1.5 px-3 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-semibold inline-flex items-center gap-1.5 press-fx disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>Save</span>
                    )}
                  </button>
                )}

                {currentUser.avatarUrl && !selectedFile && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={isSubmitting}
                    className="py-1.5 px-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold inline-flex items-center gap-1 press-fx disabled:opacity-50"
                    title="Remove custom photo and use initials"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Account Details */}
          <div className="space-y-3 bg-canvas p-4 rounded-2xl border border-line">
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-subtle">Full Name</span>
              <span className="font-bold text-ink">{currentUser.name}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-subtle">Username</span>
              <span className="font-mono text-zinc-700">@{username}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-subtle">Email Address</span>
              <span className="font-medium text-ink">{currentUser.email}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-subtle">Assigned Role</span>
              <span className="px-2 py-0.5 rounded-full bg-surface border border-line text-[10px] font-bold uppercase tracking-wider text-ink">
                {currentUser.role}
              </span>
            </div>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold transition-colors press-fx"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
