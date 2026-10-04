import React, { useState, useEffect, useCallback, useMemo } from 'react';
import useAuth from '../../auth/hook/useAuth.js';
import { useToast } from '../../../shared/context/ToastContext.jsx';
import { plansApi } from '../../clubs/services/admin.api.js';

const inputStyle = { width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.875rem', border: '1px solid #E7E5DF', borderRadius: '6px', background: '#FFFFFF', color: '#1A1A18', outline: 'none', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6B6B66', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' };
const btnPrimary = { padding: '0.5rem 1.25rem', background: '#1F5C46', color: '#FFFFFF', border: '1px solid transparent', borderRadius: '6px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' };
const btnDanger = { padding: '0.4rem 0.85rem', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2', borderRadius: '6px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' };
const btnSecondary = { padding: '0.5rem 1.1rem', background: '#FFFFFF', color: '#1A1A18', border: '1px solid #E7E5DF', borderRadius: '6px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' };

const PLAN_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#06b6d4', '#6366f1'];

const EMPTY_PLAN = {
  name: '', code: '', description: '', color: '#3b82f6', tier_rank: 0,
  duration_days: 30, price: 0, joining_fee: 0,
  min_age: '', max_age: '',
  court_free: false, court_discount_percent: 0, shop_discount_percent: 0, bar_discount_percent: 0,
  max_bookings_per_day: '', advance_booking_days: '',
  is_public: true, is_active: true, sort_order: 0,
};

// ─── Plan Form Modal ──────────────────────────────────────────────────────────
const PlanForm = React.memo(function PlanForm({ plan, onSave, onCancel }) {
  const { toast } = useToast();
  const [form, setForm] = useState(plan ? {
    ...EMPTY_PLAN, ...plan,
    min_age: plan.min_age ?? '',
    max_age: plan.max_age ?? '',
    max_bookings_per_day: plan.max_bookings_per_day ?? '',
    advance_booking_days: plan.advance_booking_days ?? '',
  } : { ...EMPTY_PLAN });
  const [saving, setSaving] = useState(false);
  const [benefitInput, setBenefitInput] = useState('');
  const [benefits, setBenefits] = useState(plan?.benefits || []);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Plan name is required');
    if (!form.duration_days || form.duration_days < 1) return toast.error('Duration must be at least 1 day');
    setSaving(true);
    try {
      const payload = {
        ...form,
        min_age: form.min_age !== '' ? +form.min_age : null,
        max_age: form.max_age !== '' ? +form.max_age : null,
        max_bookings_per_day: form.max_bookings_per_day !== '' ? +form.max_bookings_per_day : null,
        advance_booking_days: form.advance_booking_days !== '' ? +form.advance_booking_days : null,
        price: +form.price, joining_fee: +form.joining_fee,
        court_discount_percent: +form.court_discount_percent,
        shop_discount_percent: +form.shop_discount_percent,
        bar_discount_percent: +form.bar_discount_percent,
        tier_rank: +form.tier_rank,
        duration_days: +form.duration_days,
        sort_order: +form.sort_order,
      };
      const saved = plan ? await plansApi.update(plan.id, payload) : await plansApi.create(payload);
      // Add any new benefits (for new plans only, editing handles separately)
      if (!plan && benefits.length > 0) {
        for (let i = 0; i < benefits.length; i++) {
          await plansApi.addBenefit(saved.id, benefits[i].label, i);
        }
      }
      toast.success(plan ? 'Plan updated!' : 'Plan created!');
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const addBenefit = () => {
    if (!benefitInput.trim()) return;
    setBenefits(b => [...b, { id: `tmp-${Date.now()}`, label: benefitInput.trim(), sort_order: b.length }]);
    setBenefitInput('');
  };

  const removeBenefit = async (benefit) => {
    if (plan && !benefit.id.startsWith('tmp-')) {
      try { await plansApi.removeBenefit(plan.id, benefit.id); toast.success('Benefit removed'); }
      catch { return toast.error('Failed to remove benefit'); }
    }
    setBenefits(b => b.filter(x => x.id !== benefit.id));
  };

  const saveBenefit = async () => {
    if (!benefitInput.trim()) return;
    if (plan) {
      try {
        const newB = await plansApi.addBenefit(plan.id, benefitInput.trim(), benefits.length);
        setBenefits(b => [...b, newB]);
        setBenefitInput('');
        toast.success('Benefit added');
      } catch { toast.error('Failed'); }
    } else {
      addBenefit();
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#fff', borderRadius: '1rem', width: '100%', maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.2)' }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1, borderRadius: '1rem 1rem 0 0' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{plan ? 'Edit Plan' : 'Create Membership Plan'}</h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>Configure pricing, discounts, and entitlements</p>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          {/* Basic Info */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>📋 Basic Information</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Plan Name *</label>
                <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Gold, Silver, Junior" required />
              </div>
              <div>
                <label style={labelStyle}>Code</label>
                <input style={inputStyle} value={form.code} onChange={e => set('code', e.target.value)} placeholder="e.g. GOLD, SLV" />
              </div>
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <label style={labelStyle}>Description</label>
              <textarea style={{ ...inputStyle, height: '60px', resize: 'vertical', fontFamily: 'inherit' }} value={form.description} onChange={e => set('description', e.target.value)} placeholder="What does this plan include?" />
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <label style={labelStyle}>Color Badge</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {PLAN_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => set('color', c)} style={{ width: '28px', height: '28px', borderRadius: '50%', background: c, border: form.color === c ? '3px solid #0f172a' : '2px solid transparent', cursor: 'pointer' }} />
                ))}
                <span style={{ fontWeight: 600, fontSize: '0.8rem', padding: '0.2rem 0.75rem', borderRadius: '9999px', background: form.color, color: '#fff' }}>{form.name || 'Preview'}</span>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>💰 Pricing</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Duration (days) *</label>
                <input type="number" style={inputStyle} value={form.duration_days} onChange={e => set('duration_days', e.target.value)} min={1} required />
              </div>
              <div>
                <label style={labelStyle}>Plan Price (₹)</label>
                <input type="number" style={inputStyle} value={form.price} onChange={e => set('price', e.target.value)} min={0} step="0.01" />
              </div>
              <div>
                <label style={labelStyle}>Joining Fee (₹)</label>
                <input type="number" style={inputStyle} value={form.joining_fee} onChange={e => set('joining_fee', e.target.value)} min={0} step="0.01" />
              </div>
            </div>
          </div>

          {/* Court Entitlements */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>🏟️ Court Entitlements</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.court_free} onChange={e => set('court_free', e.target.checked)} />
              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>🆓 Free court access (play without paying per booking)</span>
            </label>
            {!form.court_free && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Court Discount (%)</label>
                  <input type="number" style={inputStyle} value={form.court_discount_percent} onChange={e => set('court_discount_percent', e.target.value)} min={0} max={100} />
                </div>
                <div>
                  <label style={labelStyle}>Shop Discount (%)</label>
                  <input type="number" style={inputStyle} value={form.shop_discount_percent} onChange={e => set('shop_discount_percent', e.target.value)} min={0} max={100} />
                </div>
                <div>
                  <label style={labelStyle}>Bar Discount (%)</label>
                  <input type="number" style={inputStyle} value={form.bar_discount_percent} onChange={e => set('bar_discount_percent', e.target.value)} min={0} max={100} />
                </div>
              </div>
            )}
          </div>

          {/* Booking Rules */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>📅 Booking Rules (overrides club defaults)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Max Bookings/Day</label>
                <input type="number" style={inputStyle} value={form.max_bookings_per_day} onChange={e => set('max_bookings_per_day', e.target.value)} placeholder="Leave blank = club default" min={1} />
              </div>
              <div>
                <label style={labelStyle}>Advance Booking (days)</label>
                <input type="number" style={inputStyle} value={form.advance_booking_days} onChange={e => set('advance_booking_days', e.target.value)} placeholder="Leave blank = club default" min={1} />
              </div>
            </div>
          </div>

          {/* Age & Restrictions */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>👤 Age & Restrictions</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Min Age</label>
                <input type="number" style={inputStyle} value={form.min_age} onChange={e => set('min_age', e.target.value)} placeholder="e.g. 18" min={0} />
              </div>
              <div>
                <label style={labelStyle}>Max Age (Junior ≤17)</label>
                <input type="number" style={inputStyle} value={form.max_age} onChange={e => set('max_age', e.target.value)} placeholder="e.g. 17" min={0} />
              </div>
              <div>
                <label style={labelStyle}>Tier Rank</label>
                <input type="number" style={inputStyle} value={form.tier_rank} onChange={e => set('tier_rank', e.target.value)} min={0} placeholder="Higher = better" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              {[['is_public', '🌐 Show on Public Site'], ['is_active', '✅ Active']].map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
                  <input type="checkbox" checked={form[key]} onChange={e => set(key, e.target.checked)} />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Benefits */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>✨ Plan Benefits (shown on pricing page)</div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <input style={{ ...inputStyle, flex: 1 }} value={benefitInput} onChange={e => setBenefitInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), saveBenefit())} placeholder="e.g. Free court hire on weekdays" />
              <button type="button" style={{ ...btnPrimary, padding: '0.5rem 1rem', whiteSpace: 'nowrap' }} onClick={saveBenefit}>+ Add</button>
            </div>
            {benefits.length > 0 && (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {benefits.map(b => (
                  <li key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.4rem', padding: '0.5rem 0.75rem' }}>
                    <span style={{ fontSize: '0.875rem' }}>✓ {b.label}</span>
                    <button type="button" style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '1rem' }} onClick={() => removeBenefit(b)}>✕</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer actions */}
          <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
            <button type="submit" style={btnPrimary} disabled={saving}>{saving ? 'Saving...' : plan ? '💾 Update Plan' : '✨ Create Plan'}</button>
            <button type="button" style={btnSecondary} onClick={onCancel}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
});

// ─── Plan Card ────────────────────────────────────────────────────────────────
const PlanCard = React.memo(function PlanCard({ plan, canEdit, onEdit, onToggle }) {
  return (
    <div style={{ background: '#fff', border: `2px solid ${plan.color || '#3b82f6'}20`, borderRadius: '1rem', padding: '1.5rem', position: 'relative', display: 'flex', flexDirection: 'column', opacity: plan.is_active ? 1 : 0.6, transition: 'box-shadow 0.15s', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      {!plan.is_active && (
        <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: '#fee2e2', color: '#dc2626', fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '9999px' }}>INACTIVE</div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: plan.color || '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1.1rem', flexShrink: 0 }}>
          {plan.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{plan.name}</div>
          {plan.code && <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{plan.code}</div>}
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>₹{Number(plan.price).toLocaleString()}</span>
        <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '0.25rem' }}>/ {plan.duration_days} days</span>
        {plan.joining_fee > 0 && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>+ ₹{Number(plan.joining_fee).toLocaleString()} joining fee</div>}
      </div>

      {plan.description && <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.75rem', flexGrow: 1 }}>{plan.description}</p>}

      {/* Discounts */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        {plan.court_free && <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '9999px' }}>🆓 Free Courts</span>}
        {!plan.court_free && plan.court_discount_percent > 0 && <span style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '9999px' }}>{plan.court_discount_percent}% court off</span>}
        {plan.shop_discount_percent > 0 && <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '9999px' }}>{plan.shop_discount_percent}% shop off</span>}
        {plan.bar_discount_percent > 0 && <span style={{ background: '#fce7f3', color: '#9d174d', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '9999px' }}>{plan.bar_discount_percent}% bar off</span>}
        {plan.max_age && <span style={{ background: '#f3f4f6', color: '#374151', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '9999px' }}>Under {plan.max_age + 1}</span>}
      </div>

      {/* Benefits */}
      {plan.benefits?.length > 0 && (
        <ul style={{ margin: '0 0 0.75rem', padding: 0, listStyle: 'none' }}>
          {plan.benefits.slice(0, 4).map(b => <li key={b.id} style={{ fontSize: '0.78rem', color: '#374151', padding: '0.15rem 0', display: 'flex', gap: '0.4rem' }}><span style={{ color: '#22c55e' }}>✓</span>{b.label}</li>)}
          {plan.benefits.length > 4 && <li style={{ fontSize: '0.75rem', color: '#94a3b8' }}>+{plan.benefits.length - 4} more...</li>}
        </ul>
      )}

      {canEdit && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
          <button style={{ ...btnSecondary, flex: 1, fontSize: '0.8rem', padding: '0.4rem 0' }} onClick={() => onEdit(plan)}>✏️ Edit</button>
          <button style={{ ...btnDanger, flex: 1, fontSize: '0.8rem', padding: '0.4rem 0' }} onClick={() => onToggle(plan)}>{plan.is_active ? 'Deactivate' : 'Activate'}</button>
        </div>
      )}
    </div>
  );
});

