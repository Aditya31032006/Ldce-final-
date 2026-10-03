import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPlans } from '../plans.slice.js';

export default function MembershipPlans() {
  const dispatch = useDispatch();
  const { plansList, loading } = useSelector((state) => state.plans);

  useEffect(() => {
    dispatch(fetchPlans());
  }, [dispatch]);

  const displayPlans = plansList.length > 0 ? plansList : [
    { id: 'p-1', name: 'Starter Pass', price: '$49', billing: 'per month', features: ['5 Court Hours / mo', 'Guest passes at $10', 'Locker access'], popular: false },
    { id: 'p-2', name: 'Club Pro', price: '$129', billing: 'per month', features: ['15 Court Hours / mo', '10% Bar & Pro Shop Discount', 'Priority Peak Slot Booking', 'Free Equipment Rental'], popular: true },
    { id: 'p-3', name: 'VIP Unlimited', price: '$249', billing: 'per month', features: ['Unlimited Court Hours', '25% Pro Shop Discount', 'Free Locker & Sauna Access', 'Complimentary Coaching Session'], popular: false },
  ];

  return (
    <div className="df-page-wrapper">
      <div className="df-page-container">
        <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 3rem auto' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>Membership Plans</h1>
          <p style={{ color: '#64748b', fontSize: '1rem' }}>Flexible membership packages tailored for casual players and tournament pros</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', alignItems: 'stretch' }}>
          {displayPlans.map((plan) => (
            <div
              key={plan.id}
              style={{
                background: '#ffffff',
                border: plan.popular ? '2px solid #2563eb' : '1px solid #e2e8f0',
                borderRadius: '1rem',
                padding: '2rem',
                boxShadow: plan.popular ? '0 10px 25px -5px rgba(37, 99, 235, 0.15)' : '0 1px 3px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
              }}
            >
              {plan.popular && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.75rem',
                  borderRadius: '9999px',
                  textTransform: 'uppercase'
                }}>
                  Most Popular
                </div>
              )}
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>{plan.name}</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a' }}>{plan.price}</span>
                  <span style={{ color: '#64748b', fontSize: '0.875rem' }}>/{plan.billing}</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0' }}>
                  {plan.features?.map((f, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.875rem', color: '#475569' }}>
                      <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: plan.popular ? '#2563eb' : '#f8fafc',
                  color: plan.popular ? '#ffffff' : '#0f172a',
                  border: plan.popular ? 'none' : '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Choose Plan
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
