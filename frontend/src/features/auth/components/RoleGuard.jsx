import React, { Suspense } from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router';
import useAuth from '../hook/useAuth.js';
import RouteLoader from '../../../shared/components/RouteLoader.jsx';

/**
 * RoleGuard Component:
 * Restricts access to nested routes based on allowed user roles.
 * Prevents URL tampering between Admin/Staff and Normal Member users.
 */
export default function RoleGuard({ allowedRoles = [], fallback = null, redirectTo = null }) {
  const { user, role, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        color: '#6b6b66',
        fontFamily: 'Inter, sans-serif'
      }}>
        Verifying permissions...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRole = (role || 'public').toLowerCase();
  const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase());

  // Check if current role is explicitly in allowedRoles
  const isAllowed = normalizedAllowed.length === 0 || normalizedAllowed.includes(userRole);

  if (!isAllowed) {
    // If an explicit redirection route is provided, redirect immediately
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }

    // Role-aware default destination
    const defaultDashboard = (userRole === 'member' || userRole === 'public')
      ? '/user/dashboard'
      : '/dashboard';

    if (fallback) return fallback;

    return (
      <div style={{
        padding: '3rem 2rem',
        maxWidth: '520px',
        margin: '4rem auto',
        textAlign: 'center',
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e7e5df',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔒</div>
        <h2 style={{ color: '#1c1c1a', marginBottom: '0.5rem', fontSize: '1.25rem', fontWeight: 600 }}>
          Access Restricted
        </h2>
        <p style={{ color: '#6b6b66', fontSize: '0.875rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
          Your account role (<strong style={{ color: '#1f5c46' }}>{userRole.replace('_', ' ')}</strong>) does not have permission to view or manage this module.
        </p>
        <Link
          to={defaultDashboard}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1.25rem',
            background: '#1f5c46',
            color: '#ffffff',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.8125rem',
          }}
        >
          Return to Your Dashboard
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

