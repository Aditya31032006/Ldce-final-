import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLeads } from '../leads.slice.js';

function LeadsList() {
  const dispatch = useDispatch();
  const { leadsList = [] } = useSelector((state) => state.leads);

  useEffect(() => {
    dispatch(fetchLeads());
  }, [dispatch]);

  const displayLeads = useMemo(() => {
    return leadsList.length > 0 ? leadsList : [
      { id: 'lead-1', name: 'Metro Tech Corporate Badminton Cup', contact: 'hr@metrotech.com', type: 'Corporate Event', status: 'new', value: '$2,500' },
      { id: 'lead-2', name: 'Junior Summer Squash Camp', contact: 'parent@gmail.com', type: 'Training Program', status: 'in_progress', value: '$450' },
      { id: 'lead-3', name: 'Apex Academy Court Block Booking', contact: 'coach.dan@apex.com', type: 'Recurring Booking', status: 'won', value: '$4,800' },
    ];
  }, [leadsList]);

  return (
    <div className="df-page-wrapper">
      <div className="df-page-container">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>Leads & Enquiries CRM</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Corporate bookings, tournament enquiries, and customer lead pipeline</p>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>Lead / Title</th>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>Contact Email</th>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>Type</th>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>Estimated Value</th>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600, textAlign: 'right' }}>Pipeline Status</th>
              </tr>
            </thead>
            <tbody>
              {displayLeads.map((l) => (
                <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#0f172a' }}>{l.name}</td>
                  <td style={{ padding: '1rem 1.25rem', color: '#64748b' }}>{l.contact}</td>
                  <td style={{ padding: '1rem 1.25rem', color: '#2563eb', fontWeight: 500 }}>{l.type}</td>
                  <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#0f172a' }}>{l.value}</td>
                  <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                    <span style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: l.status === 'won' ? '#ecfdf5' : '#eff6ff',
                      color: l.status === 'won' ? '#059669' : '#2563eb',
                      textTransform: 'uppercase'
                    }}>
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default React.memo(LeadsList);
