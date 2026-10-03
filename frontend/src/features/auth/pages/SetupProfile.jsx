import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router';
import useAuth from '../hook/useAuth.js';
import '../styles/auth.scss';

/**
 * Layer 1: SetupProfile Presentation Component
 * Handles the OAuth completion flow:
 * Pre-fills info received from Google (name, email, avatar), and prompts user for the remaining
 * required fields (Phone number, and optional local fallback password)
 */
export default function SetupProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    completeProfile,
    loading,
    error,
    isAuthenticated,
    isProfileComplete,
    resetError,
  } = useAuth();

  // Read URL search params passed by backend oauth redirect
  const queryParams = new URLSearchParams(location.search);
  const emailParam = queryParams.get('email') || user?.email || '';
  const nameParam = queryParams.get('name') || user?.fullName || user?.full_name || '';
  const avatarParam = queryParams.get('avatar') || user?.avatar_url || '';

  const [formData, setFormData] = useState({
    fullName: nameParam,
    email: emailParam,
    phone: user?.phone || '',
    password: '',
    avatarUrl: avatarParam,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Update pre-filled info once user / queryParams are available
  useEffect(() => {
    if (nameParam && !formData.fullName) {
      setFormData((prev) => ({ ...prev, fullName: nameParam }));
    }
    if (emailParam && !formData.email) {
      setFormData((prev) => ({ ...prev, email: emailParam }));
    }
  }, [nameParam, emailParam]);

  // If already authenticated and profile is fully complete, proceed to dashboard
  useEffect(() => {
    if (isAuthenticated && isProfileComplete && !queryParams.get('requiresSetup')) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isProfileComplete, navigate, queryParams]);

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

    if (!formData.phone.trim().match(/^[0-9+\s\-]{7,15}$/)) {
      setValidationError('Please provide a valid phone number (7-15 digits).');
      return;
    }

    if (formData.password && formData.password.length < 6) {
      setValidationError('Password must be at least 6 characters if provided.');
      return;
    }

    if (error) resetError();

    const result = await completeProfile({
      phone: formData.phone.trim(),
      fullName: formData.fullName.trim() || undefined,
      avatarUrl: formData.avatarUrl || undefined,
      password: formData.password || undefined,
    });

    if (result.success) {
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <div className="cl-auth-page">
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
      <main className="cl-auth-page__main">
        <div className="cl-auth-page__card">
          <h1 className="cl-auth-page__title">Complete Your Profile</h1>
          <p className="cl-auth-page__subtitle">
            Authenticated via Google. Provide your phone number to receive court slot confirmations and booking receipts.
          </p>

          {/* Google Profile Snapshot Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            background: '#f6f3ef',
            border: '1px solid #e7e5df',
            borderRadius: '8px',
            marginBottom: '1.25rem',
          }}>
            {formData.avatarUrl ? (
              <img
                src={formData.avatarUrl}
                alt="Avatar"
                style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#1f5c46',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.9rem'
              }}>
                {formData.fullName ? formData.fullName[0].toUpperCase() : 'G'}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1c1c1a' }}>
                {formData.fullName || 'Google User'}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#6b6b66', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                ✓ {formData.email || 'Verified via Google'}
              </span>
            </div>
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
                  value={formData.fullName}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="cl-auth-page__field">
              <label htmlFor="email">Email Address (Google Account)</label>
              <div className="input-wrapper">
                <input
                  id="email"
                  name="email"
                  type="email"
                  disabled
                  value={formData.email}
                  style={{ background: '#ebe8e4', cursor: 'not-allowed', color: '#6b6b66' }}
                />
              </div>
            </div>

            <div className="cl-auth-page__field">
              <label htmlFor="phone">Phone Number (Required)</label>
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
                  autoFocus
                />
              </div>
              <span className="field-hint">Required by sports platform for court booking SMS and member check-in</span>
            </div>

            <div className="cl-auth-page__field">
              <label htmlFor="password">Set Local Password (Optional)</label>
              <div className="input-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create backup password for direct sign-in"
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
              <span className="field-hint">Optional: Allows you to sign in with either Google or password in future</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="cl-auth-page__btn-primary"
            >
              <span>{loading ? 'Saving Profile...' : 'Complete & Open Dashboard'}</span>
              <span>→</span>
            </button>
          </form>

          {/* Footer */}
          <div className="cl-auth-page__footer">
            <div className="security-badge">
              <span className="dot" />
              <span>Your phone number is securely encrypted and never shared</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ fontSize: '0.75rem', color: '#9c9a92', textAlign: 'center', padding: '1rem 0' }}>
        Clubhouse Operating System • Enterprise Multi-Tenant Edition
      </footer>
    </div>
  );
}
