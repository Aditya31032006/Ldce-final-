import React, { useState, useEffect, useRef } from 'react';
import useAuth from '../hook/useAuth.js';
import authApi from '../services/auth.api.js';
import clubsApi from '../../clubs/services/clubs.api.js';
import hrApi from '../../hr/services/hr.api.js';
import { useToast } from '../../../shared/context/ToastContext.jsx';
import { fileToBase64, urlToBase64 } from '../../../shared/utils/image.util.js';

export default function Profile() {
  const { user, role, clubId, logout, updateUserLocal } = useAuth();
  const { toast } = useToast();

  const isOwner = (role || '').toLowerCase() === 'owner';

  // Navigation tab for Owner: 'profile' | 'staff' | 'gallery'
  const [activeTab, setActiveTab] = useState('profile');

  // --- Avatar States ---
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarInputUrl, setAvatarInputUrl] = useState('');
  const fileInputRef = useRef(null);

  // --- Password Management States (OAuth vs Direct Login) ---
  const hasPassword = Boolean(user?.has_password);
  const [showSetPasswordModal, setShowSetPasswordModal] = useState(false);
  const [isSetPasswordLoading, setIsSetPasswordLoading] = useState(false);
  const [setPasswordError, setSetPasswordError] = useState('');

  // --- Change Password States (Requires Old Password, No OTP) ---
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changePasswordError, setChangePasswordError] = useState('');


  // --- Club Gallery States (Owner Only) ---
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [newGalleryFiles, setNewGalleryFiles] = useState([]);
  const [galleryCaption, setGalleryCaption] = useState('');
  const [galleryUrlInput, setGalleryUrlInput] = useState('');
  const galleryFileInputRef = useRef(null);

  // --- Staff Management States (Owner Only) ---
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffEmail, setStaffEmail] = useState('');
  const [staffRole, setStaffRole] = useState('front_desk');
  const [addStaffSubmitting, setAddStaffSubmitting] = useState(false);

  // Load Gallery and Staff for Owner
  useEffect(() => {
    if (isOwner && clubId) {
      loadGallery();
      loadStaff();
    }
  }, [isOwner, clubId]);

  const loadGallery = async () => {
    setGalleryLoading(true);
    try {
      const res = await clubsApi.getClubGallery(clubId);
      setGalleryImages(res.gallery || []);
    } catch (err) {
      console.warn('Could not load gallery:', err.message);
    } finally {
      setGalleryLoading(false);
    }
  };

  const loadStaff = async () => {
    setStaffLoading(true);
    try {
      const res = await hrApi.getStaff();
      setStaffList(res.staff || []);
    } catch (err) {
      console.warn('Could not load staff list:', err.message);
    } finally {
      setStaffLoading(false);
    }
  };

  // --- Avatar Handlers ---
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, WebP)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    setAvatarLoading(true);
    try {
      const base64Data = await fileToBase64(file, 600, 600, 0.85);
      setAvatarPreview(base64Data);

      // Auto-save immediately to database
      const res = await authApi.updateAvatar(base64Data);
      updateUserData(res.user);
      toast.success('Profile picture updated successfully!');
      setShowAvatarModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || err.customMessage || 'Failed to save profile picture');
    } finally {
      setAvatarLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleUrlPreview = async () => {
    if (!avatarInputUrl.trim()) return;
    setAvatarLoading(true);
    try {
      const base64Data = await urlToBase64(avatarInputUrl.trim(), 800, 800, 0.85);
      setAvatarPreview(base64Data);
    } catch (err) {
      toast.error('Failed to convert image URL to Base64');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleSaveAvatar = async () => {
    const base64ToSave = avatarPreview || avatarInputUrl.trim();
    if (!base64ToSave) {
      toast.error('Please select an image file or provide a URL first');
      return;
    }

    setAvatarLoading(true);
    try {
      // Ensure it is a Base64 data URL
      const finalBase64 = await urlToBase64(base64ToSave, 800, 800, 0.85);
      const res = await authApi.updateAvatar(finalBase64);
      
      // Update Redux state immediately
      updateUserData(res.user);
      
      toast.success('Profile picture saved successfully in Base64!');
      setShowAvatarModal(false);
      setAvatarPreview('');
      setAvatarInputUrl('');
    } catch (err) {
      toast.error(err.response?.data?.message || err.customMessage || 'Failed to save profile picture');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!window.confirm('Are you sure you want to remove your profile picture?')) return;
    setAvatarLoading(true);
    try {
      const res = await authApi.deleteAvatar();
      updateUserData(res.user);
      toast.success('Profile picture removed successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || err.customMessage || 'Failed to remove profile picture');
    } finally {
      setAvatarLoading(false);
    }
  };

  const updateUserData = (updatedUser) => {
    if (updatedUser) {
      updateUserLocal({ user: updatedUser });
    }
  };

  // --- Change Password Handler (Requires Old Password) ---
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangePasswordError('');

    if (!oldPassword.trim()) {
      setChangePasswordError('Please enter your current password');
      return;
    }
    if (newPassword.length < 6) {
      setChangePasswordError('New password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangePasswordError('New passwords do not match');
      return;
    }
    if (oldPassword === newPassword) {
      setChangePasswordError('New password cannot be the same as current password');
      return;
    }

    setChangePasswordLoading(true);
    try {
      const res = await authApi.changePassword({
        oldPassword,
        newPassword,
      });
      toast.success(res.message || 'Password changed successfully!');
      setShowChangePasswordModal(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setChangePasswordError('');
      if (res.user) {
        updateUserData(res.user);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.customMessage || 'Failed to change password';
      setChangePasswordError(msg);
      toast.error(msg);
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setSetPasswordError('');
    if (newPassword.length < 6) {
      setSetPasswordError('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setSetPasswordError('Passwords do not match');
      return;
    }

    setIsSetPasswordLoading(true);
    try {
      const res = await authApi.setPassword(newPassword);
      updateUserData(res.user || { ...user, has_password: true });
      toast.success('Password created successfully! You can now log in with email & password.');
      setShowSetPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const msg = err.response?.data?.message || err.customMessage || 'Failed to create password';
      setSetPasswordError(msg);
      toast.error(msg);
    } finally {
      setIsSetPasswordLoading(false);
    }
  };


  // --- Gallery Handlers (Owner Only) ---
  const handleGalleryFilesChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const validFiles = files.filter(f => f.type.startsWith('image/'));
    if (validFiles.length < files.length) {
      toast.warning('Some non-image files were skipped');
    }

    setGalleryLoading(true);
    try {
      const base64Promises = validFiles.map(file => fileToBase64(file, 1600, 1200, 0.85));
      const base64Images = await Promise.all(base64Promises);
      setNewGalleryFiles(prev => [...prev, ...base64Images]);
      toast.info(`Converted ${base64Images.length} image(s) to Base64 format`);
    } catch (err) {
      toast.error('Failed to convert images to Base64');
    } finally {
      setGalleryLoading(false);
    }
  };

  const handleAddGalleryImages = async () => {
    let imagesToUpload = [...newGalleryFiles];
    if (galleryUrlInput.trim()) {
      try {
        const base64FromUrl = await urlToBase64(galleryUrlInput.trim(), 1600, 1200, 0.85);
        imagesToUpload.push(base64FromUrl);
      } catch (e) {
        imagesToUpload.push(galleryUrlInput.trim());
      }
    }

    if (!imagesToUpload.length) {
      toast.error('Please choose image files or enter an image URL to add');
      return;
    }

    setGalleryLoading(true);
    try {
      const payload = {
        images: imagesToUpload.map((base64Url, idx) => ({
          image_url: base64Url,
          caption: galleryCaption.trim() || undefined,
          sort_order: (galleryImages.length || 0) + idx,
        })),
      };

      await clubsApi.addClubGallery(payload);
      toast.success(`${imagesToUpload.length} Base64 photo(s) added to club gallery!`);
      setNewGalleryFiles([]);
      setGalleryCaption('');
      setGalleryUrlInput('');
      if (galleryFileInputRef.current) galleryFileInputRef.current.value = '';
      loadGallery();
    } catch (err) {
      toast.error(err.response?.data?.message || err.customMessage || 'Failed to add gallery photos');
    } finally {
      setGalleryLoading(false);
    }
  };

  const handleDeleteGalleryImage = async (imageId) => {
    if (!window.confirm('Delete this photo from the club gallery?')) return;
    setGalleryLoading(true);
    try {
      await clubsApi.deleteClubGallery(imageId);
      toast.success('Gallery photo removed successfully');
      setGalleryImages(prev => prev.filter(img => img.id !== imageId));
    } catch (err) {
      toast.error(err.response?.data?.message || err.customMessage || 'Failed to delete photo');
    } finally {
      setGalleryLoading(false);
    }
  };

  // --- Staff Handlers (Owner Only) ---
  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!staffEmail.trim()) {
      toast.error('Please enter the customer email address');
      return;
    }

    setAddStaffSubmitting(true);
    try {
      const res = await hrApi.addStaff({
        email: staffEmail.trim(),
        role: staffRole,
      });
      toast.success(res.message || 'Staff member assigned successfully!');
      setStaffEmail('');
      loadStaff();
    } catch (err) {
      const msg = err.response?.data?.message || err.customMessage || 'Could not assign staff member';
      toast.error(msg);
    } finally {
      setAddStaffSubmitting(false);
    }
  };

  const handleRemoveStaff = async (staffUserId, staffName) => {
    if (!window.confirm(`Are you sure you want to remove ${staffName || 'this staff member'}?`)) return;
    try {
      await hrApi.removeStaff(staffUserId);
      toast.success('Staff member removed successfully');
      setStaffList(prev => prev.filter(s => s.user_id !== staffUserId));
    } catch (err) {
      toast.error(err.response?.data?.message || err.customMessage || 'Failed to remove staff member');
    }
  };

  return (
    <div className="df-page-wrapper" style={{ padding: '2rem 1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
          Account & Club Settings
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
          Manage your personal profile, credentials, and club operational controls
        </p>
      </div>

      {/* Navigation Tabs (Owner gets quick access to Staff and Gallery) */}
      {isOwner && (
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '2rem',
          overflowX: 'auto',
          paddingBottom: '0.25rem',
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            style={{
              padding: '0.65rem 1.25rem',
              fontWeight: 600,
              fontSize: '0.9rem',
              color: activeTab === 'profile' ? '#2563eb' : '#64748b',
              background: activeTab === 'profile' ? '#eff6ff' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'profile' ? '2px solid #2563eb' : '2px solid transparent',
              borderRadius: '0.375rem 0.375rem 0 0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            👤 My Profile & Security
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            style={{
              padding: '0.65rem 1.25rem',
              fontWeight: 600,
              fontSize: '0.9rem',
              color: activeTab === 'staff' ? '#2563eb' : '#64748b',
              background: activeTab === 'staff' ? '#eff6ff' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'staff' ? '2px solid #2563eb' : '2px solid transparent',
              borderRadius: '0.375rem 0.375rem 0 0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            👥 Club Staff Members ({staffList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gallery')}
            style={{
              padding: '0.65rem 1.25rem',
              fontWeight: 600,
              fontSize: '0.9rem',
              color: activeTab === 'gallery' ? '#2563eb' : '#64748b',
              background: activeTab === 'gallery' ? '#eff6ff' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'gallery' ? '2px solid #2563eb' : '2px solid transparent',
              borderRadius: '0.375rem 0.375rem 0 0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            🖼️ Club Photo Gallery ({galleryImages.length})
          </button>
        </div>
      )}

      {/* =========================================================
          TAB 1: USER PROFILE & SECURITY
         ========================================================= */}
      {(!isOwner || activeTab === 'profile') && (
        <div style={{
          background: '#ffffff',
          borderRadius: '0.85rem',
          border: '1px solid #e2e8f0',
          padding: '2rem',
          maxWidth: '640px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          {/* Avatar & Header */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '1.75rem' }}>
            
            {/* Hidden Direct File Input for Instant 1-Click Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            <div 
              style={{ position: 'relative', marginBottom: '1rem', cursor: 'pointer' }}
              onClick={() => fileInputRef.current?.click()}
              title="Click to choose a photo from your device"
            >
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user?.full_name || 'Profile'}
                  style={{
                    width: '108px',
                    height: '108px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid #3b82f6',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div style={{
                  width: '108px',
                  height: '108px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.5rem',
                  fontWeight: 700,
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                }}>
                  {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
                </div>
              )}

              {/* Camera Icon Overlay */}
              <div style={{
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                background: '#2563eb',
                color: '#ffffff',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
                border: '2px solid #ffffff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}>
                📷
              </div>
            </div>

            {/* Photo Action Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarLoading}
                style={{
                  padding: '0.45rem 1rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#2563eb',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                {avatarLoading ? 'Uploading Base64...' : '📷 Upload Photo'}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setAvatarPreview('');
                  setAvatarInputUrl('');
                  setShowAvatarModal(true);
                }}
                disabled={avatarLoading}
                style={{
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#475569',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                }}
              >
                🌐 Paste URL
              </button>

              {user?.avatar_url && (
                <button
                  type="button"
                  onClick={handleDeleteAvatar}
                  disabled={avatarLoading}
                  style={{
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#ef4444',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                  }}
                >
                  ✕ Remove
                </button>
              )}
            </div>

            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.25rem 0' }}>
              {user?.full_name || 'Sports Enthusiast'}
            </h2>
            <span style={{
              display: 'inline-block',
              padding: '0.2rem 0.75rem',
              background: '#e0f2fe',
              color: '#0284c7',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {role || 'Public User'}
            </span>
          </div>

          {/* User Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #f1f5f9' }}>
              <label style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Email Address</label>
              <div style={{ fontSize: '0.875rem', color: '#0f172a', marginTop: '0.2rem', fontWeight: 600, wordBreak: 'break-all' }}>
                {user?.email || 'N/A'}
              </div>
            </div>
            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #f1f5f9' }}>
              <label style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Phone</label>
              <div style={{ fontSize: '0.875rem', color: '#0f172a', marginTop: '0.2rem', fontWeight: 600 }}>
                {user?.phone || 'Not provided'}
              </div>
            </div>
            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #f1f5f9' }}>
              <label style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Active Club ID</label>
              <div style={{ fontSize: '0.8rem', color: '#0f172a', marginTop: '0.2rem', fontWeight: 600, wordBreak: 'break-all' }}>
                {clubId || 'None'}
              </div>
            </div>
            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #f1f5f9' }}>
              <label style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Account ID</label>
              <div style={{ fontSize: '0.8rem', color: '#0f172a', marginTop: '0.2rem', fontWeight: 600, wordBreak: 'break-all' }}>
                {user?.id ? `${user.id.slice(0, 8)}...` : 'N/A'}
              </div>
            </div>
          </div>

          {/* =========================================================
              PROMINENT SECURITY & PASSWORD SECTION
             ========================================================= */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            marginBottom: '1.5rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.2rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  🔐 Security & Password
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                  {hasPassword
                    ? 'Your account has a secure local password configured.'
                    : 'Registered via Google OAuth. Add a local password to enable direct email & password sign-in.'}
                </p>
              </div>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.25rem 0.65rem',
                borderRadius: '9999px',
                background: hasPassword ? '#dcfce7' : '#e0f2fe',
                color: hasPassword ? '#15803d' : '#0369a1',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}>
                {hasPassword ? '✓ Password Set' : 'OAuth (No Password)'}
              </span>
            </div>

            {/* Conditional Password Action: Only Add New Password if OAuth without password; else Change Password */}
            {!hasPassword ? (
              <button
                type="button"
                onClick={() => {
                  setShowSetPasswordModal(true);
                  setNewPassword('');
                  setConfirmPassword('');
                  setSetPasswordError('');
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem 1.25rem',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
                }}
              >
                🔑 Add New Password
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowChangePasswordModal(true);
                  setOldPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setChangePasswordError('');
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem 1.25rem',
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                🔒 Change Password
              </button>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '1.25rem 0' }} />

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={logout}
            style={{
              width: '100%',
              padding: '0.65rem 1rem',
              background: '#fef2f2',
              color: '#ef4444',
              border: '1px solid #fecaca',
              borderRadius: '0.5rem',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </div>
      )}

      {/* =========================================================
          TAB 2: CLUB STAFF MEMBERS (Owner Only)
         ========================================================= */}
      {isOwner && activeTab === 'staff' && (
        <div style={{
          background: '#ffffff',
          borderRadius: '0.85rem',
          border: '1px solid #e2e8f0',
          padding: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.25rem 0' }}>
                Add & Manage Club Staff
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                Promote an existing registered customer to club staff by entering their email address.
              </p>
            </div>
            <span style={{
              padding: '0.25rem 0.6rem',
              background: '#fef3c7',
              color: '#b45309',
              borderRadius: '0.375rem',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}>
              OWNER ONLY
            </span>
          </div>

          {/* Form to Add Staff Member */}
          <form onSubmit={handleAddStaff} style={{
            background: '#f8fafc',
            padding: '1.5rem',
            borderRadius: '0.6rem',
            border: '1px solid #e2e8f0',
            marginBottom: '2rem',
          }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1rem 0' }}>
              + Add New Staff Member
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                  Customer Registered Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. member@gmail.com"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    fontSize: '0.9rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                  Assign Role
                </label>
                <select
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    fontSize: '0.9rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                  }}
                >
                  <option value="manager">Manager (Operations Admin)</option>
                  <option value="front_desk">Front Desk (Check-in & Bookings)</option>
                  <option value="bar_staff">Bar & Cafe Staff</option>
                  <option value="kitchen">Kitchen Staff</option>
                  <option value="shop_staff">Pro Shop Staff</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={addStaffSubmitting || !staffEmail.trim()}
              style={{
                padding: '0.65rem 1.5rem',
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.375rem',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: (addStaffSubmitting || !staffEmail.trim()) ? 'not-allowed' : 'pointer',
                opacity: (addStaffSubmitting || !staffEmail.trim()) ? 0.6 : 1,
              }}
            >
              {addStaffSubmitting ? 'Assigning Role...' : '+ Assign Staff Member'}
            </button>
          </form>

          {/* Current Staff Members Table */}
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.85rem' }}>
              Current Staff Roster ({staffList.length})
            </h4>

            {staffLoading ? (
              <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Loading staff members...</p>
            ) : staffList.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                No staff members assigned yet. Use the form above to add an existing customer as staff.
              </p>
            ) : (
              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Staff Name</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Email Address</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Assigned Role</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.map((member) => (
                      <tr key={member.user_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0f172a' }}>
                          {member.full_name || 'Staff User'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                          {member.email}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{
                            padding: '0.2rem 0.6rem',
                            background: member.role === 'owner' ? '#fee2e2' : '#e0f2fe',
                            color: member.role === 'owner' ? '#991b1b' : '#0369a1',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                          }}>
                            {member.role}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          {member.role !== 'owner' && member.user_id !== user?.id && (
                            <button
                              type="button"
                              onClick={() => handleRemoveStaff(member.user_id, member.full_name)}
                              style={{
                                padding: '0.3rem 0.75rem',
                                background: '#fef2f2',
                                color: '#ef4444',
                                border: '1px solid #fecaca',
                                borderRadius: '0.25rem',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Remove Staff
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 3: CLUB SHOWCASE GALLERY (Owner Only)
         ========================================================= */}
      {isOwner && activeTab === 'gallery' && (
        <div style={{
          background: '#ffffff',
          borderRadius: '0.85rem',
          border: '1px solid #e2e8f0',
          padding: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.25rem 0' }}>
                Club Showcase Photos & Gallery
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                Upload multiple photos to showcase your facility, courts, and cafe.
              </p>
            </div>
            <span style={{
              padding: '0.25rem 0.6rem',
              background: '#fef3c7',
              color: '#b45309',
              borderRadius: '0.375rem',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}>
              OWNER ONLY
            </span>
          </div>

          {/* Upload Box */}
          <div style={{
            background: '#f8fafc',
            padding: '1.5rem',
            borderRadius: '0.6rem',
            border: '1px solid #e2e8f0',
            marginBottom: '2rem',
          }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1rem 0' }}>
              + Upload Multiple Base64 Pictures
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                  Select Photos from Computer
                </label>
                <input
                  ref={galleryFileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleGalleryFilesChange}
                  style={{ fontSize: '0.85rem', color: '#334155' }}
                />
                {newGalleryFiles.length > 0 && (
                  <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600, display: 'block', marginTop: '0.35rem' }}>
                    ✓ {newGalleryFiles.length} photo(s) selected and encoded in Base64
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                  Or Add Image Web URL (Converts to Base64)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={galleryUrlInput}
                  onChange={(e) => setGalleryUrlInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    fontSize: '0.85rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                  Caption (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Center Tennis Court, Evening View"
                  value={galleryCaption}
                  onChange={(e) => setGalleryCaption(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    fontSize: '0.85rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                  }}
                />
              </div>

              <button
                type="button"
                onClick={handleAddGalleryImages}
                disabled={galleryLoading || (newGalleryFiles.length === 0 && !galleryUrlInput.trim())}
                style={{
                  alignSelf: 'flex-start',
                  padding: '0.65rem 1.5rem',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: (galleryLoading || (newGalleryFiles.length === 0 && !galleryUrlInput.trim())) ? 'not-allowed' : 'pointer',
                  opacity: (galleryLoading || (newGalleryFiles.length === 0 && !galleryUrlInput.trim())) ? 0.6 : 1,
                }}
              >
                {galleryLoading ? 'Processing & Uploading...' : '+ Save Photos to Gallery'}
              </button>
            </div>
          </div>

          {/* Photos Grid */}
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>
              Uploaded Photos ({galleryImages.length})
            </h4>

            {galleryLoading && galleryImages.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Loading gallery photos...</p>
            ) : galleryImages.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '0.5rem', textAlign: 'center' }}>
                No photos in club gallery yet. Use the upload box above to add pictures!
              </p>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: '1rem',
              }}>
                {galleryImages.map((img) => (
                  <div
                    key={img.id}
                    style={{
                      position: 'relative',
                      borderRadius: '0.5rem',
                      overflow: 'hidden',
                      border: '1px solid #e2e8f0',
                      background: '#f1f5f9',
                      aspectRatio: '1',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    }}
                  >
                    <img
                      src={img.image_url}
                      alt={img.caption || 'Club photo'}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteGalleryImage(img.id)}
                      title="Delete photo"
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'rgba(239, 68, 68, 0.9)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '26px',
                        height: '26px',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      ✕
                    </button>
                    {img.caption && (
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'rgba(15, 23, 42, 0.75)',
                        color: '#ffffff',
                        fontSize: '0.7rem',
                        padding: '4px 8px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {img.caption}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: CHANGE PROFILE AVATAR (With Live Base64 Preview)
         ========================================================= */}
      {showAvatarModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '0.75rem',
            maxWidth: '460px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
              Update Profile Picture
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Select an image from your device or paste an image link. Stored directly in Base64 format.
            </p>

            {/* Live Preview */}
            {avatarPreview && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.25rem' }}>
                <img
                  src={avatarPreview}
                  alt="Preview"
                  style={{
                    width: '96px',
                    height: '96px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid #2563eb',
                    marginBottom: '0.5rem',
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
                  ✓ Base64 preview ready
                </span>
              </div>
            )}

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Choose Local Image File
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1rem 0' }}>
              <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #e2e8f0' }} />
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>OR</span>
              <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #e2e8f0' }} />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Image Web Link
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="url"
                  placeholder="https://example.com/photo.jpg"
                  value={avatarInputUrl}
                  onChange={(e) => setAvatarInputUrl(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.875rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #cbd5e1',
                  }}
                />
                <button
                  type="button"
                  onClick={handleUrlPreview}
                  style={{
                    padding: '0.5rem 0.85rem',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.375rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Preview
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => {
                  setShowAvatarModal(false);
                  setAvatarPreview('');
                  setAvatarInputUrl('');
                }}
                style={{
                  padding: '0.55rem 1rem',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={avatarLoading || (!avatarPreview && !avatarInputUrl.trim())}
                onClick={handleSaveAvatar}
                style={{
                  padding: '0.55rem 1.35rem',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: (avatarLoading || (!avatarPreview && !avatarInputUrl.trim())) ? 'not-allowed' : 'pointer',
                  opacity: (avatarLoading || (!avatarPreview && !avatarInputUrl.trim())) ? 0.6 : 1,
                }}
              >
                {avatarLoading ? 'Saving Base64...' : 'Save Profile Picture'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: CHANGE PASSWORD (Requires Old Password, Argon2)
         ========================================================= */}
      {showChangePasswordModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '0.75rem',
            maxWidth: '460px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.35rem 0' }}>
              🔒 Change Account Password
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Please enter your current password to authorize this change, then enter your new password.
            </p>

            {changePasswordError && (
              <div style={{
                background: '#fef2f2',
                color: '#b91c1c',
                padding: '0.65rem 0.85rem',
                borderRadius: '0.375rem',
                fontSize: '0.8rem',
                marginBottom: '1rem',
                border: '1px solid #fecaca',
              }}>
                {changePasswordError}
              </div>
            )}

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Current (Old) Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.875rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #cbd5e1',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  New Password (min. 6 characters, Argon2)
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.875rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #cbd5e1',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.875rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #cbd5e1',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePasswordModal(false);
                    setOldPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setChangePasswordError('');
                  }}
                  style={{
                    padding: '0.5rem 0.85rem',
                    background: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changePasswordLoading}
                  style={{
                    padding: '0.5rem 1.25rem',
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: changePasswordLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {changePasswordLoading ? 'Verifying & Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: ADD NEW PASSWORD (For OAuth Users without Password)
         ========================================================= */}
      {showSetPasswordModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '0.75rem',
            maxWidth: '460px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.35rem 0' }}>
              🔑 Add New Password
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
              You registered using Google OAuth. Set a local password so you can also log in directly using your email and password.
            </p>

            {setPasswordError && (
              <div style={{
                background: '#fef2f2',
                color: '#b91c1c',
                padding: '0.65rem 0.85rem',
                borderRadius: '0.375rem',
                fontSize: '0.8rem',
                marginBottom: '1rem',
                border: '1px solid #fecaca',
              }}>
                {setPasswordError}
              </div>
            )}

            <form onSubmit={handleSetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  New Password (min. 6 characters, Argon2)
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.875rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #cbd5e1',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.875rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #cbd5e1',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowSetPasswordModal(false)}
                  style={{
                    padding: '0.5rem 0.85rem',
                    background: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSetPasswordLoading}
                  style={{
                    padding: '0.5rem 1.25rem',
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: isSetPasswordLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSetPasswordLoading ? 'Saving...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

