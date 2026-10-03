import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchInventoryProducts } from '../inventory.slice.js';

export default function InventoryList() {
  const dispatch = useDispatch();
  const { products, loading } = useSelector((state) => state.inventory);

  useEffect(() => {
    dispatch(fetchInventoryProducts());
  }, [dispatch]);

  const displayProducts = products.length > 0 ? products : [
    { id: 'inv-1', name: 'Yonex Astrox 88D Pro Racket', category: 'Rackets', stock: 14, price: '$189.00', status: 'in_stock' },
    { id: 'inv-2', name: 'Aeroplane EG1130 Shuttlecocks (Tubes)', category: 'Consumables', stock: 48, price: '$28.00', status: 'in_stock' },
    { id: 'inv-3', name: 'Franklin X-40 Pickleball Balls (3-Pack)', category: 'Pickleball', stock: 5, price: '$12.00', status: 'low_stock' },
    { id: 'inv-4', name: 'Dunlop Pro Squash Balls (Box)', category: 'Squash', stock: 0, price: '$15.00', status: 'out_of_stock' },
  ];

  return (
    <div className="df-page-wrapper">
      <div className="df-page-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>Pro Shop & Inventory</h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Equipment stock levels, re-order alerts, and pro-shop retail items</p>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>Product Name</th>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>Category</th>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>Units in Stock</th>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600 }}>Price</th>
                <th style={{ padding: '0.75rem 1.25rem', color: '#64748b', fontWeight: 600, textAlign: 'right' }}>Stock Status</th>
              </tr>
            </thead>
            <tbody>
              {displayProducts.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#0f172a' }}>{p.name}</td>
                  <td style={{ padding: '1rem 1.25rem', color: '#64748b' }}>{p.category}</td>
                  <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#0f172a' }}>{p.stock}</td>
                  <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#2563eb' }}>{p.price}</td>
                  <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                    <span style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: p.status === 'in_stock' ? '#ecfdf5' : p.status === 'low_stock' ? '#fef3c7' : '#fee2e2',
                      color: p.status === 'in_stock' ? '#059669' : p.status === 'low_stock' ? '#d97706' : '#dc2626',
                      textTransform: 'uppercase'
                    }}>
                      {p.status.replace('_', ' ')}
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
