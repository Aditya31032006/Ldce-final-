import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import ProtectedRoute from '../features/auth/components/ProtectedRoute.jsx';
import PublicRoute from '../features/auth/components/PublicRoute.jsx';
import RoleGuard from '../features/auth/components/RoleGuard.jsx';

// Lazy-loaded page views
const LandingPage = lazy(() => import('../features/landing/pages/LandingPage.jsx'));
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
const BarPOS = lazy(() => import('../features/bar/pages/BarPOS.jsx'));
const InventoryList = lazy(() => import('../features/inventory/pages/InventoryList.jsx'));
const OrdersList = lazy(() => import('../features/orders/pages/OrdersList.jsx'));
const StaffManagement = lazy(() => import('../features/hr/pages/StaffManagement.jsx'));
const ReportsDashboard = lazy(() => import('../features/reports/pages/ReportsDashboard.jsx'));
const ClubDetailsPage = lazy(() => import('../features/clubs/pages/ClubDetailsPage.jsx'));

import RouteLoader from '../shared/components/RouteLoader.jsx';

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

// If visitor is NOT logged in -> LandingPage
// If visitor IS logged in -> Redirect to respective dashboard
function PublicLandingOrDashboard() {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) {
    return <RouteLoader />;
  }

  if (!isAuthenticated) {
    return withSuspense(LandingPage);
  }

  const userRole = (role || 'public').toLowerCase();
  if (userRole === 'member' || userRole === 'public') {
    return <Navigate to="/user/dashboard" replace />;
  }
  return <Navigate to="/dashboard" replace />;
}

export const router = createBrowserRouter([
  // Public Root: Landing page for unauthenticated visitors, dashboard redirect for authenticated users
  {
    path: '/',
    element: <PublicLandingOrDashboard />,
  },
  // Dedicated Landing Page route
  {
    path: '/landing',
    element: withSuspense(LandingPage),
  },
  // Public & Scoped Club Portal (Accessible by buyers, visitors, and members)
  {
    path: '/clubs/:clubId',
    element: withSuspense(ClubDetailsPage),
  },
  {
    path: '/club/:slug',
    element: withSuspense(ClubDetailsPage),
  },
  {
    path: '/clubs/:clubId/:tab',
    element: withSuspense(ClubDetailsPage),
  },
  {
    path: '/club/:slug/:tab',
    element: withSuspense(ClubDetailsPage),
  },

  // Protected Routes (Require active authentication session)
  {
    element: <ProtectedRoute />,
    children: [
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

      // User Profile (Accessible to all authenticated users)
      {
        path: '/profile',
        element: withSuspense(Profile),
      },

      // Front Desk & Court Operations (Owner, Manager, Admin, Front Desk)
      {
        element: <RoleGuard allowedRoles={['owner', 'manager', 'admin', 'front_desk']} />,
        children: [
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
        ],
      },

      // Pro Shop Store & Inventory (Accessible to all authenticated users: staff manages inventory, members purchase gear)
      {
        path: '/inventory',
        element: withSuspense(InventoryList),
      },

      // Pro Shop Orders (Accessible to all authenticated users: staff manages fulfillment, members view order history)
      {
        path: '/orders',
        element: withSuspense(OrdersList),
      },

      // Bar & Cafe Operations (Owner, Manager, Admin, Bar Staff, Kitchen, Front Desk)
      {
        element: <RoleGuard allowedRoles={['owner', 'manager', 'admin', 'bar_staff', 'kitchen', 'front_desk']} />,
        children: [
          {
            path: '/bar',
            element: withSuspense(BarPOS),
          },
          {
            path: '/pos',
            element: withSuspense(BarPOS),
          },
        ],
      },

      // Executive Management: Plans, Staff HR & Reports (Owner, Manager, Admin)
      {
        element: <RoleGuard allowedRoles={['owner', 'manager', 'admin']} />,
        children: [
          {
            path: '/plans',
            element: withSuspense(MembershipPlans),
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
