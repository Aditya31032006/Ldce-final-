import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Search,
  X,
  MapPin,
  Trophy,
  Calendar,
  Building2,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  ShoppingBag,
  Clock,
} from 'lucide-react';
import useAuth from '../../auth/hook/useAuth.js';
import useUserDashboard from '../../clubs/hooks/useUserDashboard.js';
import apiClient from '../../../shared/services/api.js';
import '../styles/user-dashboard.scss';

function UserDashboard() {
  const { user, changeClub } = useAuth();
  const navigate = useNavigate();

  const [userBookings, setUserBookings] = useState([]);
  const [userOrders, setUserOrders] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

  const {
    myClubs,
    loadingMyClubs,
    clubs,
    loadingClubs,
    loadingMore,
    hasMore,
    searchTerm,
    setSearchTerm,
    selectedSport,
    setSelectedSport,
    availableSports,
    observerRef,
    handleJoinClub,
    joiningClubId,
    toastMessage,
    clearToast,
  } = useUserDashboard();

  useEffect(() => {
    async function fetchUserActivity() {
      try {
        setLoadingActivity(true);
        const [bookingsRes, ordersRes] = await Promise.all([
          apiClient.get('/bookings', { params: { user_only: 'true' } }).catch(() => ({ data: { bookings: [] } })),
          apiClient.get('/orders').catch(() => ({ data: { orders: [] } })),
        ]);
        setUserBookings(bookingsRes.data?.bookings || []);
        setUserOrders(ordersRes.data?.orders || []);
      } catch (err) {
        console.warn('Could not load user activity:', err);
      } finally {
        setLoadingActivity(false);
      }
    }
    fetchUserActivity();

    const handleUpdate = () => fetchUserActivity();
    const handleStorage = (e) => {
      if (e.key === 'ldce_booking_updated' || e.key === 'ldce_tables_updated') {
        fetchUserActivity();
      }
    };
    window.addEventListener('booking-updated', handleUpdate);
    window.addEventListener('court-booked', handleUpdate);
    window.addEventListener('order-placed', handleUpdate);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('booking-updated', handleUpdate);
      window.removeEventListener('court-booked', handleUpdate);
      window.removeEventListener('order-placed', handleUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Dynamic sports from database
  const sportOptions = useMemo(() => {
    if (!availableSports || availableSports.length === 0) return [];
    return ['All', ...availableSports];
  }, [availableSports]);

  // Joined club IDs for quick lookup
  const joinedClubIds = useMemo(() => new Set(myClubs.map((c) => c.id)), [myClubs]);

  const handleSelectClub = useCallback((club) => {
    if (changeClub) {
      changeClub(club.id, club.user_role || 'member');
    }
    navigate(`/club/${club.slug || club.id}`);
  }, [changeClub, navigate]);

  // Time-of-day greeting (memoized)
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);


  return (
    <div className="cl-user-dashboard">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`dashboard-toast dashboard-toast--${toastMessage.type}`}>
          <span>{toastMessage.text}</span>
          <button type="button" onClick={clearToast} aria-label="Close notification">
            ×
          </button>
        </div>
      )}

      {/* Welcome Banner */}
      <section className="cl-user-dashboard__header">
        <div className="welcome-text">
          <h1>
            {greeting}, {user?.name?.split(' ')[0] || 'Athlete'} 👋
          </h1>

          <p>Explore athletic clubs, manage your court memberships, and book your next match.</p>
        </div>

        <div className="header-stats">
          <div className="stat-chip">
            <span className="stat-val">{myClubs.length}</span>
            <span className="stat-lbl">Joined Clubs</span>
          </div>
          <div className="stat-chip">
            <span className="stat-val">
              {myClubs.reduce((acc, c) => acc + (c.total_courts || 0), 0)}
            </span>
            <span className="stat-lbl">Courts Available</span>
          </div>
          <div className="stat-chip">
            <span className="stat-val">{userBookings.length}</span>
            <span className="stat-lbl">My Bookings</span>
          </div>
          <div className="stat-chip">
            <span className="stat-val">{userOrders.length}</span>
            <span className="stat-lbl">My Orders</span>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 0: YOUR ACTIVE COURT RESERVATIONS & ORDERS */}
      {/* ------------------------------------------------------------------ */}
      {(userBookings.length > 0 || userOrders.length > 0) && (
        <section style={{ marginBottom: '2.5rem' }}>
          <div className="cl-user-dashboard__section-title">
            <div className="title-left">
              <h2>Your Active Reservations & Orders</h2>
              <span className="count-badge">{userBookings.length + userOrders.length}</span>
            </div>
            <span className="title-subtitle">Confirmed court reservations and placed cafe/bar orders</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {/* Recent Bookings */}
            {userBookings.map((b) => {
              const dateStr = b.start_at
                ? new Date(b.start_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : (b.date || 'Today');
              const timeStr = b.start_at && b.end_at
                ? `${new Date(b.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} - ${new Date(b.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`
                : (b.time || '1-Hour Slot');

              return (
                <div
                  key={b.id}
                  style={{
                    background: '#FFFFFF',
                    border: '1.5px solid #A7F3D0',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1F5C46', background: '#ECFDF5', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                        🏸 COURT RESERVATION
                      </span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#047857', background: '#D1FAE5', padding: '0.2rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase' }}>
                        ● {b.status || 'Confirmed'}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0.25rem 0' }}>
                      {b.court_name || 'Athletic Court'}
                    </h3>
                    <div style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.35rem' }}>
                      <Calendar size={14} color="#1F5C46" />
                      <span>{dateStr} • {timeStr}</span>
                    </div>
                  </div>

                  <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                    <span style={{ color: '#64748b' }}>Booking Ref: #{String(b.id).slice(0, 8).toUpperCase()}</span>
                    <span style={{ fontWeight: 800, color: '#1F5C46' }}>
                      {b.total_amount ? `₹${b.total_amount}` : 'Free Member Quota'}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Recent Orders */}
            {userOrders.map((o) => (
              <div
                key={o.id}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563EB', background: '#EFF6FF', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                      ☕ CAFE / BAR ORDER
                    </span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563EB', background: '#DBEAFE', padding: '0.2rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase' }}>
                      ● {o.status || 'Confirmed'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '0.25rem 0' }}>
                    Order #{o.order_no || String(o.id).slice(0, 8).toUpperCase()}
                  </h3>
                  <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.25rem' }}>
                    {Array.isArray(o.items) && o.items.length > 0
                      ? o.items.map(i => `${i.quantity}× ${i.item_name || i.name}`).join(', ')
                      : 'Bar / Cafe items'}
                  </div>
                </div>

                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                  <span style={{ color: '#64748b' }}>Paid & Placed</span>
                  <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>
                    ₹{Number(o.total || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 1: CLUBS YOU'VE JOINED */}
      {/* ------------------------------------------------------------------ */}
      <section className="cl-user-dashboard__joined-section">
        <div className="cl-user-dashboard__section-title">
          <div className="title-left">
            <h2>Clubs You've Joined</h2>
            <span className="count-badge">{myClubs.length}</span>
          </div>
          <span className="title-subtitle">Your active memberships & court privileges</span>
        </div>

        {loadingMyClubs ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b6b66' }}>
            <span>Loading your clubs...</span>
          </div>
        ) : myClubs.length > 0 ? (
          <div className="cl-user-dashboard__joined-grid">
            {myClubs.map((club) => (
              <div key={club.id} className="joined-card">
                {/* Card Cover */}
                <div className="joined-cover">
                  {club.cover_url ? (
                    <img src={club.cover_url} alt={club.name} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: '#2d6952' }} />
                  )}
                  <div className="cover-overlay" />
                  <span className="role-tag">{club.user_role || 'Member'}</span>
                </div>

                {/* Card Body */}
                <div className="joined-body">
                  <div className="brand-row">
                    {club.logo_url ? (
                      <img src={club.logo_url} alt={club.name} className="club-logo" />
                    ) : (
                      <div className="club-logo">
                        {club.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="club-names">
                      <h3 className="name" title={club.name}>{club.name}</h3>
                      <span className="city">{club.city || ''}</span>
                    </div>
                  </div>

                  {/* Member Details Pill */}
                  <div className="member-details">
                    <div className="code-box">
                      <span className="lbl">Pass ID</span>
                      <span className="code">{club.member_code || club.user_role?.toUpperCase() || 'MEMBER'}</span>
                    </div>
                    <span className="active-pill">
                      <CheckCircle2 size={13} /> Active
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="card-actions">
                    <button
                      type="button"
                      className="btn-enter"
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={() => handleSelectClub(club)}
                    >
                      <span>View Club Portal</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-joined-box">
            <div className="empty-icon">
              <Building2 size={24} />
            </div>
            <h3>You haven't joined any clubs yet</h3>
            <p>
              Browse existing athletic clubs below, explore their courts and amenities, and join in one click.
            </p>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 2: EXPLORE & DISCOVER CLUBS */}
      {/* ------------------------------------------------------------------ */}
      <section className="cl-user-dashboard__explore-section">
        <div className="cl-user-dashboard__section-title">
          <div className="title-left">
            <h2>Explore & Discover Clubs</h2>
            <span className="count-badge">
              <Sparkles size={12} style={{ display: 'inline', marginRight: '4px' }} />
              Live Directory
            </span>
          </div>
        </div>

        {/* Debounced Search Input & Sport Filters */}
        <div className="cl-user-dashboard__search-container">
          <div className="search-input-wrap">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search clubs by name, sport, or city..."
              aria-label="Search clubs with fuzzy search"
            />
            {searchTerm && (
              <button
                type="button"
                className="clear-btn"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {sportOptions.length > 1 && (
            <div className="sports-filters">
              {sportOptions.map((sp) => (
                <button
                  key={sp}
                  type="button"
                  className={`filter-pill ${selectedSport === sp ? 'filter-pill--active' : ''}`}
                  onClick={() => setSelectedSport(sp)}
                >
                  {sp}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Public Clubs Grid */}
        {loadingClubs && clubs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6b6b66' }}>
            <span>Searching athletic clubs...</span>
          </div>
        ) : clubs.length > 0 ? (
          <div className="cl-user-dashboard__public-grid">
            {clubs.map((club) => {
              const isJoined = joinedClubIds.has(club.id);
              const isJoining = joiningClubId === club.id;

              return (
                <div key={club.id}  className="public-club-card">
                  {/* Photo Cover Banner */}
                  <div className="card-banner">
                    {club.cover_url ? (
                      <img src={club.cover_url} alt={club.name} loading="lazy" />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: '#1f5c46' }} />
                    )}
                    <div className="banner-overlay" />

                    {/* Live Courts Badge */}
                    <div className="courts-badge">
                      <Trophy size={13} />
                      <span>{club.total_courts || 0} {club.total_courts === 1 ? 'Court' : 'Courts'}</span>
                    </div>

                    {/* Logo Avatar */}
                    {club.logo_url ? (
                      <img src={club.logo_url} alt={club.name} className="logo-avatar" />
                    ) : (
                      <div className="logo-avatar">
                        {club.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="card-content">
                    <div className="club-header-info">
                      <h3 className="name" title={club.name}>{club.name}</h3>
                      <div className="location">
                        <MapPin size={13} />
                        <span>{club.city ? `${club.city}${club.state ? `, ${club.state}` : ''}` : 'Location not specified'}</span>
                      </div>
                    </div>

                    <p className="tagline-text">
                      {club.tagline || club.description || (club.city ? `Athletic facility in ${club.city}` : '')}
                    </p>

                    {/* Available Sports Tags */}
                    {club.sports && club.sports.length > 0 && (
                      <div className="sports-tags-row">
                        {club.sports.slice(0, 4).map((sp) => (
                          <span key={sp.name} className="sport-tag">
                            <span>{sp.icon || '🎾'}</span>
                            <span>{sp.name}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Card Actions */}
                    <div className="card-footer-btns">
                      <button
                        type="button"
                        className="btn-view-club"
                        onClick={() => handleSelectClub(club)}
                      >
                        <span>View Club</span>
                      </button>

                      {isJoined ? (
                        <button
                          type="button"
                          className="btn-join btn-join--joined"
                          disabled
                        >
                          <ShieldCheck size={14} />
                          <span>Joined</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-join"
                          disabled={isJoining}
                          onClick={() => handleJoinClub(club.id)}
                        >
                          {isJoining ? 'Joining...' : 'Join Club'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6b6b66', background: '#ffffff', borderRadius: '12px', border: '1px solid #e7e5df' }}>
            <p>No clubs match your search "{searchTerm}". Try a different city or sport name.</p>
          </div>
        )}

        {/* Scrolling Pagination Sentinel */}
        <div ref={observerRef} className="scroll-sentinel">
          {loadingMore && (
            <div className="loading-pulse">
              <span className="spinner" />
              <span>Loading more clubs...</span>
            </div>
          )}
          {!hasMore && clubs.length > 0 && (
            <span className="all-loaded-text">All available clubs loaded</span>
          )}
        </div>
      </section>
    </div>
  );
}

export default React.memo(UserDashboard);
