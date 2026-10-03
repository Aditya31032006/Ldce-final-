import React from 'react';
import { Navigate, useLocation } from 'react-router';
import useAuth from '../hook/useAuth.js';
import AppLayout from '../../../shared/components/layout/AppLayout.jsx';
import RouteLoader from '../../../shared/components/RouteLoader.jsx';

/**
 * ProtectedRoute Component
 * Guards private routes. Renders a loading state during session verification,
 * redirects unauthenticated visitors to /login, prompts for profile setup if required fields are missing,
 * and renders AppLayout (Sidebar, Navbar, Mobile Dock, and child views) for authenticated users.
 */
export default function ProtectedRoute() {
  const { isAuthenticated, isProfileComplete, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <RouteLoader message="Verifying session..." fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user signed up with Google but hasn't entered phone number yet
  if (!isProfileComplete && location.pathname !== '/setup-profile') {
    return <Navigate to="/setup-profile" replace />;
  }

  return <AppLayout />;
}

