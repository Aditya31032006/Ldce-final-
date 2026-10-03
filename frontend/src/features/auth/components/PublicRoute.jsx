import React from 'react';
import { Navigate, Outlet } from 'react-router';
import useAuth from '../hook/useAuth.js';

/**
 * PublicRoute Component
 * Guards guest-only routes (/login, /register).
 * If the user is already authenticated, redirects them to '/'.
 * If unauthenticated, renders the guest page via Outlet.
 */
export default function PublicRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        color: '#64748b',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid rgba(59, 130, 246, 0.2)',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'df-spin 0.8s linear infinite'
        }} />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
