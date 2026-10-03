import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import useAuth from '../hook/useAuth.js';
import '../styles/auth.scss';

export default function Register() {
  const navigate = useNavigate();
  const { register: registerUser, loading, error, resetError } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onRegister = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.fullName) return;

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
    <div className="df-auth-container">
      <div className="df-auth-card">
        <div className="df-auth-card__header">
          <div className="brand-badge">
            <span className="dot" />
            <span>Sports Club Platform</span>
          </div>
          <h1>Create an Account</h1>
          <p>Join the club platform to manage bookings & memberships</p>
        </div>

        {error && (
          <div className="df-auth-alert df-auth-alert--error" style={{ marginBottom: '1rem' }}>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={onRegister} className="df-auth-form">
          <div className="df-form-group">
            <label htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              placeholder="Alex Morgan"
              value={formData.fullName}
              onChange={handleChange}
              disabled={loading}
              className="df-input"
            />
          </div>

          <div className="df-form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="alex@example.com"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              className="df-input"
            />
          </div>

          <div className="df-form-group">
            <label htmlFor="phone">Phone (Optional)</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={formData.phone}
              onChange={handleChange}
              disabled={loading}
              className="df-input"
            />
          </div>

          <div className="df-form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="Minimum 8 characters"
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
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <div className="df-auth-card__footer" style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
