import React from 'react';
import useAuth from '../hook/useAuth.js';

export default function Profile() {
  const { user, role, clubId, logout } = useAuth();

  return (
    <div className="df-page-wrapper">
      <div className="df-page-container">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>My Profile</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Manage your account settings and club role preferences</p>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: '0.75rem',
          border: '1px solid #e2e8f0',
          padding: '2rem',
          maxWidth: '640px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.75rem' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#2563eb',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 700
            }}>
              {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a' }}>{user?.full_name || 'User'}</h2>
              <span style={{
                display: 'inline-block',
                marginTop: '0.25rem',
                padding: '0.2rem 0.6rem',
                background: '#eff6ff',
                color: '#1d4ed8',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase'
              }}>
                {role || 'Public User'}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '2rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Email Address</label>
              <div style={{ fontSize: '0.95rem', color: '#0f172a', marginTop: '0.25rem', fontWeight: 500 }}>{user?.email || 'N/A'}</div>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Phone</label>
              <div style={{ fontSize: '0.95rem', color: '#0f172a', marginTop: '0.25rem', fontWeight: 500 }}>{user?.phone || 'Not provided'}</div>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Active Club ID</label>
              <div style={{ fontSize: '0.95rem', color: '#0f172a', marginTop: '0.25rem', fontWeight: 500 }}>{clubId || 'None'}</div>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Account ID</label>
              <div style={{ fontSize: '0.95rem', color: '#0f172a', marginTop: '0.25rem', fontWeight: 500 }}>{user?.id || 'N/A'}</div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', marginBottom: '1.5rem' }} />

          <button
            type="button"
            onClick={logout}
            className="df-btn df-btn--danger"
            style={{
              padding: '0.5rem 1rem',
              background: '#ef4444',
              color: '#ffffff',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
