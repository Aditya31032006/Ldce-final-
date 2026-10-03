import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCourts } from '../courts.slice.js';

export default function CourtsManagement() {
  const dispatch = useDispatch();
  const { courtsList, loading } = useSelector((state) => state.courts);

  useEffect(() => {
    dispatch(fetchCourts());
  }, [dispatch]);

  // Demo fallback courts if backend is fresh/empty
  const displayCourts = courtsList.length > 0 ? courtsList : [
    { id: '1', name: 'Court 1 (Badminton)', sport_type: 'Badminton', surface: 'Synthetic Wood', status: 'available' },
    { id: '2', name: 'Court 2 (Badminton)', sport_type: 'Badminton', surface: 'Synthetic Wood', status: 'occupied' },
    { id: '3', name: 'Court 3 (Pickleball)', sport_type: 'Pickleball', surface: 'Cushioned Acrylic', status: 'available' },
    { id: '4', name: 'Court 4 (Squash)', sport_type: 'Squash', surface: 'Hardwood Glassback', status: 'maintenance' },
  ];

  return (
    <div className="df-page-wrapper">
      <div className="df-page-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>Court Management</h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Real-time facility status, maintenance schedules, and court configurations</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {displayCourts.map((court) => {
            const isAvailable = court.status === 'available';
            const isOccupied = court.status === 'occupied';
            const statusBg = isAvailable ? '#ecfdf5' : isOccupied ? '#eff6ff' : '#fef2f2';
            const statusColor = isAvailable ? '#059669' : isOccupied ? '#2563eb' : '#dc2626';

            return (
              <div
                key={court.id}
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
                    <span style={{
                      padding: '0.2rem 0.6rem',
                      background: statusBg,
                      color: statusColor,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      borderRadius: '9999px',
                      textTransform: 'uppercase',
                    }}>
                      {court.status || 'Active'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{court.sport_type}</span>
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>{court.name}</h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Surface: {court.surface || 'Standard'}</p>
                </div>

                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.375rem',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: '#334155',
                      cursor: 'pointer',
                    }}
                  >
                    View Timetable
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
