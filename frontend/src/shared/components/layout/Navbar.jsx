import React from 'react';
import { Menu, Search, Bell } from 'lucide-react';
import { Link } from 'react-router';
import useAuth from '../../../features/auth/hook/useAuth.js';

export default function Navbar({ onToggleSidebar }) {
  const { user, role, clubs, clubId, changeClub } = useAuth();
  const userRole = (role || 'public').toLowerCase();

  const handleClubChange = (e) => {
    const selectedId = e.target.value;
    const targetClub = clubs?.find((c) => c.id === selectedId);
    if (targetClub) {
      changeClub(targetClub.id, targetClub.role || role);
    }
  };

  return (
    <header className="cl-app-layout__navbar">
      {/* Navbar Left: Mobile Menu & Search Bar */}
      <div className="nav-left">
        <button
          type="button"
          className="hamburger-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle Navigation Menu"
        >
          <Menu size={20} />
        </button>

        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Search members, bookings, courts, orders..."
            aria-label="Global quick search"
          />
          <kbd>⌘K</kbd>
        </div>
      </div>

      {/* Navbar Right: Status Pill, Club Switcher, Alerts & User */}
      <div className="nav-right">
        {/* Live Facility Status Indicator */}
        <div className="status-pill" title="Court management engine active">
          <span className="dot" />
          <span>Open • Courts Live</span>
        </div>

        {/* Multi-Club Switcher (when user is attached to multiple clubs) */}
        {clubs && clubs.length > 1 && (
          <select
            className="club-switcher-select"
            value={clubId || ''}
            onChange={handleClubChange}
            aria-label="Select Active Club"
          >
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.city || 'Club'})
              </option>
            ))}
          </select>
        )}

        {/* Notifications Icon */}
        <button
          type="button"
          className="notification-btn"
          aria-label="Notifications"
          title="3 Unread Alerts"
        >
          <Bell size={18} />
          <span className="unread-dot" />
        </button>

        <div className="divider-line" />

        {/* User Pill / Avatar */}
        <Link
          to="/profile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.name || 'User'}
              style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: '#1f5c46',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '0.8rem',
              }}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          <div style={{ display: 'none', flexDirection: 'column', textAlign: 'left' }} className="user-text-preview">
            <span style={{ fontSize: '0.8rem', fontWeight: 600, lineHeight: 1.1 }}>
              {user?.name || 'Member'}
            </span>
            <span style={{ fontSize: '0.65rem', color: '#6b6b66', textTransform: 'capitalize' }}>
              {userRole.replace('_', ' ')}
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
}
