import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router';
import { useForm } from 'react-hook-form';
import useAuth from '../hook/useAuth.js';
import '../styles/auth.scss';

/**
 * Layer 1: SetupProfile Presentation Component
 * Built with React Hook Form (RHF)
 * Handles Google OAuth completion flow:
 * Pre-fills info received from Google (name, email, avatar), and prompts for remaining required phone number.
 */
export default function SetupProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    completeProfile,
    loading,
    error,
    role,
    isAuthenticated,
    isProfileComplete,
    resetError,
  } = useAuth();

  // Read URL search params passed by backend oauth redirect
  const queryParams = new URLSearchParams(location.search);
  const emailParam = queryParams.get('email') || user?.email || '';
  const nameParam = queryParams.get('name') || user?.fullName || user?.full_name || '';
  const avatarParam = queryParams.get('avatar') || user?.avatar_url || '';

  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onBlur',
    defaultValues: {
      fullName: nameParam,
      email: emailParam,
      phone: user?.phone || '',
      password: '',
      avatarUrl: avatarParam,
    },
  });

  const avatarUrlWatch = watch('avatarUrl');
  const fullNameWatch = watch('fullName');

  // Update pre-filled info once user / queryParams are available
  useEffect(() => {
    if (nameParam) setValue('fullName', nameParam);
    if (emailParam) setValue('email', emailParam);
    if (avatarParam) setValue('avatarUrl', avatarParam);
  }, [nameParam, emailParam, avatarParam, setValue]);

  const requiresSetup = queryParams.get('requiresSetup');

  // If already authenticated and profile is fully complete, proceed to dashboard
  useEffect(() => {
    if (isAuthenticated && isProfileComplete && !requiresSetup) {
      const userRole = (role || 'public').toLowerCase();
      const dest = (userRole === 'member' || userRole === 'public') ? '/user/dashboard' : '/dashboard';
      navigate(dest, { replace: true });
    }
  }, [isAuthenticated, isProfileComplete, role, navigate, requiresSetup]);


  useEffect(() => {
    return () => {
      resetError();
    };
  }, [resetError]);

  const onSubmit = async (data) => {
    if (error) resetError();

    const result = await completeProfile({
      phone: data.phone.trim(),
      fullName: data.fullName?.trim() || undefined,
      avatarUrl: data.avatarUrl || undefined,
      password: data.password || undefined,
    });

    if (result.success) {
      const userRole = (role || 'public').toLowerCase();
      const dest = (userRole === 'member' || userRole === 'public') ? '/user/dashboard' : '/dashboard';
      navigate(dest, { replace: true });
    }
  };


  return (
    <div className="cl-auth-page cl-auth-page--no-page-scroll">
      {/* Header */}
      <header className="cl-auth-page__header">
        <Link to="/" className="cl-auth-page__brand">
          <div className="cl-auth-page__brand-icon">⚡</div>
          <div className="cl-auth-page__brand-text">
            <strong>Clubhouse</strong>
            <span>Management Suite</span>
          </div>
        </Link>
        <span style={{ fontSize: '0.8125rem', color: '#6b6b66' }}>
          Step 2 of 2: Profile Completion
        </span>
      </header>

      {/* Main Card */}
      <main className="cl-auth-page__main" style={{ maxWidth: '440px' }}>
        <div className="cl-auth-page__card cl-auth-page__form-panel" style={{ height: '100%', maxHeight: '100%', overflow: 'hidden' }}>
          <div className="cl-auth-page__form-header">
            <h1 className="cl-auth-page__title" style={{ fontSize: '1.3rem', marginBottom: '0.2rem' }}>
              Complete Your Profile
            </h1>
            <p className="cl-auth-page__subtitle" style={{ fontSize: '0.78rem', marginBottom: '0.75rem' }}>
              Authenticated via Google. Provide your phone number for court booking SMS & receipts.
            </p>

            {/* Google Profile Snapshot Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.5rem 0.75rem',
                background: '#f6f3ef',
                border: '1px solid #e7e5df',
                borderRadius: '6px',
                marginBottom: '0.75rem',
              }}
            >
              {avatarUrlWatch ? (
                <img
                  src={avatarUrlWatch}
                  alt="Avatar"
                  style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#1f5c46',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                  }}
                >
                  {fullNameWatch ? fullNameWatch[0].toUpperCase() : 'G'}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1c1c1a' }}>
                  {fullNameWatch || 'Google User'}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#6b6b66', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  ✓ {emailParam || 'Verified via Google'}
                </span>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="cl-auth-page__alert cl-auth-page__alert--error" style={{ marginBottom: '0.5rem' }}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Scrollable Form Body with Hidden Scrollbar */}
          <form onSubmit={handleSubmit(onSubmit)} className="cl-auth-page__form cl-auth-page__form--scrollable">
            <div className="cl-auth-page__field">
              <label htmlFor="fullName">Full Name</label>
              <div className="input-wrapper">
                <input
                  id="fullName"
                  type="text"
                  disabled={loading || isSubmitting}
                  {...register('fullName', {
                    required: 'Full name is required',
                    minLength: { value: 2, message: 'Minimum 2 characters' },
                  })}
                />
              </div>
              {errors.fullName && (
                <span className="cl-auth-page__field-error">⚠️ {errors.fullName.message}</span>
              )}
            </div>

            <div className="cl-auth-page__field">
              <label htmlFor="email">Email Address (Google Account)</label>
              <div className="input-wrapper">
                <input
                  id="email"
                  type="email"
                  disabled
                  value={emailParam}
                  style={{ background: '#ebe8e4', cursor: 'not-allowed', color: '#6b6b66' }}
                />
              </div>
            </div>

            <div className="cl-auth-page__field">
              <label htmlFor="phone">Phone Number (Required)</label>
              <div className="input-wrapper">
                <input
                  id="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  disabled={loading || isSubmitting}
                  autoFocus
                  {...register('phone', {
                    required: 'Phone number is required for court booking notices',
                    pattern: {
                      value: /^[0-9+\s\-]{7,15}$/,
                      message: 'Please provide a valid phone number (7-15 digits)',
                    },
                  })}
                />
              </div>
              {errors.phone && (
                <span className="cl-auth-page__field-error">⚠️ {errors.phone.message}</span>
              )}
              <span className="field-hint">Used for court reservation SMS and member check-in</span>
            </div>

            <div className="cl-auth-page__field">
              <label htmlFor="password">Set Backup Local Password (Optional)</label>
              <div className="input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Optional backup password"
                  disabled={loading || isSubmitting}
                  {...register('password', {
                    minLength: { value: 6, message: 'Password must be at least 6 characters if provided' },
                  })}
                />
                <button
                  type="button"
                  className="toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.password && (
                <span className="cl-auth-page__field-error">⚠️ {errors.password.message}</span>
              )}
              <span className="field-hint">Allows direct email/password login as an alternative to Google</span>
            </div>

            <button
              type="submit"
              disabled={loading || isSubmitting}
              className="cl-auth-page__btn-primary"
              style={{ marginTop: '0.5rem', height: '38px', fontSize: '0.84rem' }}
            >
              <span>{loading || isSubmitting ? 'Saving Profile...' : 'Complete & Open Dashboard →'}</span>
            </button>
          </form>

          {/* Static Footer */}
          <div className="cl-auth-page__form-footer">
            <div style={{ fontSize: '0.7rem', color: '#9c9a92', textAlign: 'center' }}>
              🔒 Your phone number is encrypted and protected by club data privacy protocols.
            </div>
          </div>
        </div>
      </main>

      {/* Page Footer */}
      <footer style={{ fontSize: '0.72rem', color: '#9c9a92', textAlign: 'center', padding: '0.35rem 0', flexShrink: 0 }}>
        Clubhouse Operating System • Enterprise Multi-Tenant Edition
      </footer>
    </div>
  );
}
