import React, { Suspense } from 'react';
import { Navigate, Outlet } from 'react-router';
import useAuth from '../hook/useAuth.js';
import RouteLoader from '../../../shared/components/RouteLoader.jsx';

/**
 * PublicRoute Component
 * Guards guest-only routes (/login, /register).
 * If the user is already authenticated, redirects them to '/dashboard' (or '/setup-profile' if incomplete).
 * If unauthenticated, renders the guest page via Outlet.
 */
export default function PublicRoute() {
  const { isAuthenticated, isProfileComplete, role, loading } = useAuth();

  if (loading) {
    return <RouteLoader message="Checking authentication..." fullScreen />;
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

  return (
    <Suspense fallback={<RouteLoader message="Loading..." fullScreen />}>
      <Outlet />
    </Suspense>
  );
}
