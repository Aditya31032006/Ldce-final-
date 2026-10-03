import React, { useMemo } from 'react';
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
} from 'lucide-react';
import useAuth from '../../auth/hook/useAuth.js';
import useUserDashboard from '../../clubs/hooks/useUserDashboard.js';
import '../styles/user-dashboard.scss';

export default function UserDashboard() {
  const { user, changeClub } = useAuth();
  const navigate = useNavigate();

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

  // Dynamic sports from database
  const sportOptions = useMemo(() => {
    if (!availableSports || availableSports.length === 0) return [];
    return ['All', ...availableSports];
  }, [availableSports]);

  // Joined club IDs for quick lookup
  const joinedClubIds = new Set(myClubs.map((c) => c.id));

  const handleSelectClub = (club) => {
    changeClub(club.id, club.user_role || 'member');
    navigate('/courts');
  };

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
            <span className="stat-val">Active</span>
            <span className="stat-lbl">Status</span>
          </div>
        </div>
      </section>

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
                      onClick={() => handleSelectClub(club)}
                    >
                      <span>Enter Club</span>
                      <ArrowRight size={14} />
                    </button>
                    <Link
                      to="/courts"
                      onClick={() => changeClub(club.id, club.user_role || 'member')}
                      className="btn-book"
                    >
                      <Calendar size={14} />
                      <span>Book</span>
                    </Link>
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
          <span className="title-subtitle">Fuzzy search by club name, sport, or city</span>
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
                <div key={club.id} className="public-club-card">
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