// ─── Main Membership Plans Page ───────────────────────────────────────────────
function MembershipPlans() {
  const { role } = useAuth();
  const { toast } = useToast();
  const userRole = (role || 'public').toLowerCase();
  const canEdit = ['owner', 'manager'].includes(userRole);

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [showInactive, setShowInactive] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setPlans(await plansApi.list(null)); }
    catch { toast.error('Failed to load plans'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleEdit = useCallback((plan) => { setEditingPlan(plan); setShowForm(true); }, []);
  const handleToggle = useCallback(async (plan) => {
    try {
      await plansApi.update(plan.id, { is_active: !plan.is_active });
      toast.success(plan.is_active ? 'Plan deactivated' : 'Plan activated');
      load();
    } catch { toast.error('Failed'); }
  }, [load, toast]);
  const handleSaved = useCallback(() => { setShowForm(false); setEditingPlan(null); load(); }, [load]);
  const handleCancelForm = useCallback(() => { setShowForm(false); setEditingPlan(null); }, []);

  const filtered = useMemo(() => showInactive ? plans : plans.filter(p => p.is_active), [showInactive, plans]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', color: '#94a3b8' }}>Loading plans...</div>;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', background: '#FAF9F6', minHeight: 'calc(100vh - 70px)' }}>
      {showForm && <PlanForm plan={editingPlan} onSave={handleSaved} onCancel={handleCancelForm} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1A1A18', margin: '0 0 0.25rem' }}>Membership Plans</h1>
          <p style={{ color: '#6B6B66', fontSize: '0.875rem', margin: 0 }}>Define tiers, pricing, discounts, and entitlements for your club members</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', color: '#6B6B66' }}>
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            Show inactive
          </label>
          {canEdit && <button style={btnPrimary} onClick={() => { setEditingPlan(null); setShowForm(true); }}>+ New Plan</button>}
        </div>
      </div>

      {/* Role Access Info */}
      {!canEdit && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.85rem', color: '#1e40af' }}>
          👁️ You can view plans. Only Owner and Manager can create or modify plans.
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏅</div>
          <h3 style={{ margin: '0 0 0.5rem', color: '#64748b' }}>No plans yet</h3>
          <p>Create your first membership plan to get started</p>
          {canEdit && <button style={{ ...btnPrimary, marginTop: '1rem' }} onClick={() => setShowForm(true)}>Create First Plan</button>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {filtered.map(plan => (
            <PlanCard key={plan.id} plan={plan} canEdit={canEdit} onEdit={() => handleEdit(plan)} onToggle={() => handleToggle(plan)} />
          ))}
        </div>
      )}

      {/* Staff Access Matrix info */}
      {canEdit && (
        <div style={{ marginTop: '3rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 700, color: '#374151' }}>📋 Plan Access by Role</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ fontSize: '0.8rem', borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  {['Role', 'View Plans', 'Create Plan', 'Edit Plan', 'Deactivate'].map(h => <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#64748b', fontWeight: 700 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {[['Owner', true, true, true, true], ['Manager', true, true, true, false], ['Front Desk', true, false, false, false], ['Bar Staff', true, false, false, false], ['Shop Staff', true, false, false, false], ['Member', '(public only)', false, false, false]].map(([r, ...perms]) => (
                  <tr key={r} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>{r}</td>
                    {perms.map((p, i) => <td key={i} style={{ padding: '0.5rem 0.75rem', color: p === true ? '#16a34a' : p === false ? '#dc2626' : '#64748b' }}>{p === true ? '✅' : p === false ? '❌' : p}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(MembershipPlans);
