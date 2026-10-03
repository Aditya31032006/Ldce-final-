import React, { useState, useEffect, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router';
import Sidebar from './Sidebar.jsx';
import Navbar from './Navbar.jsx';
import MobileDock from './MobileDock.jsx';
import RouteLoader from '../RouteLoader.jsx';
import '../../styles/layout.scss';

/**
 * AppLayout
 * Master shell adhering to Stitch "Court & Ledger" design system.
 * Features:
 * - Desktop fixed sidebar with RBAC navigation grouping
 * - Sticky top navbar with live facility status, search, and profile
 * - Responsive mobile drawer toggle & backdrop blur
 * - Floating iOS/Android bottom dock with RBAC-filtered quick actions
 */
export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close mobile drawer on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  return (
    <div className="cl-app-layout">
      {/* Mobile Backdrop */}
      <div
        className={`cl-app-layout__backdrop ${sidebarOpen ? 'cl-app-layout__backdrop--open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* RBAC-Filtered Desktop & Drawer Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Canvas Area */}
      <div className="cl-app-layout__canvas">
        <Navbar
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />

        <main className="cl-app-layout__content">
          <Suspense fallback={<RouteLoader message="Loading page..." />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* RBAC-Filtered Mobile Floating Bottom Dock */}
      <MobileDock
        onOpenSidebar={() => setSidebarOpen(true)}
      />
    </div>
  );
}
