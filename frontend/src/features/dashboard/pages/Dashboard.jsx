import React, { useEffect } from 'react';
import { Link } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboardMetrics } from '../dashboard.slice.js';
import useAuth from '../../auth/hook/useAuth.js';

export default function Dashboard() {
  const dispatch = useDispatch();
  const { user, role, clubId } = useAuth();
  const { metrics, loading } = useSelector((state) => state.dashboard);

  useEffect(() => {
    dispatch(fetchDashboardMetrics());
  }, [dispatch]);

  const cards = [
    { title: "Today's Bookings", value: metrics?.activeBookings ?? '12', change: '+18% vs yesterday', link: '/bookings', color: '#3b82f6' },
    { title: 'Active Members', value: metrics?.totalMembers ?? '248', change: '+5 new this week', link: '/members', color: '#10b981' },
    { title: 'Court Occupancy', value: metrics?.courtOccupancyRate ?? '78%', change: 'Peak hours 18:00 - 22:00', link: '/courts', color: '#8b5cf6' },
    { title: "Today's Revenue", value: `$${metrics?.dailyRevenue ?? '4,850'}`, change: '+12% vs last Friday', link: '/reports', color: '#f59e0b' },
  ];

  const quickLinks = [
    { label: 'Book a Court', path: '/bookings/calendar', icon: '🏸', desc: 'Schedule court time' },
    { label: 'Member Directory', path: '/members', icon: '👥', desc: 'View member passes & accounts' },
    { label: 'Bar & Cafe POS', path: '/bar', icon: '☕', desc: 'Quick order checkout' },
    { label: 'Courts Overview', path: '/courts', icon: '🎾', desc: 'Manage court status' },
    { label: 'Pro Shop Inventory', path: '/inventory', icon: '📦', desc: 'Rackets, balls & equipment' },
    { label: 'Reports & Revenue', path: '/reports', icon: '📈', desc: 'Financial & occupancy metrics' },
  ];

  return (
    <div className="df-page-wrapper">
      <div className="df-page-container">
        {/* Welcome Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em' }}>
                Operations Dashboard
              </h1>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                background: '#eff6ff',
                color: '#2563eb',
                textTransform: 'uppercase',
              }}>
                {role || 'Public'}
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
              Welcome back, <strong>{user?.fullName || user?.full_name || 'Staff'}</strong>. Here is the operational summary for today.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link
              to="/bookings/calendar"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.15rem',
                background: '#2563eb',
                color: '#ffffff',
                borderRadius: '0.5rem',
                fontWeight: 600,
                fontSize: '0.875rem',
                textDecoration: 'none',
                boxShadow: '0 1px 3px rgba(37, 99, 235, 0.3)',
              }}
            >
              <span>+ New Booking</span>
            </Link>
          </div>
        </div>

        {/* Metrics Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2.5rem',
        }}>
          {cards.map((card, idx) => (
            <Link
              key={idx}
              to={card.link}
              style={{
                textDecoration: 'none',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '0.875rem',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
              }}
            >
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {card.title}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: '0.5rem 0' }}>
                {card.value}
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#10b981', fontWeight: 500 }}>
                {card.change}
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Launchpad */}
        <div style={{
          background: '#ffffff',
          borderRadius: '1rem',
          border: '1px solid #e2e8f0',
          padding: '1.75rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '1.25rem' }}>
            Quick Modules
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1rem',
          }}>
            {quickLinks.map((ql, idx) => (
              <Link
                key={idx}
                to={ql.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem 1.25rem',
                  borderRadius: '0.75rem',
                  border: '1px solid #f1f5f9',
                  background: '#f8fafc',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#eff6ff';
                  e.currentTarget.style.borderColor = '#bfdbfe';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.borderColor = '#f1f5f9';
                }}
              >
                <span style={{ fontSize: '1.75rem' }}>{ql.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#0f172a' }}>{ql.label}</div>
                  <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>{ql.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
