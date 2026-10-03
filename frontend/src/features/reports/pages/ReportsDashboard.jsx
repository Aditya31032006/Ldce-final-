import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDailySummary } from '../reports.slice.js';

export default function ReportsDashboard() {
  const dispatch = useDispatch();
  const { summary } = useSelector((state) => state.reports);

  useEffect(() => {
    dispatch(fetchDailySummary());
  }, [dispatch]);

  return (
    <div className="df-page-wrapper">
      <div className="df-page-container">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>Analytics & Reports</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Court utilization rates, hourly peak heatmaps, and financial metrics</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>Court Utilization by Sport</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  <span>Badminton (Courts 1 & 2)</span>
                  <span style={{ fontWeight: 600 }}>86% Occupancy</span>
                </div>
                <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: '86%', height: '100%', background: '#2563eb', borderRadius: '4px' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  <span>Pickleball (Court 3)</span>
                  <span style={{ fontWeight: 600 }}>74% Occupancy</span>
                </div>
                <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: '74%', height: '100%', background: '#10b981', borderRadius: '4px' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  <span>Squash (Court 4)</span>
                  <span style={{ fontWeight: 600 }}>62% Occupancy</span>
                </div>
                <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: '62%', height: '100%', background: '#8b5cf6', borderRadius: '4px' }} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>Peak Traffic Hours</h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', height: '150px', gap: '0.5rem', paddingTop: '1rem' }}>
              {[
                { time: '08h', val: 20 },
                { time: '10h', val: 35 },
                { time: '12h', val: 25 },
                { time: '14h', val: 30 },
                { time: '16h', val: 55 },
                { time: '18h', val: 95 },
                { time: '20h', val: 90 },
                { time: '22h', val: 40 },
              ].map((b, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                  <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                    <div style={{ width: '100%', height: `${b.val}%`, background: b.val > 70 ? '#2563eb' : '#94a3b8', borderRadius: '4px 4px 0 0' }} />
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.35rem' }}>{b.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
