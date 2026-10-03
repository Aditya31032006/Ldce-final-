import React, { useEffect } from 'react';
import { Link } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBookings } from '../bookings.slice.js';

export default function BookingsList() {
  const dispatch = useDispatch();
  const { bookingsList, loading } = useSelector((state) => state.bookings);

  useEffect(() => {
    dispatch(fetchBookings());
  }, [dispatch]);

  const displayBookings = bookingsList.length > 0 ? bookingsList : [
    { id: 'b-101', member_name: 'Sarah Connor', court_name: 'Court 1 (Badminton)', date: 'Today', time: '17:00 - 18:00', status: 'confirmed', amount: '$25.00' },
    { id: 'b-102', member_name: 'John Miller', court_name: 'Court 3 (Pickleball)', date: 'Today', time: '18:00 - 19:30', status: 'confirmed', amount: '$35.00' },
    { id: 'b-103', member_name: 'Elena Rostova', court_name: 'Court 2 (Badminton)', date: 'Tomorrow', time: '10:00 - 11:00', status: 'pending', amount: '$25.00' },
  ];

  return (
    <div className="df-page-wrapper">
      <div className="df-page-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>Court Reservations</h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>View, manage, and book court slots for members and guests</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link
              to="/bookings/calendar"
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #cbd5e1',
                borderRadius: '0.5rem',
                color: '#334155',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                background: '#ffffff'
              }}
            >
              Calendar View
            </Link>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>Booking ID</th>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>Member / Player</th>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>Facility</th>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>Slot Time</th>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600, textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {displayBookings.map((b) => (
                <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#2563eb' }}>{b.id}</td>
                  <td style={{ padding: '1rem 1.25rem', fontWeight: 500, color: '#0f172a' }}>{b.member_name}</td>
                  <td style={{ padding: '1rem 1.25rem', color: '#475569' }}>{b.court_name}</td>
                  <td style={{ padding: '1rem 1.25rem', color: '#475569' }}>{b.date}, {b.time}</td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <span style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: b.status === 'confirmed' ? '#ecfdf5' : '#fef3c7',
                      color: b.status === 'confirmed' ? '#059669' : '#d97706',
                      textTransform: 'uppercase'
                    }}>
                      {b.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>{b.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
