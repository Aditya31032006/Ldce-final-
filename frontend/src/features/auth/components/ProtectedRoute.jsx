import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import useAuth from '../hook/useAuth.js';
import Navbar from '../../../shared/components/Navbar.jsx';

/**
 * ProtectedRoute Component
 * Guards private routes. Renders a loading state during session verification,
 * redirects unauthenticated visitors to /login, prompts for profile setup if required fields are missing,
 * and renders Navbar + Outlet for authenticated users.
 */
export default function ProtectedRoute() {
  const { isAuthenticated, isProfileComplete, loading } = useAuth();
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
        background: '#fcf9f5',
        color: '#6b6b66',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          border: '3px solid rgba(31, 92, 70, 0.2)',
          borderTopColor: '#1f5c46',
          borderRadius: '50%',
          animation: 'df-spin 0.8s linear infinite'
        }} />
        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Verifying session...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user signed up with Google but hasn't entered phone number yet
  if (!isProfileComplete && location.pathname !== '/setup-profile') {
    return <Navigate to="/setup-profile" replace />;
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
