import React, { Suspense } from 'react';
import { Navigate, Outlet, Link } from 'react-router';
import useAuth from '../hook/useAuth.js';
import RouteLoader from '../../../shared/components/RouteLoader.jsx';

/**
 * RoleGuard Component:
 * Restricts access to nested routes based on allowed user roles.
 * Allowed roles in the platform: 'admin', 'owner', 'manager', 'front_desk', 'coach', 'member', 'shop_staff', 'bar_staff'
 */
export default function RoleGuard({ allowedRoles = [], fallback = null }) {
  const { user, role, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <RouteLoader message="Verifying permissions..." />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Admin and Owner have universal access across the platform
  if (role === 'admin' || role === 'owner') {
    return (
      <Suspense fallback={<RouteLoader message="Loading restricted area..." />}>
        <Outlet />
      </Suspense>
    );
  }

  // Check if current role matches allowed roles
  const isAllowed = allowedRoles.length === 0 || allowedRoles.includes(role);

  if (!isAllowed) {
    if (fallback) return fallback;

    return (
      <div style={{
        padding: '3rem 2rem',
        maxWidth: '560px',
        margin: '4rem auto',
        textAlign: 'center',
        background: '#ffffff',
        borderRadius: '1rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
        <h2 style={{ color: '#0f172a', marginBottom: '0.75rem', fontSize: '1.5rem', fontWeight: 700 }}>Access Restricted</h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
          Your current role (<strong style={{ color: '#2563eb' }}>{role || 'Public User'}</strong>) does not have permission to view or manage this module.
        </p>
        <Link
          to="/dashboard"
          style={{
            display: 'inline-block',
            padding: '0.625rem 1.25rem',
            background: '#2563eb',
            color: '#ffffff',
            borderRadius: '0.5rem',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
          }}
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <Suspense fallback={<RouteLoader message="Loading restricted area..." />}>
      <Outlet />
    </Suspense>
  );
}
