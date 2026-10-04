import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBookings } from '../bookings.slice.js';

function BookingsList() {
  const dispatch = useDispatch();
  const { bookingsList = [], loading } = useSelector((state) => state.bookings);
  const [filter, setFilter] = useState('ALL');

  const handleRefresh = useCallback(() => {
    dispatch(fetchBookings());
  }, [dispatch]);

  useEffect(() => {
    handleRefresh();
    const handleUpdate = () => handleRefresh();
    window.addEventListener('booking-updated', handleUpdate);
    window.addEventListener('court-booked', handleUpdate);
    return () => {
      window.removeEventListener('booking-updated', handleUpdate);
      window.removeEventListener('court-booked', handleUpdate);
    };
  }, [handleRefresh]);

  const filteredBookings = useMemo(() => {
    return (bookingsList || []).filter((b) => {
      if (filter === 'ALL') return true;
      return (b.status || '').toLowerCase() === filter.toLowerCase();
    });
  }, [bookingsList, filter]);

  return (
    <div className="df-page-wrapper">
      <div className="df-page-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>Court Reservations</h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Real-time court bookings, member reservations, and payment settlements</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleRefresh}
              style={{
                padding: '0.5rem 0.85rem',
                border: '1px solid #cbd5e1',
                borderRadius: '0.5rem',
                color: '#334155',
                background: '#ffffff',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              ↻ Refresh
            </button>
            <Link
              to="/bookings/calendar"
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '0.5rem',
                color: '#ffffff',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                background: '#1F5C46',
                boxShadow: '0 2px 4px rgba(31, 92, 70, 0.15)',
              }}
            >
              📅 Calendar View
            </Link>
          </div>
        </div>

        {/* Status Filters Bar */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {['ALL', 'CONFIRMED', 'PENDING', 'CANCELLED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilter(st)}
              style={{
                padding: '0.35rem 0.85rem',
                borderRadius: '20px',
                border: '1px solid',
                borderColor: filter === st ? '#1F5C46' : '#cbd5e1',
                background: filter === st ? '#1F5C46' : '#ffffff',
                color: filter === st ? '#ffffff' : '#475569',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {st} {st === 'ALL' ? `(${bookingsList.length})` : `(${bookingsList.filter(b => (b.status || '').toLowerCase() === st.toLowerCase()).length})`}
            </button>
          ))}
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', overflow: 'hidden' }}>
          {loading && bookingsList.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              Loading court reservations...
            </div>
          ) : filteredBookings.length === 0 ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏸</div>
              <h3 style={{ fontSize: '1.1rem', color: '#0f172a', margin: '0 0 0.25rem', fontWeight: 600 }}>No reservations found</h3>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>When court bookings are placed and confirmed, they will show up live here.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>Booking Ref</th>
                  <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>Player / Member</th>
                  <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>Court & Sport</th>
                  <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>Date & Slot</th>
                  <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>Channel</th>
                  <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600, textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => {
                  const dateStr = b.start_at
                    ? new Date(b.start_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : (b.date || 'Today');
                  const timeStr = b.start_at && b.end_at
                    ? `${new Date(b.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} - ${new Date(b.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`
                    : (b.time || '1-Hour Slot');
                  const isConfirmed = (b.status || '').toLowerCase() === 'confirmed';
                  const isCancelled = (b.status || '').toLowerCase() === 'cancelled';

                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#1F5C46', fontFamily: 'monospace' }}>
                        #{String(b.id).substring(0, 8).toUpperCase()}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#0f172a' }}>
                        {b.member_name || b.guest_name || 'Member'}
                        {b.member_email && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>{b.member_email}</div>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', color: '#334155', fontWeight: 500 }}>
                        {b.court_name || 'Court'}
                        {b.sport_name && (
                          <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.35rem' }}>({b.sport_name})</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', color: '#475569' }}>
                        <strong>{dateStr}</strong>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{timeStr}</div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', color: '#64748b', textTransform: 'capitalize' }}>
                        {b.channel || 'online'}
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span style={{
                          padding: '0.25rem 0.65rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: isConfirmed ? '#ecfdf5' : isCancelled ? '#fef2f2' : '#fef3c7',
                          color: isConfirmed ? '#059669' : isCancelled ? '#dc2626' : '#d97706',
                          textTransform: 'uppercase',
                        }}>
                          {b.status || 'confirmed'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        {b.total_amount ? `₹${Number(b.total_amount).toFixed(2)}` : b.amount ? `₹${Number(b.amount).toFixed(2)}` : 'Free (Quota)'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(BookingsList);
