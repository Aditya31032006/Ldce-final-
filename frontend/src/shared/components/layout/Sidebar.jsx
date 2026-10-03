import React from 'react';
import { NavLink, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  Trophy,
  Calendar,
  Users,
  IdCard,
  ShieldCheck,
  UserPlus,
  Warehouse,
  ShoppingBag,
  Coffee,
  BookOpen,
  BarChart3,
  Building2,
  UserCheck,
  Settings,
  LogOut,
  X,
} from 'lucide-react';

import useAuth from '../../../features/auth/hook/useAuth.js';

/**
 * RBAC Navigation Architecture
 * Defines available navigation sections and allowed roles per item.
 */
const NAVIGATION_SECTIONS = [
  {
    title: 'Operations',
    items: [
      {
        label: 'Dashboard',
        path: '/dashboard',
        icon: LayoutDashboard,
        roles: ['owner', 'manager', 'admin', 'front_desk', 'bar_staff', 'kitchen', 'shop_staff', 'member', 'public'],
      },
      {
        label: 'Courts',
        path: '/courts',
        icon: Trophy,
        roles: ['owner', 'manager', 'admin', 'front_desk', 'member', 'public'],
      },
      {
        label: 'Bookings',
        path: '/bookings',
        icon: Calendar,
        roles: ['owner', 'manager', 'admin', 'front_desk', 'member'],
      },
      {
        label: 'Social Play',
        path: '/social-sessions',
        icon: Users,
        roles: ['owner', 'manager', 'admin', 'front_desk', 'member'],
      },
    ],
  },
  {
    title: 'People',
    items: [
      {
        label: 'Members',
        path: '/members',
        icon: IdCard,
        roles: ['owner', 'manager', 'admin', 'front_desk'],
      },
      {
        label: 'Membership Plans',
        path: '/plans',
        icon: ShieldCheck,
        roles: ['owner', 'manager', 'admin', 'front_desk', 'member'],
      },
      {
        label: 'Leads CRM',
        path: '/leads',
        icon: UserPlus,
        roles: ['owner', 'manager', 'admin', 'front_desk'],
      },
    ],
  },
  {
    title: 'Pro Shop',
    items: [
      {
        label: 'Inventory',
        path: '/inventory',
        icon: Warehouse,
        roles: ['owner', 'manager', 'admin', 'shop_staff', 'member', 'public'],
      },
      {
        label: 'Online Orders',
        path: '/orders',
        icon: ShoppingBag,
        roles: ['owner', 'manager', 'admin', 'shop_staff', 'member', 'public'],
      },
    ],
  },
  {
    title: 'Bar & Cafe',
    items: [
      {
        label: 'Bar POS & Orders',
        path: '/bar',
        icon: Coffee,
        roles: ['owner', 'manager', 'admin', 'bar_staff', 'kitchen', 'front_desk', 'member'],
      },
    ],
  },
  {
    title: 'Finance & Admin',
    items: [
      {
        label: 'Ledger',
        path: '/finance',
        icon: BookOpen,
        roles: ['owner', 'manager', 'admin'],
      },
      {
        label: 'Reports & Analytics',
        path: '/reports',
        icon: BarChart3,
        roles: ['owner', 'manager', 'admin'],
      },
      {
        label: 'Facilities / Clubs',
        path: '/clubs',
        icon: Building2,
        roles: ['owner', 'manager', 'admin'],
      },
    ],
  },
  {
    title: 'Team / HR',
    items: [
      {
        label: 'Staff Management',
        path: '/hr',
        icon: UserCheck,
        roles: ['owner', 'manager', 'admin'],
      },
    ],
  },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, role, clubs, clubId, logout } = useAuth();
  const navigate = useNavigate();

  const userRole = (role || 'public').toLowerCase();
  const isNormalUser = userRole === 'member' || userRole === 'public';

  // Find active club metadata
  const currentClub = clubs?.find((c) => c.id === clubId) || {
    name: user?.club_name || 'Champions Club',
    city: 'Ahmedabad',
    code: 'LDCE',
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Filter sections and items based on current authenticated role
  const filteredSections = NAVIGATION_SECTIONS.map((section) => ({
    ...section,
    items: section.items
      .filter((item) => item.roles.includes(userRole))
      .map((item) => {
        if (item.label === 'Dashboard' && isNormalUser) {
          return { ...item, path: '/user/dashboard' };
        }
        return item;
      }),
  })).filter((section) => section.items.length > 0);


  return (
    <aside className={`cl-app-layout__sidebar ${isOpen ? 'cl-app-layout__sidebar--mobile-open' : ''}`}>
      {/* Sidebar Header: Club Brand */}
      <div className="cl-app-layout__sidebar-header">
        <div className="club-profile-pill">
          <div className="logo-icon">
            {currentClub.name?.charAt(0)?.toUpperCase() || 'C'}
          </div>
          <div className="club-texts">
            <span className="name">{currentClub.name}</span>
            <span className="city">{currentClub.city || 'Clubhouse'}</span>
          </div>
        </div>

        <button
          type="button"
          className="close-mobile-btn"
          onClick={onClose}
          aria-label="Close sidebar menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="cl-app-layout__sidebar-nav">
        <nav>
          {filteredSections.map((section) => (
            <div key={section.title} className="cl-app-layout__nav-group" style={{ marginBottom: '1.15rem' }}>
              <span className="group-title">{section.title}</span>
              {section.items.map((item) => {
                const IconComponent = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => {
                      if (window.innerWidth <= 900) {
                        onClose();
                      }
                    }}
                    className={({ isActive }) =>
                      `cl-app-layout__nav-item ${isActive ? 'cl-app-layout__nav-item--active' : ''}`
                    }
                  >
                    <span className="item-icon">
                      <IconComponent size={16} />
                    </span>
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Sidebar Footer: User Card & Actions */}
      <div className="cl-app-layout__sidebar-footer">
        <div className="user-card">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt={user.full_name || 'User'} className="user-avatar" />
          ) : (
            <div className="user-avatar">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          <div className="user-info">
            <span className="user-name">{user?.full_name || user?.email || 'User'}</span>
            <span className="user-role-badge">{userRole.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
          </div>
        </div>

        <div className="footer-actions">
          <NavLink
            to="/profile"
            className="action-btn"
            onClick={() => {
              if (window.innerWidth <= 900) onClose();
            }}
          >
            <Settings size={14} />
            <span>Profile</span>
          </NavLink>
          <button
            type="button"
            className="action-btn action-btn--logout"
            onClick={handleLogout}
            title="Sign out of platform"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
