import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart, removeFromCart, clearCart } from '../bar.slice.js';

export default function BarPOS() {
  const dispatch = useDispatch();
  const { cart, total } = useSelector((state) => state.bar);

  const menuItems = [
    { id: 'item-1', name: 'Electrolyte Energy Drink', price: 4.5, category: 'Beverages', icon: '🥤' },
    { id: 'item-2', name: 'Artisan Espresso / Americano', price: 3.5, category: 'Coffee', icon: '☕' },
    { id: 'item-3', name: 'Whey Protein Shake (Vanilla)', price: 6.0, category: 'Smoothies', icon: '🥛' },
    { id: 'item-4', name: 'Organic Banana & Almond Bar', price: 2.5, category: 'Snacks', icon: '🍌' },
    { id: 'item-5', name: 'Electrolyte Mineral Water (1L)', price: 3.0, category: 'Beverages', icon: '💧' },
    { id: 'item-6', name: 'Matcha Green Tea Latte', price: 5.0, category: 'Coffee', icon: '🍵' },
  ];

  return (
    <div className="df-page-wrapper">
      <div className="df-page-container">
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>Bar & Cafe POS</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Fast checkout for post-game refreshments, coffee, snacks, and nutrition</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Menu Catalog */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {menuItems.map((item) => (
              <div
                key={item.id}
                onClick={() => dispatch(addToCart(item))}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.75rem',
                  padding: '1.25rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textAlign: 'center',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
              >
                <div style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>{item.icon}</div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a', marginBottom: '0.25rem' }}>{item.name}</div>
                <div style={{ color: '#2563eb', fontWeight: 700, fontSize: '1.1rem' }}>${item.price.toFixed(2)}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>{item.category}</div>
              </div>
            ))}
          </div>

          {/* Cart / Register Panel */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>Current Order</h3>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => dispatch(clearCart())}
                  style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  Clear
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                Cart is empty. Tap items on the left to add.
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  {cart.map((item) => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{item.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Qty: {item.qty} × ${item.price.toFixed(2)}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>
                          ${(item.price * item.qty).toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => dispatch(removeFromCart(item.id))}
                          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem' }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '1rem 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 600, color: '#475569' }}>Total</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>${total.toFixed(2)}</span>
                </div>

                <button
                  type="button"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                  }}
                  onClick={() => alert(`Order charged: $${total.toFixed(2)}`)}
                >
                  Charge Order
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
