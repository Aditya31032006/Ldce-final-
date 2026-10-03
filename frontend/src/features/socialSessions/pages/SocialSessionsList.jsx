import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSocialSessions } from '../socialSessions.slice.js';

export default function SocialSessionsList() {
  const dispatch = useDispatch();
  const { sessionsList } = useSelector((state) => state.socialSessions);

  useEffect(() => {
    dispatch(fetchSocialSessions());
  }, [dispatch]);

  const displaySessions = sessionsList.length > 0 ? sessionsList : [
    { id: 'ss-1', title: 'Friday Night Badminton Mixer (All Levels)', host: 'Coach Marcus', court: 'Courts 1 & 2', time: 'Tonight 19:00 - 21:00', spots: '8 / 12 spots filled', fee: '$12.00' },
    { id: 'ss-2', title: 'Saturday Morning Pickleball Round Robin', host: 'Serena W.', court: 'Court 3', time: 'Tomorrow 09:00 - 11:00', spots: '6 / 8 spots filled', fee: '$10.00' },
    { id: 'ss-3', title: 'Intermediate Squash Ladder Play', host: 'Club Pro', court: 'Court 4', time: 'Sunday 16:00 - 18:00', spots: '4 / 6 spots filled', fee: '$15.00' },
  ];

  return (
    <div className="df-page-wrapper">
      <div className="df-page-container">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>Social Sessions & Mixers</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Join drop-in social games, community ladders, and round-robin tournaments</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {displaySessions.map((s) => (
            <div
              key={s.id}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '0.875rem',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '0.2rem 0.5rem', borderRadius: '9999px' }}>
                    {s.court}
                  </span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>{s.fee}</span>
                </div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>{s.title}</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>🕒 {s.time}</p>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>👤 Host: {s.host}</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#10b981' }}>{s.spots}</span>
                <button
                  type="button"
                  style={{
                    padding: '0.45rem 1rem',
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                    cursor: 'pointer'
                  }}
                  onClick={() => alert(`Joined ${s.title}`)}
                >
                  Join Session
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
