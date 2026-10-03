import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import apiClient from '../../../shared/services/api.js';

export default function BookingCalendar() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [courts, setCourts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const timeSlots = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00'
  ];

  const loadCalendarData = useCallback(async () => {
    try {
      setLoading(true);
      const [courtsRes, bookingsRes] = await Promise.all([
        apiClient.get('/courts').catch(() => ({ data: { data: [] } })),
        apiClient.get('/bookings/calendar', {
          params: {
            start: `${selectedDate}T00:00:00Z`,
            end: `${selectedDate}T23:59:59Z`,
          }
        }).catch(() => ({ data: { bookings: [] } }))
      ]);

      const fetchedCourts = courtsRes.data?.data || courtsRes.data?.courts || [];
      setCourts(fetchedCourts.length > 0 ? fetchedCourts : [
        { id: 'c1', name: 'Court 1 (Badminton)' },
        { id: 'c2', name: 'Court 2 (Badminton)' },
        { id: 'c3', name: 'Court 3 (Pickleball)' },
        { id: 'c4', name: 'Court 4 (Tennis)' },
      ]);

      const fetchedBookings = bookingsRes.data?.bookings || bookingsRes.data?.data || [];
      setBookings(fetchedBookings);
    } catch (err) {
      console.warn('Error loading calendar data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadCalendarData();
    const handleUpdate = () => loadCalendarData();
    const handleStorage = (e) => {
      if (e.key === 'ldce_booking_updated') {
        loadCalendarData();
      }
    };
    window.addEventListener('booking-updated', handleUpdate);
    window.addEventListener('court-booked', handleUpdate);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('booking-updated', handleUpdate);
      window.removeEventListener('court-booked', handleUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [loadCalendarData]);

  // Find booking matching court and time
  const getBookingForSlot = (court, time) => {
    return bookings.find((b) => {
      const isSameCourt = b.court_id === court.id || b.court_name === court.name;
      if (!isSameCourt) return false;
      if (!b.start_at) return false;
      const d = new Date(b.start_at);
      const slotHourUtc = String(d.getUTCHours()).padStart(2, '0');
      const slotHourLocal = String(d.getHours()).padStart(2, '0');
      const timeHour = time.split(':')[0];
      const matchesHour = (slotHourUtc === timeHour || slotHourLocal === timeHour);
      return matchesHour && (b.status || '').toLowerCase() !== 'cancelled';
    });
  };

  const formattedDisplayDate = new Date(`${selectedDate}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="df-page-wrapper">
      <div className="df-page-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <Link to="/bookings" style={{ color: '#1F5C46', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>
                ← Back to Reservations
              </Link>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Court Booking Calendar</h1>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
              Live real-time reservation timetable across all facility courts
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                padding: '0.45rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#0f172a',
              }}
            />
            <button
              type="button"
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              style={{
                padding: '0.45rem 0.85rem',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              Today
            </button>
            <button
              type="button"
              onClick={loadCalendarData}
              title="Refresh calendar"
              style={{
                padding: '0.45rem 0.85rem',
                background: '#1F5C46',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '1.05rem' }}>
            {formattedDisplayDate}
          </span>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', fontWeight: 600 }}>
            <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
              Open / Available
            </span>
            <span style={{ color: '#2563EB', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563EB' }} />
              Reserved (Confirmed)
            </span>
          </div>
        </div>

        {/* Timetable Grid */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', overflowX: 'auto', padding: '1rem' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `80px repeat(${courts.length}, minmax(160px, 1fr))`,
              gap: '1px',
              background: '#e2e8f0'
            }}
          >
            <div style={{ background: '#f8fafc', padding: '0.75rem', fontWeight: 700, fontSize: '0.75rem', color: '#64748b' }}>
              TIME
            </div>
            {courts.map((court, i) => (
              <div
                key={court.id || i}
                style={{
                  background: '#f8fafc',
                  padding: '0.75rem',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  color: '#0f172a',
                  textAlign: 'center',
                }}
              >
                {court.name}
              </div>
            ))}

            {timeSlots.map((time, tIdx) => (
              <React.Fragment key={tIdx}>
                <div style={{ background: '#ffffff', padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textAlign: 'center' }}>
                  {time}
                </div>
                {courts.map((court, cIdx) => {
                  const booking = getBookingForSlot(court, time);
                  const isBooked = Boolean(booking);

                  return (
                    <div
                      key={cIdx}
                      style={{
                        background: isBooked ? '#EFF6FF' : '#ffffff',
                        padding: '0.5rem',
                        minHeight: '52px',
                        borderLeft: isBooked ? '3px solid #2563EB' : 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        color: isBooked ? '#1D4ED8' : '#10B981',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isBooked ? (
                        <>
                          <span style={{ fontWeight: 700, color: '#1E40AF', textAlign: 'center' }}>
                            {booking.member_name || booking.guest_name || 'Member Reserved'}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: '#3B82F6', fontWeight: 600 }}>
                            ● {booking.status || 'Confirmed'}
                          </span>
                        </>
                      ) : (
                        <span style={{ color: '#94A3B8', fontWeight: 500, fontSize: '0.72rem' }}>
                          + Open Slot
                        </span>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
