import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrders } from '../orders.slice.js';

export default function OrdersList() {
  const dispatch = useDispatch();
  const { ordersList } = useSelector((state) => state.orders);

  useEffect(() => {
    dispatch(fetchOrders());
  }, [dispatch]);

  const displayOrders = ordersList.length > 0 ? ordersList : [
    { id: 'ORD-9021', customer: 'David Beckham', items: 'Yonex Grip + 2x Electrolyte', total: '$19.00', status: 'completed', date: 'Oct 3, 2026' },
    { id: 'ORD-9022', customer: 'Serena Williams', items: 'Court 1 Booking (1 hr)', total: '$25.00', status: 'completed', date: 'Oct 3, 2026' },
    { id: 'ORD-9023', customer: 'Guest #41', items: 'Bar POS: 2x Espresso, 1x Water', total: '$10.00', status: 'completed', date: 'Oct 3, 2026' },
  ];

  return (
    <div className="df-page-wrapper">
      <div className="df-page-container">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>Sales & Orders</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Recent sales transactions, receipts, and order fulfillments</p>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>Order #</th>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>Customer</th>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>Purchased Items</th>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>Date</th>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600, textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {displayOrders.map((o) => (
                <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#2563eb' }}>{o.id}</td>
                  <td style={{ padding: '1rem 1.25rem', fontWeight: 500, color: '#0f172a' }}>{o.customer}</td>
                  <td style={{ padding: '1rem 1.25rem', color: '#64748b' }}>{o.items}</td>
                  <td style={{ padding: '1rem 1.25rem', color: '#64748b' }}>{o.date}</td>
                  <td style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{o.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
