import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import useAuth from '../hook/useAuth.js';
import '../styles/auth.scss';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading, error, isAuthenticated, resetError } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated) {
      const destination = location.state?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  useEffect(() => {
    return () => {
      resetError();
    };
  }, [resetError]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onLogin = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) return;

    if (error) resetError();
    const result = await login({
      email: formData.email.trim(),
      password: formData.password,
    });

    if (result.success) {
      const destination = location.state?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    }
  };

  const handleGoogleAuth = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/auth/google`;
  };

  return (
    <div className="df-auth-container">
      <div className="df-auth-card">
        <div className="df-auth-card__header">
          <div className="brand-badge">
            <span className="dot" />
            <span>Sports Club Platform</span>
          </div>
          <h1>Welcome Back</h1>
          <p>Sign in to access your club operations & court bookings</p>
        </div>

        {error && (
          <div className="df-auth-alert df-auth-alert--error" style={{ marginBottom: '1rem' }}>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={onLogin} className="df-auth-form">
          <div className="df-form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="name@club.com"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              className="df-input"
            />
          </div>

          <div className="df-form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="password">Password</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              className="df-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="df-btn df-btn--primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{ margin: '1.25rem 0', textAlign: 'center', position: 'relative' }}>
          <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0' }} />
          <span style={{
            position: 'absolute',
            top: '-10px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#ffffff',
            padding: '0 0.75rem',
            color: '#94a3b8',
            fontSize: '0.75rem'
          }}>
            OR
          </span>
        </div>

        <button
          type="button"
          onClick={handleGoogleAuth}
          className="df-btn df-btn--secondary"
          style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
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
          Continue with Google
        </button>

        <div className="df-auth-card__footer" style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
            Register now
          </Link>
        </div>
      </div>
    </div>
  );
}
