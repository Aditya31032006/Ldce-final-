import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPayments } from '../finance.slice.js';

export default function FinanceDashboard() {
  const dispatch = useDispatch();
  const { payments } = useSelector((state) => state.finance);

  useEffect(() => {
    dispatch(fetchPayments());
  }, [dispatch]);

  const displayPayments = payments.length > 0 ? payments : [
    { id: 'PAY-8801', member: 'David Beckham', method: 'Razorpay / Card', type: 'Annual Membership Renewal', amount: '$129.00', status: 'settled', date: 'Today, 10:14' },
    { id: 'PAY-8802', member: 'Serena Williams', method: 'UPI / QR', type: 'Court 1 Booking', amount: '$25.00', status: 'settled', date: 'Today, 11:30' },
    { id: 'PAY-8803', member: 'Walk-in Guest', method: 'Cash (POS)', type: 'Bar Refreshments', amount: '$8.50', status: 'settled', date: 'Today, 12:45' },
    { id: 'PAY-8804', member: 'Apex Academy', method: 'Bank Transfer', type: 'Monthly Court Block Lease', amount: '$1,200.00', status: 'pending', date: 'Oct 2, 2026' },
  ];

  return (
    <div className="df-page-wrapper">
      <div className="df-page-container">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>Finance & Revenue</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Real-time payment settlements, invoices, POS transactions, and cash receipts</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>MONTHLY GROSS REVENUE</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>$42,850</div>
            <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.25rem' }}>+14.2% vs last month</div>
          </div>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>MEMBERSHIP SUBSCRIPTIONS</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>$24,300</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>56.7% of total revenue</div>
          </div>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>COURT PAY-AND-PLAY</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>$12,450</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>29.1% of total revenue</div>
          </div>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>BAR & PRO SHOP RETAIL</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>$6,100</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>14.2% of total revenue</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#0f172a' }}>
            Recent Payment Transactions
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>Transaction</th>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>Member / Payer</th>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>Method</th>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>Description</th>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>Date</th>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600, textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {displayPayments.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#2563eb' }}>{p.id}</td>
                  <td style={{ padding: '1rem 1.25rem', fontWeight: 500, color: '#0f172a' }}>{p.member}</td>
                  <td style={{ padding: '1rem 1.25rem', color: '#64748b' }}>{p.method}</td>
                  <td style={{ padding: '1rem 1.25rem', color: '#0f172a' }}>{p.type}</td>
                  <td style={{ padding: '1rem 1.25rem', color: '#64748b' }}>{p.date}</td>
                  <td style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{p.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
