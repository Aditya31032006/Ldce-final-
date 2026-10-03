import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import ProtectedRoute from '../features/auth/components/ProtectedRoute.jsx';
import PublicRoute from '../features/auth/components/PublicRoute.jsx';
import RoleGuard from '../features/auth/components/RoleGuard.jsx';

// Lazy-loaded page views
const Login = lazy(() => import('../features/auth/pages/Login.jsx'));
const Register = lazy(() => import('../features/auth/pages/Register.jsx'));
const SetupProfile = lazy(() => import('../features/auth/pages/SetupProfile.jsx'));
const Profile = lazy(() => import('../features/auth/pages/Profile.jsx'));

const Dashboard = lazy(() => import('../features/dashboard/pages/Dashboard.jsx'));
const UserDashboard = lazy(() => import('../features/dashboard/pages/UserDashboard.jsx'));
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

// Sleek loading fallback for Suspense transitions matching Court & Ledger aesthetic
const RouteLoader = () => (
  <div style={{
    minHeight: '60vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: '1rem',
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
    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Loading view...</span>
  </div>
);

const withSuspense = (Component, props = {}) => (
  <Suspense fallback={<RouteLoader />}>
    <Component {...props} />
  </Suspense>
);

import useAuth from '../features/auth/hook/useAuth.js';


// Role-aware root and dashboard redirector
function StaffDashboardRoute() {
  const { role } = useAuth();
  const userRole = (role || 'public').toLowerCase();
  if (userRole === 'member' || userRole === 'public') {
    return <Navigate to="/user/dashboard" replace />;
  }
  return (
    <Suspense fallback={<RouteLoader />}>
      <Dashboard />
    </Suspense>
  );
}

function UserDashboardRoute() {
  const { role } = useAuth();
  const userRole = (role || 'public').toLowerCase();
  if (userRole !== 'member' && userRole !== 'public') {
    return <Navigate to="/dashboard" replace />;
  }
  return (
    <Suspense fallback={<RouteLoader />}>
      <UserDashboard />
    </Suspense>
  );
}

function RoleBasedRoot() {
  const { role } = useAuth();
  const userRole = (role || 'public').toLowerCase();
  if (userRole === 'member' || userRole === 'public') {
    return <Navigate to="/user/dashboard" replace />;
  }
  return <Navigate to="/dashboard" replace />;
}

export const router = createBrowserRouter([
  // Protected Routes (Require active authentication session)
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <RoleBasedRoot />,
      },
      // Admin / Staff Operational Dashboard (Protected against normal members)
      {
        path: '/dashboard',
        element: <StaffDashboardRoute />,
      },
      // Normal Member / Public Dashboard (Protected against admin/staff)
      {
        path: '/user/dashboard',
        element: <UserDashboardRoute />,
      },

      // Shared Member & Front-Desk Play Operations
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
        path: '/orders',
        element: withSuspense(OrdersList),
      },
      {
        path: '/profile',
        element: withSuspense(Profile),
      },

      // Front Desk & Management Protected Operations (Hidden from normal members)
      {
        element: <RoleGuard allowedRoles={['owner', 'manager', 'admin', 'front_desk']} />,
        children: [
          {
            path: '/members',
            element: withSuspense(MembersList),
          },
          {
            path: '/leads',
            element: withSuspense(LeadsList),
          },
        ],
      },

      // Shop Staff & Management Inventory Operations (Hidden from normal members)
      {
        element: <RoleGuard allowedRoles={['owner', 'manager', 'admin', 'shop_staff']} />,
        children: [
          {
            path: '/inventory',
            element: withSuspense(InventoryList),
          },
        ],
      },

      // Executive Manager & Owner Protected Operations (Hidden from staff & members)
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


  // Public Guest Routes (Accessible when logged out)
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

  // OAuth Profile Completion Route (Accessible during post-OAuth redirect or profile setup)
  {
    path: '/setup-profile',
    element: withSuspense(SetupProfile),
  },

  // Fallback catch-all -> redirect to root
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default router;
