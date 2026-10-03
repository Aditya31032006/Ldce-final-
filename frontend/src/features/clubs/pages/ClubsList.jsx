import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchClubs } from '../clubs.slice.js';

export default function ClubsList() {
  const dispatch = useDispatch();
  const { clubsList, loading, error } = useSelector((state) => state.clubs);

  useEffect(() => {
    dispatch(fetchClubs());
  }, [dispatch]);

  return (
    <div className="df-page-wrapper">
      <div className="df-page-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>Clubs & Branches</h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Manage sports club locations, facility configurations, and operating hours</p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Loading clubs...</div>
        ) : error ? (
          <div style={{ padding: '1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '0.5rem' }}>{error}</div>
        ) : clubsList.length === 0 ? (
          <div style={{
            background: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            padding: '3rem',
            textAlign: 'center',
            color: '#64748b'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏢</div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>No Clubs Found</h3>
            <p style={{ fontSize: '0.875rem' }}>Get started by configuring your primary club venue.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {clubsList.map((club) => (
              <div key={club.id} style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '0.75rem',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>{club.name}</h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>{club.address || 'Address not configured'}</p>
                <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>Active Venue</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
