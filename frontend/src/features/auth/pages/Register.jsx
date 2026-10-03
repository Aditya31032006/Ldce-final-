import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import useAuth from '../hook/useAuth.js';
import '../styles/auth.scss';

/**
 * Layer 1: Register Presentation Component
 * Implements Stitch "Court & Ledger" (projects/16619446232965115621)
 * Supports Direct Full Registration and Google OAuth registration
 */
export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    register: registerUser,
    loginWithGoogle,
    loading,
    error,
    isAuthenticated,
    isProfileComplete,
    resetError,
  } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');

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
    setValidationError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (formData.fullName.trim().length < 2) {
      setValidationError('Full name must be at least 2 characters.');
      return;
    }

    if (!formData.phone.trim().match(/^[0-9+\s\-]{7,15}$/)) {
      setValidationError('Please enter a valid phone number (7-15 digits).');
      return;
    }

    if (formData.password.length < 6) {
      setValidationError('Password must be at least 6 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    if (error) resetError();

    const result = await registerUser({
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      password: formData.password,
    });

    if (result.success) {
      navigate('/dashboard', { replace: true });
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
          <span style={{ fontSize: '0.8125rem', color: '#6b6b66' }}>Already have an account?</span>
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

      {/* Main Card */}
      <main className="cl-auth-page__main">
        <div className="cl-auth-page__card">
          <h1 className="cl-auth-page__title">Create an Account</h1>
          <p className="cl-auth-page__subtitle">
            Join Clubhouse to manage court schedules, player accounts, and club orders.
          </p>

          {/* Google OAuth Quick Registration */}
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
            <span>Sign up with Google</span>
          </button>

          {/* Divider */}
          <div className="cl-auth-page__divider">
            <span>or direct registration</span>
          </div>

          {/* Error Banner */}
          {(error || validationError) && (
            <div className="cl-auth-page__alert cl-auth-page__alert--error">
              <span>⚠️</span>
              <span>{validationError || error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="cl-auth-page__form">
            <div className="cl-auth-page__field">
              <label htmlFor="fullName">Full Name</label>
              <div className="input-wrapper">
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  placeholder="Rahul Sharma"
                  value={formData.fullName}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="cl-auth-page__field">
              <label htmlFor="email">Email Address</label>
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
              <label htmlFor="phone">Phone Number (Required for booking alerts)</label>
              <div className="input-wrapper">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
              <span className="field-hint">Used for OTP verification & court notification SMS</span>
            </div>

            <div className="cl-auth-page__field">
              <label htmlFor="password">Password (Minimum 6 characters)</label>
              <div className="input-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
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

            <div className="cl-auth-page__field">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-wrapper">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  placeholder="••••••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="cl-auth-page__btn-primary"
            >
              <span>{loading ? 'Creating Account...' : 'Complete Registration'}</span>
              <span>→</span>
            </button>
          </form>

          {/* Footer */}
          <div className="cl-auth-page__footer">
            <p>
              Already registered?
              <Link to="/login">Sign in here</Link>
            </p>
            <div className="security-badge">
              <span className="dot" />
              <span>By signing up, you agree to our Club Terms of Service</span>
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
