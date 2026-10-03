import React from 'react';
import { Navigate, Outlet } from 'react-router';
import useAuth from '../hook/useAuth.js';

/**
 * PublicRoute Component
 * Guards guest-only routes (/login, /register).
 * If the user is already authenticated, redirects them to '/dashboard' (or '/setup-profile' if incomplete).
 * If unauthenticated, renders the guest page via Outlet.
 */
export default function PublicRoute() {
  const { isAuthenticated, isProfileComplete, role, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fcf9f5',
        color: '#6b6b66',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid rgba(31, 92, 70, 0.2)',
          borderTopColor: '#1f5c46',
          borderRadius: '50%',
          animation: 'df-spin 0.8s linear infinite'
        }} />
      </div>
    );
  }

  if (isAuthenticated) {
    if (!isProfileComplete) {
      return <Navigate to="/setup-profile" replace />;
    }
    const userRole = (role || 'public').toLowerCase();
    if (userRole === 'member' || userRole === 'public') {
      return <Navigate to="/user/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
