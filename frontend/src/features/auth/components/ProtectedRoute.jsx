import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import useAuth from '../hook/useAuth.js';
import Navbar from '../../../shared/components/Navbar.jsx';

/**
 * ProtectedRoute Component
 * Guards private routes. Renders a loading state during session verification,
 * redirects unauthenticated visitors to /login, and renders Navbar + Outlet for authenticated users.
 */
export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem',
        background: '#f8fafc',
        color: '#64748b',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          border: '3px solid rgba(59, 130, 246, 0.2)',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'df-spin 0.8s linear infinite'
        }} />
        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Verifying session...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="app-container">
      <Navbar />
      <main className="app-main-content">
        <Outlet />
      </main>
    </div>
  );
}
