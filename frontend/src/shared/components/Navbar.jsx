import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router';
import useAuth from '../../features/auth/hook/useAuth.js';
import '../styles/navbar.scss';

export default function Navbar() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Bookings', path: '/bookings' },
    { label: 'Courts', path: '/courts' },
    { label: 'Members', path: '/members' },
    { label: 'Plans', path: '/plans' },
    { label: 'Bar POS', path: '/bar' },
    { label: 'Inventory', path: '/inventory' },
    { label: 'Orders', path: '/orders' },
    { label: 'Leads', path: '/leads' },
    { label: 'Staff', path: '/hr' },
    { label: 'Reports', path: '/reports' },
  ];

  return (
    <div className="df-navbar-wrapper">
      <nav className={`df-navbar ${mobileMenuOpen ? 'df-navbar--expanded' : ''}`}>
        <div className="df-navbar__top-row">
          {/* Brand Logo */}
          <Link to="/dashboard" className="df-navbar__brand" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
            <div className="df-navbar__brand-logo" style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#2563eb',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1rem'
            }}>
              ⚡
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', lineHeight: 1.1 }}>
                ClubPro 360
              </span>
              <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Sports Management
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', overflowX: 'auto', padding: '0 0.5rem' }} className="df-nav-links-desktop">
            {navItems.slice(0, 7).map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                style={({ isActive }) => ({
                  padding: '0.45rem 0.75rem',
                  fontSize: '0.8125rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#2563eb' : '#475569',
                  background: isActive ? '#eff6ff' : 'transparent',
                  borderRadius: '0.375rem',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                })}
              >
                {item.label}
              </NavLink>
            ))}

            {/* More Dropdown or Extra Links */}
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {navItems.slice(7).map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  style={({ isActive }) => ({
                    padding: '0.45rem 0.75rem',
                    fontSize: '0.8125rem',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#2563eb' : '#64748b',
                    background: isActive ? '#eff6ff' : 'transparent',
                    borderRadius: '0.375rem',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  })}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>

          {/* Right Action / Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link
              to="/profile"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.35rem 0.65rem',
                borderRadius: '9999px',
                background: '#f1f5f9',
                textDecoration: 'none',
                color: '#0f172a',
                fontSize: '0.8125rem',
                fontWeight: 500,
              }}
            >
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user?.fullName || user?.full_name || 'Profile'}
                  referrerPolicy="no-referrer"
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.nextSibling) {
                      e.currentTarget.nextSibling.style.display = 'flex';
                    }
                  }}
                />
              ) : (
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: '#2563eb',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}>
                  {user?.fullName ? user.fullName[0].toUpperCase() : (user?.full_name ? user.full_name[0].toUpperCase() : 'U')}
                </div>
              )}
              <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.fullName || user?.full_name || 'Profile'}
              </span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              style={{
                padding: '0.4rem 0.65rem',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#dc2626',
                cursor: 'pointer',
              }}
            >
              Logout
            </button>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="df-navbar__mobile-toggle"
              style={{
                display: 'none',
                background: 'none',
                border: 'none',
                fontSize: '1.25rem',
                cursor: 'pointer',
              }}
            >
              ☰
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                style={({ isActive }) => ({
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#2563eb' : '#0f172a',
                  background: isActive ? '#eff6ff' : 'transparent',
                  borderRadius: '0.375rem',
                  textDecoration: 'none',
                })}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        )}
      </nav>
    </div>
  );
}
