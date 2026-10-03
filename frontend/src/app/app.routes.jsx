import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import ProtectedRoute from '../features/auth/components/ProtectedRoute.jsx';
import PublicRoute from '../features/auth/components/PublicRoute.jsx';
import RoleGuard from '../features/auth/components/RoleGuard.jsx';

// Lazy-loaded page views
const Login = lazy(() => import('../features/auth/pages/Login.jsx'));
const Register = lazy(() => import('../features/auth/pages/Register.jsx'));
const Profile = lazy(() => import('../features/auth/pages/Profile.jsx'));

const Dashboard = lazy(() => import('../features/dashboard/pages/Dashboard.jsx'));
const BookingsList = lazy(() => import('../features/bookings/pages/BookingsList.jsx'));
const BookingCalendar = lazy(() => import('../features/bookings/pages/BookingCalendar.jsx'));
const CourtsManagement = lazy(() => import('../features/courts/pages/CourtsManagement.jsx'));
const MembersList = lazy(() => import('../features/members/pages/MembersList.jsx'));
const MembershipPlans = lazy(() => import('../features/plans/pages/MembershipPlans.jsx'));
const SocialSessionsList = lazy(() => import('../features/socialSessions/pages/SocialSessionsList.jsx'));
const BarPOS = lazy(() => import('../features/bar/pages/BarPOS.jsx'));
const InventoryList = lazy(() => import('../features/inventory/pages/InventoryList.jsx'));
const OrdersList = lazy(() => import('../features/orders/pages/OrdersList.jsx'));
const LeadsList = lazy(() => import('../features/leads/pages/LeadsList.jsx'));
const FinanceDashboard = lazy(() => import('../features/finance/pages/FinanceDashboard.jsx'));
const StaffManagement = lazy(() => import('../features/hr/pages/StaffManagement.jsx'));
const ReportsDashboard = lazy(() => import('../features/reports/pages/ReportsDashboard.jsx'));
const ClubsList = lazy(() => import('../features/clubs/pages/ClubsList.jsx'));

// Sleek loading fallback for Suspense transitions
const RouteLoader = () => (
  <div style={{
    minHeight: '60vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: '1rem',
    color: '#94a3b8',
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
    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Loading view...</span>
  </div>
);

const withSuspense = (Component, props = {}) => (
  <Suspense fallback={<RouteLoader />}>
    <Component {...props} />
  </Suspense>
);

export const router = createBrowserRouter([
  // Protected Routes (Require active authentication session)
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: '/dashboard',
        element: withSuspense(Dashboard),
      },
      {
        path: '/bookings',
        element: withSuspense(BookingsList),
      },
      {
        path: '/bookings/calendar',
        element: withSuspense(BookingCalendar),
      },
      {
        path: '/courts',
        element: withSuspense(CourtsManagement),
      },
      {
        path: '/members',
        element: withSuspense(MembersList),
      },
      {
        path: '/plans',
        element: withSuspense(MembershipPlans),
      },
      {
        path: '/social-sessions',
        element: withSuspense(SocialSessionsList),
      },
      {
        path: '/bar',
        element: withSuspense(BarPOS),
      },
      {
        path: '/inventory',
        element: withSuspense(InventoryList),
      },
      {
        path: '/orders',
        element: withSuspense(OrdersList),
      },
      {
        path: '/leads',
        element: withSuspense(LeadsList),
      },
      {
        path: '/profile',
        element: withSuspense(Profile),
      },

      // Manager & Owner Protected Operations
      {
        element: <RoleGuard allowedRoles={['owner', 'manager', 'admin']} />,
        children: [
          {
            path: '/clubs',
            element: withSuspense(ClubsList),
          },
          {
            path: '/finance',
            element: withSuspense(FinanceDashboard),
          },
          {
            path: '/hr',
            element: withSuspense(StaffManagement),
          },
          {
            path: '/reports',
            element: withSuspense(ReportsDashboard),
          },
        ],
      },
    ],
  },

  // Public Guest Routes (Accessible only when logged out)
  {
    element: <PublicRoute />,
    children: [
      {
        path: '/login',
        element: withSuspense(Login),
      },
      {
        path: '/register',
        element: withSuspense(Register),
      },
    ],
  },

  // Fallback catch-all -> redirect to root
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default router;
