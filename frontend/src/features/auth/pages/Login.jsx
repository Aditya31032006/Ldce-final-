import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import useAuth from '../hook/useAuth.js';
import authApi from '../services/auth.api.js';
import '../styles/auth.scss';

/**
 * Layer 1: Login Presentation Component
 * Implements Stitch "Court & Ledger" (projects/16619446232965115621)
 * Supports Email/Password login, Google OAuth, and multi-tenant club switching
 */
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    login,
    loginWithGoogle,
    loading,
    error,
    isAuthenticated,
    isProfileComplete,
    resetError,
  } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    clubId: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [clubs, setClubs] = useState([]);
  const [loadingClubs, setLoadingClubs] = useState(false);
  const [selectedClub, setSelectedClub] = useState(null);

  // Parse URL error params if returning from failed OAuth
  const queryParams = new URLSearchParams(location.search);
  const oauthError = queryParams.get('error');

  // Load available facilities for the multi-tenant selector
  useEffect(() => {
    let isMounted = true;
    setLoadingClubs(true);
    authApi
      .getClubs()
      .then((data) => {
        if (isMounted) {
          const list = data?.clubs || data || [];
          setClubs(list);
          setLoadingClubs(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoadingClubs(false);
      });
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectClub = (club) => {
    setSelectedClub(club.id === selectedClub?.id ? null : club);
    setFormData((prev) => ({
      ...prev,
      clubId: club.id === selectedClub?.id ? '' : club.id,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) return;

    if (error) resetError();

    const result = await login({
      email: formData.email.trim(),
      password: formData.password,
      clubId: formData.clubId || undefined,
    });

    if (result.success) {
      if (result.requiresSetup) {
        navigate('/setup-profile', { replace: true });
      } else {
        const dest = location.state?.from?.pathname || '/dashboard';
        navigate(dest, { replace: true });
      }
    }
  };

  return (
    <div className="cl-auth-page">
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
          <span style={{ fontSize: '0.8125rem', color: '#6b6b66' }}>Need assistance?</span>
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
            Create Account
          </Link>
        </div>
      </header>

      {/* Main Card */}
      <main className="cl-auth-page__main">
        <div className="cl-auth-page__card">
          <h1 className="cl-auth-page__title">Log in to Clubhouse</h1>
          <p className="cl-auth-page__subtitle">
            Enter your credentials to access your club operations & court terminal.
          </p>

          {/* Error Banner */}
          {(error || oauthError) && (
            <div className="cl-auth-page__alert cl-auth-page__alert--error">
              <span>⚠️</span>
              <span>{error || (oauthError === 'google_auth_not_configured' ? 'Google OAuth credentials not configured on backend.' : decodeURIComponent(oauthError))}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="cl-auth-page__form">
            <div className="cl-auth-page__field">
              <label htmlFor="email">Work Email</label>
              <div className="input-wrapper">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="name@clubdomain.in"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>

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
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="cl-auth-page__btn-primary"
            >
              <span>{loading ? 'Authenticating...' : 'Log in to Workspace'}</span>
              <span>→</span>
            </button>
          </form>

          {/* Divider */}
          <div className="cl-auth-page__divider">
            <span>or continue with</span>
          </div>

          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={loginWithGoogle}
            className="cl-auth-page__btn-google"
            disabled={loading}
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

          {/* Multi-Tenant Facility Quick Switcher (Stitch design feature) */}
          {clubs.length > 0 && (
            <div className="cl-auth-page__clubs-section">
              <div className="cl-auth-page__divider">
                <span>or select facility</span>
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
                      className={`cl-auth-page__clubs-section-item ${isSelected ? 'cl-auth-page__clubs-section-item--active' : ''}`}
                    >
                      <div className="club-info">
                        <div className="club-icon">🏟️</div>
                        <div className="club-details">
                          <span className="name">{club.name}</span>
                          <div className="meta">
                            <span className="dot" />
                            <span>{club.city || 'Club Venue'} • {isSelected ? 'Target Facility Selected' : 'Tap to Target'}</span>
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

          {/* Footer */}
          <div className="cl-auth-page__footer">
            <p>
              Don't have an account?
              <Link to="/register">Sign up for a club account</Link>
            </p>
            <div className="security-badge">
              <span className="dot" />
              <span>Multi-tenant isolation & TLS encryption active</span>
            </div>
          </div>
        </div>
      </main>

      {/* Page Footer */}
      <footer style={{ fontSize: '0.75rem', color: '#9c9a92', textAlign: 'center', padding: '1rem 0' }}>
        Clubhouse Operating System • Enterprise Multi-Tenant Edition
      </footer>
    </div>
  );
}
