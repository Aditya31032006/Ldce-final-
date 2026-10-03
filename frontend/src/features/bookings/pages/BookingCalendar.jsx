import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import apiClient from '../../../shared/services/api.js';

export default function BookingCalendar() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [courts, setCourts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickBooking, setQuickBooking] = useState(null); // { court, time, date }
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookingPlayerName, setBookingPlayerName] = useState('');
  const [bookingChannel, setBookingChannel] = useState('counter');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingMessage, setBookingMessage] = useState(null);

  // All 30-min slots from 06:00 to 22:00
  const timeSlots = [
    '06:00', '06:30', '07:00', '07:30', '08:00', '08:30',
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
    '21:00', '21:30', '22:00'
  ];

  const getSlotTimestamps = (dateStr, timeStr) => {
    const [h, m] = timeStr.split(':').map(v => v.padStart(2, '0'));
    const startIso = `${dateStr}T${h}:${m}:00+05:30`;
    const totalMinutes = Number(h) * 60 + Number(m) + 60;
    const eh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const em = String(totalMinutes % 60).padStart(2, '0');
    const endIso = `${dateStr}T${eh}:${em}:00+05:30`;
    return {
      startAt: startIso,
      endAt: endIso,
      displayRange: `${timeStr} – ${eh}:${em}`,
    };
  };

  const loadCalendarData = useCallback(async () => {
    try {
      setLoading(true);
      const [courtsRes, bookingsRes] = await Promise.all([
        apiClient.get('/courts').catch(() => ({ data: { data: [] } })),
        apiClient.get('/bookings/calendar', {
          params: {
            start: `${selectedDate}T00:00:00+05:30`,
            end: `${selectedDate}T23:59:59+05:30`,
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

  // Find booking matching court and time slot interval overlap
  const getBookingForSlot = (court, time) => {
    const slotStartMs = new Date(`${selectedDate}T${time}:00+05:30`).getTime();
    const slotEndMs = slotStartMs + 30 * 60 * 1000;

    const slotStartUtcMs = new Date(`${selectedDate}T${time}:00Z`).getTime();
    const slotEndUtcMs = slotStartUtcMs + 30 * 60 * 1000;

    return bookings.find((b) => {
      const isSameCourt = b.court_id === court.id || b.court_name === court.name;
      if (!isSameCourt) return false;
      if (!b.start_at) return false;
      if ((b.status || '').toLowerCase() === 'cancelled') return false;

      const bStartMs = new Date(b.start_at).getTime();
      const bEndMs = new Date(b.end_at || (bStartMs + 60 * 60 * 1000)).getTime();

      // Check interval overlap in both representations
      const overlapIst = slotStartMs < bEndMs && slotEndMs > bStartMs;
      const overlapUtc = slotStartUtcMs < bEndMs && slotEndUtcMs > bStartMs;

      return overlapIst || overlapUtc;
    });
  };

  const handleCreateQuickBooking = async (e) => {
    e.preventDefault();
    if (!quickBooking) return;
    setBookingLoading(true);
    setBookingMessage(null);
    try {
      const { startAt, endAt, displayRange } = getSlotTimestamps(quickBooking.date, quickBooking.time);
      await apiClient.post('/bookings', {
        court_id: quickBooking.court.id,
        start_at: startAt,
        end_at: endAt,
        guest_name: bookingPlayerName.trim() || 'Walk-in Guest',
        channel: bookingChannel,
        status: 'confirmed',
      });

      setBookingMessage({ text: `Court slot booked successfully for ${displayRange}!`, type: 'success' });
      window.dispatchEvent(new CustomEvent('booking-updated'));
      window.dispatchEvent(new CustomEvent('court-booked'));
      localStorage.setItem('ldce_booking_updated', Date.now().toString());
      loadCalendarData();
      setTimeout(() => {
        setQuickBooking(null);
        setBookingPlayerName('');
        setBookingMessage(null);
      }, 1200);
    } catch (err) {
      setBookingMessage({
        text: err.response?.data?.message || err.message || 'Court is already booked for this slot time.',
        type: 'error',
      });
    } finally {
      setBookingLoading(false);
    }
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
                      onClick={() => {
                        if (isBooked) {
                          setSelectedBooking({ ...booking, slotCourt: court.name, slotTime: time });
                        } else {
                          setQuickBooking({ court, time, date: selectedDate });
                          setBookingPlayerName('');
                          setBookingMessage(null);
                        }
                      }}
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
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      title={isBooked ? 'Click to view reservation details' : `Click to book 1-hr slot starting ${time}`}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = isBooked ? '#DBEAFE' : '#F0FDF4';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isBooked ? '#EFF6FF' : '#ffffff';
                      }}
                    >
                      {isBooked ? (
                        <>
                          <span style={{ fontWeight: 700, color: '#1E40AF', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                            {booking.member_name || booking.guest_name || 'Reserved'}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: '#3B82F6', fontWeight: 600 }}>
                            ● {booking.status || 'Confirmed'}
                          </span>
                        </>
                      ) : (
                        <span style={{ color: '#94A3B8', fontWeight: 500, fontSize: '0.72rem' }}>
                          + Book
                        </span>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Quick Booking Modal */}
        {quickBooking && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '1rem',
              backdropFilter: 'blur(3px)',
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '0.75rem',
                padding: '1.75rem',
                maxWidth: '460px',
                width: '100%',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Book 1-Hour Court Slot
                </h3>
                <button
                  type="button"
                  onClick={() => setQuickBooking(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.25rem',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '0.25rem',
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '0.5rem', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ color: '#64748b' }}>Court:</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{quickBooking.court.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ color: '#64748b' }}>Date:</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{quickBooking.date}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>1-Hour Duration:</span>
                  <span style={{ fontWeight: 700, color: '#1F5C46' }}>
                    {getSlotTimestamps(quickBooking.date, quickBooking.time).displayRange} (IST)
                  </span>
                </div>
              </div>

              {bookingMessage && (
                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.375rem',
                    marginBottom: '1rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    background: bookingMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
                    color: bookingMessage.type === 'success' ? '#065f46' : '#991b1b',
                    border: `1px solid ${bookingMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                  }}
                >
                  {bookingMessage.text}
                </div>
              )}

              <form onSubmit={handleCreateQuickBooking}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Player / Guest Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={bookingPlayerName}
                    onChange={(e) => setBookingPlayerName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Booking Channel
                  </label>
                  <select
                    value={bookingChannel}
                    onChange={(e) => setBookingChannel(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  >
                    <option value="counter">Reception / Counter</option>
                    <option value="phone">Phone Reservation</option>
                    <option value="online">Online / Member Portal</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setQuickBooking(null)}
                    style={{
                      padding: '0.6rem 1rem',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '0.375rem',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      color: '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bookingLoading}
                    style={{
                      padding: '0.6rem 1.25rem',
                      background: '#1F5C46',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      color: '#ffffff',
                      cursor: bookingLoading ? 'not-allowed' : 'pointer',
                      opacity: bookingLoading ? 0.7 : 1,
                    }}
                  >
                    {bookingLoading ? 'Reserving...' : 'Confirm 1-Hour Booking'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Selected Booking Details Modal */}
        {selectedBooking && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '1rem',
              backdropFilter: 'blur(3px)',
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '0.75rem',
                padding: '1.75rem',
                maxWidth: '440px',
                width: '100%',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Reservation Details
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.25rem',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '0.25rem',
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span style={{ color: '#64748b' }}>Reserved By:</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>
                    {selectedBooking.member_name || selectedBooking.guest_name || 'Member'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span style={{ color: '#64748b' }}>Court:</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>
                    {selectedBooking.court_name || selectedBooking.slotCourt || 'Court'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span style={{ color: '#64748b' }}>Time Interval:</span>
                  <span style={{ fontWeight: 600, color: '#1F5C46' }}>
                    {selectedBooking.start_at
                      ? `${new Date(selectedBooking.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} - ${new Date(selectedBooking.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`
                      : selectedBooking.slotTime}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span style={{ color: '#64748b' }}>Channel:</span>
                  <span style={{ fontWeight: 600, color: '#0f172a', textTransform: 'capitalize' }}>
                    {selectedBooking.channel || 'online'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span style={{ color: '#64748b' }}>Status:</span>
                  <span style={{ fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
                    {selectedBooking.status || 'CONFIRMED'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  style={{
                    padding: '0.55rem 1.25rem',
                    background: '#1F5C46',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    color: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
