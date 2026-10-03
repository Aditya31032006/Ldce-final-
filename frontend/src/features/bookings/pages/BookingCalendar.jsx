import React from 'react';
import { Link } from 'react-router';

export default function BookingCalendar() {
  const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
  const courts = ['Court 1 (Badminton)', 'Court 2 (Badminton)', 'Court 3 (Pickleball)', 'Court 4 (Squash)'];

  return (
    <div className="df-page-wrapper">
      <div className="df-page-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <Link to="/bookings" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.875rem' }}>← Back to List</Link>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>Court Booking Calendar</h1>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Live daily timetable and interactive reservation grid</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button style={{ padding: '0.4rem 0.8rem', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '0.375rem', cursor: 'pointer' }}>Today</button>
            <span style={{ fontWeight: 600, color: '#0f172a', padding: '0 0.5rem' }}>Friday, October 3, 2026</span>
          </div>
        </div>

        {/* Timetable Grid */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', overflowX: 'auto', padding: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(4, 1fr)', gap: '1px', background: '#e2e8f0' }}>
            <div style={{ background: '#f8fafc', padding: '0.75rem', fontWeight: 600, fontSize: '0.75rem', color: '#64748b' }}>TIME</div>
            {courts.map((court, i) => (
              <div key={i} style={{ background: '#f8fafc', padding: '0.75rem', fontWeight: 600, fontSize: '0.8125rem', color: '#0f172a', textAlign: 'center' }}>
                {court}
              </div>
            ))}

            {timeSlots.map((time, tIdx) => (
              <React.Fragment key={tIdx}>
                <div style={{ background: '#ffffff', padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: '#64748b', fontWeight: 500, textAlign: 'center' }}>
                  {time}
                </div>
                {courts.map((_, cIdx) => {
                  const isBooked = (tIdx === 2 && cIdx === 0) || (tIdx === 9 && cIdx === 1) || (tIdx === 10 && cIdx === 2);
                  return (
                    <div
                      key={cIdx}
                      style={{
                        background: isBooked ? '#eff6ff' : '#ffffff',
                        padding: '0.5rem',
                        minHeight: '48px',
                        borderLeft: isBooked ? '3px solid #2563eb' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: isBooked ? '#1d4ed8' : '#94a3b8',
                        cursor: 'pointer',
                      }}
                    >
                      {isBooked ? 'Reserved (Member)' : '+ Slot'}
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
