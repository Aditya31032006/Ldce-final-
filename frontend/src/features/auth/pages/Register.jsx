import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { useForm } from 'react-hook-form';
import gsap from 'gsap';
import useAuth from '../hook/useAuth.js';
import '../styles/auth.scss';

/**
 * Layer 1: Register Presentation Component
 * Built with React Hook Form (RHF) and GSAP animations
 * Implements Stitch "Court & Ledger" design (projects/16619446232965115621)
 *
 * Requirements:
 * 1. Smooth sliding tab indicator animation from left to right / right to left via GSAP.
 * 2. Directional content fade & slide transitions when switching between facility and member modes.
 * 3. No scrollbar on the whole page or on the side panel; hidden scrollbar on form fields if constrained.
 * 4. Unsqueezed, prominent action button on right launchpad panel.
 * 5. Uses React Hook Form (RHF) for all validations and submission handling.
 */
export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    register: registerMember,
    registerClubOwner,
    loginWithGoogle,
    loading,
    error,
    isAuthenticated,
    isProfileComplete,
    resetError,
  } = useAuth();

  // Mode: 'facility' (Sports Club / Cafe Owner) or 'member' (Normal Player)
  const [accountType, setAccountType] = useState('facility');
  const [showPassword, setShowPassword] = useState(false);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  // GSAP Animation Refs
  const indicatorRef = useRef(null);
  const formFieldsRef = useRef(null);
  const previewContentRef = useRef(null);

  // Initialize React Hook Form
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onBlur',
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      clubName: '',
      city: '',
      slug: '',
    },
  });

  const clubNameValue = watch('clubName');
  const passwordValue = watch('password');
  const fullNameValue = watch('fullName');
  const emailValue = watch('email');
  const slugValue = watch('slug');

  // Automatically generate subdomain slug from club name unless user explicitly edited it
  useEffect(() => {
    if (!isSlugManuallyEdited && clubNameValue) {
      const generatedSlug = clubNameValue
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      setValue('slug', generatedSlug, { shouldValidate: true });
    }
  }, [clubNameValue, isSlugManuallyEdited, setValue]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      if (!isProfileComplete) {
        navigate('/setup-profile', { replace: true });
      } else {
        const dest = location.state?.from?.pathname || '/dashboard';
        navigate(dest, { replace: true });
      }
    }
  }, [isAuthenticated, isProfileComplete, navigate, location]);

  useEffect(() => {
    return () => {
      resetError();
    };
  }, [resetError]);

  // Smooth GSAP Tab Switcher (Left to Right / Right to Left)
  const handleTabChange = (nextType) => {
    if (nextType === accountType) return;

    const isMovingRight = nextType === 'member';

    // 1. Smooth pill indicator slide
    if (indicatorRef.current) {
      gsap.to(indicatorRef.current, {
        xPercent: isMovingRight ? 100 : 0,
        duration: 0.35,
        ease: 'power3.out',
      });
    }

    // 2. Directional content slide & fade on form fields
    if (formFieldsRef.current) {
      gsap.fromTo(
        formFieldsRef.current,
        {
          opacity: 0,
          x: isMovingRight ? 26 : -26,
        },
        {
          opacity: 1,
          x: 0,
          duration: 0.35,
          ease: 'power2.out',
        }
      );
    }

    // 3. Directional content slide on preview summary card
    if (previewContentRef.current) {
      gsap.fromTo(
        previewContentRef.current,
        {
          opacity: 0,
          x: isMovingRight ? 20 : -20,
        },
        {
          opacity: 1,
          x: 0,
          duration: 0.35,
          ease: 'power2.out',
        }
      );
    }

    setAccountType(nextType);
    clearErrors();
    resetError();
  };

  const onSubmit = async (data) => {
    if (error) resetError();

    let result;
    if (accountType === 'facility') {
      // Register Club / Cafe Facility Owner (email becomes Admin)
      result = await registerClubOwner({
        fullName: data.fullName.trim(),
        email: data.email.trim(),
        phone: data.phone.trim(),
        password: data.password,
        clubName: data.clubName.trim(),
        slug: data.slug.trim().toLowerCase(),
        city: data.city ? data.city.trim() : null,
      });
    } else {
      // Register Normal Player / Member
      result = await registerMember({
        fullName: data.fullName.trim(),
        email: data.email.trim(),
        phone: data.phone.trim(),
        password: data.password,
      });
    }

    if (result?.success) {
      if (accountType === 'facility') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/user/dashboard', { replace: true });
      }
    }
  };


  return (
    <div className="cl-auth-page cl-auth-page--split cl-auth-page--no-page-scroll">
      {/* Top Header */}
      <header className="cl-auth-page__header">
        <Link to="/" className="cl-auth-page__brand">
          <div className="cl-auth-page__brand-icon">⚡</div>
          <div className="cl-auth-page__brand-text">
            <strong>Clubhouse</strong>
            <span>Management Suite</span>
          </div>
        </Link>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8125rem', color: '#6b6b66' }}>Already registered?</span>
          <Link
            to="/login"
            style={{
              fontSize: '0.8125rem',
              color: '#1f5c46',
              fontWeight: 600,
              textDecoration: 'none',
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #e7e5df',
              background: '#ffffff',
            }}
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Main Split Container */}
      <main className="cl-auth-page__main">
        {/* Left Form Panel */}
        <div className="cl-auth-page__form-panel">
          {/* Static Header Area */}
          <div className="cl-auth-page__form-header">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                marginBottom: '0.4rem',
                fontSize: '0.7rem',
                color: '#9c9a92',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontFamily: 'Geist, monospace',
              }}
            >
              <span>Onboarding</span>
              <span>/</span>
              <span style={{ color: '#1f5c46', fontWeight: 600 }}>
                {accountType === 'facility' ? 'New Facility Setup' : 'Player Membership'}
              </span>
            </div>

            <h1 className="cl-auth-page__title" style={{ fontSize: '1.25rem', marginBottom: '0.15rem' }}>
              {accountType === 'facility' ? 'Register your Club or Cafe' : 'Create Player Account'}
            </h1>
            <p className="cl-auth-page__subtitle" style={{ fontSize: '0.78rem', marginBottom: '0.65rem' }}>
              {accountType === 'facility'
                ? 'Your email will be granted full Administrator access for this facility and its operations.'
                : 'Book courts, join social sessions, order pro shop gear, and run cafe tabs.'}
            </p>

            {/* GSAP-Powered Segmented Switcher with Smooth Sliding Indicator */}
            <div className="cl-auth-page__tabs" style={{ marginBottom: '0.65rem' }}>
              {/* Floating backdrop pill that slides left/right */}
              <div ref={indicatorRef} className="cl-auth-page__tab-indicator" />

              <button
                type="button"
                className={`cl-auth-page__tab ${accountType === 'facility' ? 'cl-auth-page__tab--active' : ''}`}
                onClick={() => handleTabChange('facility')}
              >
                <span>🏟️</span>
                <span>Club / Cafe Facility (Admin)</span>
              </button>
              <button
                type="button"
                className={`cl-auth-page__tab ${accountType === 'member' ? 'cl-auth-page__tab--active' : ''}`}
                onClick={() => handleTabChange('member')}
              >
                <span>👤</span>
                <span>Player / Member</span>
              </button>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="cl-auth-page__alert cl-auth-page__alert--error" style={{ marginBottom: '0.5rem', padding: '0.45rem 0.75rem' }}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Scrollable Form Container - Hidden scrollbar to explore fields */}
          <form
            id="register-form"
            onSubmit={handleSubmit(onSubmit)}
            className="cl-auth-page__form cl-auth-page__form--scrollable"
          >
            {/* Animated Form Fields Container */}
            <div ref={formFieldsRef} style={{ willChange: 'transform, opacity' }}>
              {/* Google OAuth for Members */}
              {accountType === 'member' && (
                <div style={{ marginBottom: '0.35rem' }}>
                  <button
                    type="button"
                    onClick={loginWithGoogle}
                    className="cl-auth-page__btn-google"
                    disabled={loading || isSubmitting}
                    style={{ height: '36px', fontSize: '0.8125rem' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Sign up with Google</span>
                  </button>
                  <div className="cl-auth-page__divider" style={{ margin: '0.5rem 0' }}>
                    <span>or enter manual details</span>
                  </div>
                </div>
              )}

              {/* Row 1: Admin / User Details */}
              <div className="cl-auth-page__grid">
                <div className="cl-auth-page__field">
                  <label htmlFor="fullName">
                    {accountType === 'facility' ? 'Administrator Name' : 'Full Name'}
                  </label>
                  <div className="input-wrapper">
                    <input
                      id="fullName"
                      type="text"
                      placeholder="e.g. Vikram Singhania"
                      disabled={loading || isSubmitting}
                      {...register('fullName', {
                        required: 'Full name is required',
                        minLength: { value: 2, message: 'Name must be at least 2 characters' },
                      })}
                    />
                  </div>
                  {errors.fullName && (
                    <span className="cl-auth-page__field-error">⚠️ {errors.fullName.message}</span>
                  )}
                </div>

                <div className="cl-auth-page__field">
                  <label htmlFor="email">
                    {accountType === 'facility' ? 'Work Email (Becomes Admin)' : 'Email Address'}
                  </label>
                  <div className="input-wrapper">
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="vikram@championsclub.in"
                      disabled={loading || isSubmitting}
                      {...register('email', {
                        required: 'Email address is required',
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: 'Please provide a valid email address',
                        },
                      })}
                    />
                  </div>
                  {errors.email && (
                    <span className="cl-auth-page__field-error">⚠️ {errors.email.message}</span>
                  )}
                </div>
              </div>

              {/* Row 2: Phone & Password */}
              <div className="cl-auth-page__grid">
                <div className="cl-auth-page__field">
                  <label htmlFor="phone">Contact Phone Number</label>
                  <div className="input-wrapper">
                    <input
                      id="phone"
                      type="tel"
                      placeholder="+91 98250 14820"
                      disabled={loading || isSubmitting}
                      {...register('phone', {
                        required: 'Phone number is required',
                        pattern: {
                          value: /^[0-9+\s\-]{7,15}$/,
                          message: 'Valid phone number required (7-15 digits)',
                        },
                      })}
                    />
                  </div>
                  {errors.phone && (
                    <span className="cl-auth-page__field-error">⚠️ {errors.phone.message}</span>
                  )}
                </div>

                <div className="cl-auth-page__field">
                  <label htmlFor="password">Password (min 6 chars)</label>
                  <div className="input-wrapper">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="••••••••••••"
                      disabled={loading || isSubmitting}
                      {...register('password', {
                        required: 'Password is required',
                        minLength: { value: 6, message: 'Password must be at least 6 characters' },
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
                </div>
              </div>

              {/* Row 3: Confirm Password */}
              <div className="cl-auth-page__field">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="input-wrapper">
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••••••"
                    disabled={loading || isSubmitting}
                    {...register('confirmPassword', {
                      required: 'Please confirm your password',
                      validate: (val) => val === passwordValue || 'Passwords do not match',
                    })}
                  />
                </div>
                {errors.confirmPassword && (
                  <span className="cl-auth-page__field-error">⚠️ {errors.confirmPassword.message}</span>
                )}
              </div>

              {/* Facility Specific Fields (Club / Cafe) */}
              {accountType === 'facility' && (
                <>
                  <div style={{ height: '1px', background: '#e7e5df', margin: '0.15rem 0' }} />

                  <div className="cl-auth-page__grid">
                    <div className="cl-auth-page__field">
                      <label htmlFor="clubName">Club or Cafe Name</label>
                      <div className="input-wrapper">
                        <input
                          id="clubName"
                          type="text"
                          placeholder="e.g. Champions Sports Club"
                          disabled={loading || isSubmitting}
                          {...register('clubName', {
                            required: accountType === 'facility' ? 'Club or cafe name is required' : false,
                            minLength: { value: 2, message: 'Club name must be at least 2 characters' },
                          })}
                        />
                      </div>
                      {errors.clubName && (
                        <span className="cl-auth-page__field-error">⚠️ {errors.clubName.message}</span>
                      )}
                    </div>

                    <div className="cl-auth-page__field">
                      <label htmlFor="city">City / Region</label>
                      <div className="input-wrapper">
                        <input
                          id="city"
                          type="text"
                          placeholder="e.g. Ahmedabad, Gujarat"
                          disabled={loading || isSubmitting}
                          {...register('city')}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="cl-auth-page__field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label htmlFor="slug">Dedicated Subdomain URL</label>
                      <span style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: 600 }}>✓ Live Subdomain</span>
                    </div>
                    <div className="cl-auth-page__slug-wrapper">
                      <span className="slug-prefix">clubhouse.app/c/</span>
                      <input
                        id="slug"
                        type="text"
                        placeholder="champions-club"
                        disabled={loading || isSubmitting}
                        {...register('slug', {
                          required: accountType === 'facility' ? 'Subdomain slug is required' : false,
                          pattern: {
                            value: /^[a-z0-9]+(-[a-z0-9]+)*$/,
                            message: 'Slug can only contain lowercase letters, numbers, and hyphens',
                          },
                          onChange: () => setIsSlugManuallyEdited(true),
                        })}
                      />
                    </div>
                    {errors.slug && (
                      <span className="cl-auth-page__field-error">⚠️ {errors.slug.message}</span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Mobile-Only Submit Button (visible on small mobile screens when right panel hides) */}
            <div className="cl-auth-page__mobile-submit">
              <button
                type="submit"
                disabled={loading || isSubmitting}
                className="cl-auth-page__btn-primary"
                style={{ marginTop: '0.5rem', height: '42px', fontSize: '0.85rem' }}
              >
                <span>
                  {loading || isSubmitting
                    ? 'Provisioning Account...'
                    : accountType === 'facility'
                    ? 'Register Facility & Become Admin →'
                    : 'Create Player Account →'}
                </span>
              </button>
            </div>
          </form>

          {/* Static Bottom Note */}
          <div className="cl-auth-page__form-footer">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#6b6b66' }}>
              <span>
                Already registered? <Link to="/login" style={{ color: '#1f5c46', fontWeight: 600, textDecoration: 'none' }}>Log in</Link>
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#15803d' }} />
                <span>Multi-tenant isolation active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Replaced Platform Architecture with Prominent Registration Launchpad */}
        <div className="cl-auth-page__preview-panel">
          <div ref={previewContentRef} style={{ willChange: 'transform, opacity' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#15803d' }} />
              <span
                style={{
                  fontFamily: 'Geist, monospace',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#1f5c46',
                  fontWeight: 600,
                }}
              >
                Executive Provisioning
              </span>
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0.2rem 0 0.15rem 0', color: '#1c1c1a' }}>
              {accountType === 'facility' ? 'Facility Launchpad' : 'Membership Activation'}
            </h3>
            <p style={{ fontSize: '0.76rem', color: '#6b6b66', margin: 0 }}>
              {accountType === 'facility'
                ? 'Your registration immediately provisions a dedicated sports club or cafe instance with full administrative rights.'
                : 'Instantly joins the club roster with self-service court booking and courtside cafe ordering.'}
            </p>

            {/* Live Registration Summary Card */}
            <div className="cl-auth-page__summary-card">
              <div className="summary-row">
                <span className="label">Assigned Role</span>
                <span className="badge badge--admin">
                  {accountType === 'facility' ? '👑 Club / Cafe Administrator' : '🎾 Player / Member'}
                </span>
              </div>
              <div className="summary-row">
                <span className="label">Admin Name</span>
                <span className="val">{fullNameValue || '—'}</span>
              </div>
              <div className="summary-row">
                <span className="label">Admin Email</span>
                <span className="val">{emailValue || '—'}</span>
              </div>
              {accountType === 'facility' && (
                <>
                  <div className="summary-row">
                    <span className="label">Facility Name</span>
                    <span className="val">{clubNameValue || '—'}</span>
                  </div>
                  <div className="summary-row">
                    <span className="label">Subdomain</span>
                    <span className="val slug-val">
                      clubhouse.app/c/{slugValue || 'club-slug'}
                    </span>
                  </div>
                  <div className="summary-row">
                    <span className="label">Modules Active</span>
                    <span className="val modules-list">Courts • Shop • Bar POS • CRM • Staff</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Prominent Unsqueezed Primary Action Button */}
          <div className="cl-auth-page__action-container">
            <button
              form="register-form"
              type="submit"
              onClick={handleSubmit(onSubmit)}
              disabled={loading || isSubmitting}
              className="cl-auth-page__btn-primary cl-auth-page__btn-primary--large"
            >
              <span>
                {loading || isSubmitting
                  ? 'Provisioning Instance...'
                  : accountType === 'facility'
                  ? 'Register Facility & Become Admin →'
                  : 'Complete Registration & Join →'}
              </span>
            </button>
            <div className="trial-badge">
              <span>⚡ Instant Tenant Provisioning</span>
              <span>•</span>
              <span>14-Day Free Access</span>
              <span>•</span>
              <span>No Card Required</span>
            </div>
          </div>

          {/* Footer Security Badges */}
          <div className="cl-auth-page__preview-footer">
            <div className="trust-item">
              <span>🔒</span>
              <span>256-bit TLS</span>
            </div>
            <div className="trust-item">
              <span>🏛️</span>
              <span>Multi-Tenant DB</span>
            </div>
            <div className="trust-item">
              <span>🇮🇳</span>
              <span>India Resident</span>
            </div>
          </div>
        </div>
      </main>

      {/* Page Footer */}
      <footer style={{ fontSize: '0.72rem', color: '#9c9a92', textAlign: 'center', padding: '0.25rem 0', flexShrink: 0 }}>
        Clubhouse Operating System • Enterprise Multi-Tenant Edition
      </footer>
    </div>
  );
}
