import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStaff } from '../hr.slice.js';

export default function StaffManagement() {
  const dispatch = useDispatch();
  const { staffList } = useSelector((state) => state.hr);

  useEffect(() => {
    dispatch(fetchStaff());
  }, [dispatch]);

  const displayStaff = staffList.length > 0 ? staffList : [
    { id: 'st-1', name: 'Marcus Sterling', role: 'Head Coach', department: 'Badminton Academy', phone: '+1 555-4301', status: 'active' },
    { id: 'st-2', name: 'Alicia Keys', role: 'Front Desk Lead', department: 'Operations', phone: '+1 555-4302', status: 'active' },
    { id: 'st-3', name: 'Carlos Gomez', role: 'Barista / Cafe POS', department: 'Hospitality', phone: '+1 555-4303', status: 'active' },
    { id: 'st-4', name: 'Victor Chen', role: 'Facility Maintenance', department: 'Facilities', phone: '+1 555-4304', status: 'active' },
  ];

  return (
    <div className="df-page-wrapper">
      <div className="df-page-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>Staff & Human Resources</h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Coaches, front desk staff, roles, and shift assignments</p>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>Employee Name</th>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>Role</th>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>Department</th>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>Contact</th>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600, textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {displayStaff.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#0f172a' }}>{s.name}</td>
                  <td style={{ padding: '1rem 1.25rem', fontWeight: 500, color: '#2563eb' }}>{s.role}</td>
                  <td style={{ padding: '1rem 1.25rem', color: '#64748b' }}>{s.department}</td>
                  <td style={{ padding: '1rem 1.25rem', color: '#64748b' }}>{s.phone}</td>
                  <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                    <span style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: '#ecfdf5',
                      color: '#059669',
                      textTransform: 'uppercase'
                    }}>
                      {s.status}
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
