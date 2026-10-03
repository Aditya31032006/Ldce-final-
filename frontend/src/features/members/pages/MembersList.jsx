import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMembers } from '../members.slice.js';

export default function MembersList() {
  const dispatch = useDispatch();
  const { membersList, loading } = useSelector((state) => state.members);
  const [search, setSearch] = useState('');

  useEffect(() => {
    dispatch(fetchMembers());
  }, [dispatch]);

  const displayMembers = membersList.length > 0 ? membersList : [
    { id: 'm-1', full_name: 'David Beckham', email: 'david@club.com', phone: '+1 555-0192', tier: 'Gold Annual', status: 'active', joined: 'Jan 2026' },
    { id: 'm-2', full_name: 'Serena Williams', email: 'serena@club.com', phone: '+1 555-0144', tier: 'VIP Lifetime', status: 'active', joined: 'Feb 2026' },
    { id: 'm-3', full_name: 'Rafael Nadal', email: 'rafa@club.com', phone: '+1 555-0189', tier: 'Silver Monthly', status: 'active', joined: 'Mar 2026' },
    { id: 'm-4', full_name: 'Marcus Vance', email: 'marcus@club.com', phone: '+1 555-0133', tier: 'Basic Day Pass', status: 'expired', joined: 'Aug 2026' },
  ];

  const filtered = displayMembers.filter((m) =>
    m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="df-page-wrapper">
      <div className="df-page-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>Members Directory</h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Member accounts, passes, subscription tiers, and activity logs</p>
          </div>
          <div>
            <input
              type="text"
              placeholder="Search members by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #cbd5e1',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                width: '280px',
                outline: 'none'
              }}
            />
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>Member</th>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>Contact</th>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>Membership Tier</th>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>Joined</th>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600, textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{m.full_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ID: {m.id}</div>
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ color: '#0f172a' }}>{m.email}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{m.phone}</div>
                  </td>
                  <td style={{ padding: '1rem 1.25rem', fontWeight: 500, color: '#2563eb' }}>{m.tier}</td>
                  <td style={{ padding: '1rem 1.25rem', color: '#64748b' }}>{m.joined}</td>
                  <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                    <span style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: m.status === 'active' ? '#ecfdf5' : '#fee2e2',
                      color: m.status === 'active' ? '#059669' : '#dc2626',
                      textTransform: 'uppercase'
                    }}>
                      {m.status}
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
