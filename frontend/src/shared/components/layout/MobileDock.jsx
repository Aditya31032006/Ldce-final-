import React, { useMemo } from 'react';
import { NavLink } from 'react-router';
import {
  LayoutDashboard,
  Trophy,
  Calendar,
  IdCard,
  Coffee,
  BookOpen,
  ShoppingBag,
  Warehouse,
  Menu,
} from 'lucide-react';

import useAuth from '../../../features/auth/hook/useAuth.js';

function MobileDock({ onOpenSidebar }) {
  const { role } = useAuth();
  const userRole = (role || 'public').toLowerCase();

  // Role-specific primary dock action items (max 4 + 1 "More" button)
  const dockItems = useMemo(() => {
    switch (userRole) {
      case 'owner':
      case 'manager':
      case 'admin':
        return [
          { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
          { label: 'Courts', path: '/courts', icon: Trophy },
          { label: 'Bar POS', path: '/bar', icon: Coffee },
          { label: 'Reports', path: '/reports', icon: BookOpen },
        ];
      case 'front_desk':
        return [
          { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
          { label: 'Courts', path: '/courts', icon: Trophy },
          { label: 'Bookings', path: '/bookings', icon: Calendar },
          { label: 'Members', path: '/members', icon: IdCard },
        ];
      case 'bar_staff':
      case 'kitchen':
        return [
          { label: 'Bar POS', path: '/bar', icon: Coffee },
          { label: 'Orders', path: '/orders', icon: ShoppingBag },
          { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
        ];
      case 'shop_staff':
        return [
          { label: 'Stock', path: '/inventory', icon: Warehouse },
          { label: 'Orders', path: '/orders', icon: ShoppingBag },
          { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
        ];
      case 'member':
      default:
        return [
          { label: 'Overview', path: '/user/dashboard', icon: LayoutDashboard },
          { label: 'Courts', path: '/courts', icon: Trophy },
          { label: 'Bookings', path: '/bookings', icon: Calendar },
          { label: 'Cafe', path: '/bar', icon: Coffee },
        ];
    }
  }, [userRole]);

  return (
    <nav className="cl-app-layout__mobile-dock" aria-label="Mobile Bottom Navigation">
      {dockItems.map((item) => {
        const IconComponent = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `dock-item ${isActive ? 'dock-item--active' : ''}`
            }
          >
            <div className="icon-wrap">
              <IconComponent size={18} />
            </div>
            <span>{item.label}</span>
          </NavLink>
        );
      })}

      {/* More / All Modules Drawer Button */}
      <button
        type="button"
        className="dock-item"
        onClick={onOpenSidebar}
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        aria-label="Open Full App Menu Drawer"
      >
        <div className="icon-wrap">
          <Menu size={18} />
        </div>
        <span>More</span>
      </button>
    </nav>
  );
}

export default React.memo(MobileDock);
