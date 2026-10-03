import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { useForm } from 'react-hook-form';
import useAuth from '../hook/useAuth.js';
import authApi from '../services/auth.api.js';
import '../styles/auth.scss';

/**
 * Layer 1: Login Presentation Component
 * Built with React Hook Form (RHF)
 * Implements Stitch "Court & Ledger" (projects/16619446232965115621 - screen fa65b4314bb648abae003db0a8ab60de)
 * Supports Email/Password login, Google OAuth, and multi-tenant club terminal selection
 */
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    login,
    loginWithGoogle,
    loading,
    error,
    role,
    isAuthenticated,
    isProfileComplete,
    resetError,
  } = useAuth();


  const [showPassword, setShowPassword] = useState(false);
  const [clubs, setClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState(null);

  // Initialize React Hook Form
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onBlur',
    defaultValues: {
      email: '',
      password: '',
      clubId: '',
    },
  });

  // Parse URL error params if returning from failed OAuth
  const queryParams = new URLSearchParams(location.search);
  const oauthError = queryParams.get('error');

  // Load available facilities for the multi-tenant selector
  useEffect(() => {
    let isMounted = true;
    authApi
      .getClubs()
      .then((data) => {
        if (isMounted) {
          const list = data?.clubs || data || [];
          setClubs(list);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      if (!isProfileComplete) {
        navigate('/setup-profile', { replace: true });
      } else {
        const userRole = (role || 'public').toLowerCase();
        const defaultDest = (userRole === 'member' || userRole === 'public') ? '/user/dashboard' : '/dashboard';
        const dest = location.state?.from?.pathname || defaultDest;
        navigate(dest, { replace: true });
      }
    }
  }, [isAuthenticated, isProfileComplete, role, navigate, location]);

  useEffect(() => {
    return () => {
      resetError();
    };
  }, [resetError]);

  const handleSelectClub = (club) => {
    const isTogglingOff = selectedClub?.id === club.id;
    const nextClub = isTogglingOff ? null : club;
    setSelectedClub(nextClub);
    setValue('clubId', nextClub ? nextClub.id : '', { shouldValidate: true });
  };

  const onSubmit = async (data) => {
    if (error) resetError();

    const result = await login({
      email: data.email.trim(),
      password: data.password,
      clubId: data.clubId || undefined,
    });

    if (result.success) {
      if (result.requiresSetup) {
        navigate('/setup-profile', { replace: true });
      } else {
        const userRole = (result.role || 'public').toLowerCase();
        const defaultDest = (userRole === 'member' || userRole === 'public') ? '/user/dashboard' : '/dashboard';
        const dest = location.state?.from?.pathname || defaultDest;
        navigate(dest, { replace: true });
      }
    }
  };


  return (
    <div className="cl-auth-page cl-auth-page--no-page-scroll">
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
          <span style={{ fontSize: '0.8125rem', color: '#6b6b66' }}>Need an account?</span>
          <Link
            to="/register"
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
            Register
          </Link>
        </div>
      </header>

      {/* Main Container Card */}
      <main className="cl-auth-page__main" style={{ maxWidth: '440px' }}>
        <div className="cl-auth-page__card cl-auth-page__form-panel" style={{ height: '100%', maxHeight: '100%', overflow: 'hidden' }}>
          <div className="cl-auth-page__form-header">
            <h1 className="cl-auth-page__title" style={{ fontSize: '1.3rem', marginBottom: '0.25rem' }}>
              Log in to Clubhouse
            </h1>
            <p className="cl-auth-page__subtitle" style={{ fontSize: '0.8rem', marginBottom: '0.75rem' }}>
              Enter your credentials to access your club operations & court terminal.
            </p>

            {/* Error Banner */}
            {(error || oauthError) && (
              <div className="cl-auth-page__alert cl-auth-page__alert--error" style={{ marginBottom: '0.75rem' }}>
                <span>⚠️</span>
                <span>
                  {error ||
                    (oauthError === 'google_auth_not_configured'
                      ? 'Google OAuth credentials not configured on backend.'
                      : decodeURIComponent(oauthError))}
                </span>
              </div>
            )}
          </div>

          {/* Scrollable Form Body with Hidden Scrollbar */}
          <form onSubmit={handleSubmit(onSubmit)} className="cl-auth-page__form cl-auth-page__form--scrollable">
            {/* Email Field */}
            <div className="cl-auth-page__field">
              <label htmlFor="email">Work Email</label>
              <div className="input-wrapper">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@clubdomain.in"
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

            {/* Password Field */}
            <div className="cl-auth-page__field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="password">Password</label>
                <Link
                  to="/forgot-password"
                  style={{ fontSize: '0.75rem', color: '#1f5c46', textDecoration: 'none', fontWeight: 600 }}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  disabled={loading || isSubmitting}
                  {...register('password', {
                    required: 'Password is required',
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || isSubmitting}
              className="cl-auth-page__btn-primary"
              style={{ height: '38px', marginTop: '0.25rem' }}
            >
              <span>{loading || isSubmitting ? 'Authenticating...' : 'Log in to Workspace'}</span>
              <span>→</span>
            </button>

            {/* Divider */}
            <div className="cl-auth-page__divider" style={{ margin: '0.75rem 0' }}>
              <span>or continue with</span>
            </div>

            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={loginWithGoogle}
              className="cl-auth-page__btn-google"
              disabled={loading || isSubmitting}
              style={{ height: '36px' }}
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
              <span>Continue with Google</span>
            </button>

            {/* Multi-Tenant Facility Quick Switcher */}
            {clubs.length > 0 && (
              <div className="cl-auth-page__clubs-section" style={{ marginTop: '0.75rem' }}>
                <div className="cl-auth-page__divider" style={{ margin: '0.5rem 0' }}>
                  <span>or direct facility switch</span>
                </div>
                <div className="cl-auth-page__clubs-section-header">
                  <h4>Your Clubs</h4>
                  <span>{clubs.length} Active</span>
                </div>
                <div className="cl-auth-page__clubs-section-list">
                  {clubs.slice(0, 3).map((club) => {
                    const isSelected = selectedClub?.id === club.id;
                    return (
                      <div
                        key={club.id}
                        onClick={() => handleSelectClub(club)}
                        className={`cl-auth-page__clubs-section-item ${
                          isSelected ? 'cl-auth-page__clubs-section-item--active' : ''
                        }`}
                      >
                        <div className="club-info">
                          <div className="club-icon">🏟️</div>
                          <div className="club-details">
                            <span className="name">{club.name}</span>
                            <div className="meta">
                              <span className="dot" />
                              <span>
                                {club.city || 'Club Venue'} •{' '}
                                {isSelected ? 'Target Selected' : 'Tap to Target'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <span className="arrow">{isSelected ? '✓' : '→'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </form>

          {/* Static Footer */}
          <div className="cl-auth-page__form-footer">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#6b6b66' }}>
              <span>
                New here? <Link to="/register" style={{ color: '#1f5c46', fontWeight: 600, textDecoration: 'none' }}>Register club</Link>
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#15803d' }} />
                <span>Multi-tenant active</span>
              </div>
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
