import React, { useState, useEffect, useCallback } from 'react';
import useAuth from '../../auth/hook/useAuth.js';
import { useToast } from '../../../shared/context/ToastContext.jsx';
import { sportsApi, courtsApi, courtRatesApi } from '../../clubs/services/admin.api.js';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SPORT_ICONS = ['🎾', '🏸', '⚽', '🏏', '🏀', '🏐', '🏓', '🥊', '🏊', '🏃', '⛳', '🎱'];

const inputStyle = {
  width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.875rem',
  border: '1px solid #E7E5DF', borderRadius: '6px', background: '#FFFFFF',
  color: '#1A1A18', outline: 'none', boxSizing: 'border-box',
};
const labelStyle = { display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6B6B66', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' };
const btnPrimary = { padding: '0.5rem 1.25rem', background: '#1F5C46', color: '#FFFFFF', border: '1px solid transparent', borderRadius: '6px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' };
const btnDanger = { padding: '0.35rem 0.75rem', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2', borderRadius: '6px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' };
const btnSecondary = { padding: '0.5rem 1.1rem', background: '#FFFFFF', color: '#1A1A18', border: '1px solid #E7E5DF', borderRadius: '6px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' };
const card = { background: '#FFFFFF', border: '1px solid #E7E5DF', borderRadius: '8px', padding: '1.25rem', marginBottom: '0.875rem', boxShadow: 'none' };

// ─── Sports Tab ──────────────────────────────────────────────────────────────
function SportsTab({ role }) {
  const { toast } = useToast();
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', icon: '🎾', sort_order: 0 });

  const canEdit = ['owner', 'manager'].includes(role);

  const load = useCallback(async () => {
    setLoading(true);
    try { setSports(await sportsApi.list(null)); } catch { toast.error('Failed to load sports'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setForm({ name: '', description: '', icon: '🎾', sort_order: 0 }); setEditing(null); setShowForm(false); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Sport name is required');
    try {
      if (editing) {
        await sportsApi.update(editing.id, form);
        toast.success('Sport updated!');
      } else {
        await sportsApi.create(form);
        toast.success('Sport created!');
      }
      resetForm(); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save sport'); }
  };

  const handleToggle = async (sport) => {
    try {
      await sportsApi.update(sport.id, { is_active: !sport.is_active });
      toast.success(sport.is_active ? 'Sport deactivated' : 'Sport activated');
      load();
    } catch { toast.error('Failed to update'); }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Loading sports...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Sports</h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>Configure sports offered at your club</p>
        </div>
        {canEdit && <button style={btnPrimary} onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ name: '', description: '', icon: '🎾', sort_order: sports.length }); }}>+ Add Sport</button>}
      </div>

      {showForm && (
        <div style={{ ...card, background: '#f8fafc', marginBottom: '1.5rem', border: '1px solid #bfdbfe' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700 }}>{editing ? 'Edit Sport' : 'New Sport'}</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={labelStyle}>Sport Name *</label>
                <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Tennis" required />
              </div>
              <div>
                <label style={labelStyle}>Icon</label>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {SPORT_ICONS.map(ic => (
                    <button key={ic} type="button" onClick={() => setForm(f => ({ ...f, icon: ic }))}
                      style={{ fontSize: '1.4rem', background: form.icon === ic ? '#dbeafe' : '#f1f5f9', border: form.icon === ic ? '2px solid #2563eb' : '1px solid #e2e8f0', borderRadius: '0.4rem', padding: '0.2rem 0.4rem', cursor: 'pointer' }}>
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={labelStyle}>Description</label>
              <input style={inputStyle} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Sort Order</label>
              <input type="number" style={{ ...inputStyle, width: '100px' }} value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: +e.target.value }))} min={0} />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="submit" style={btnPrimary}>Save Sport</button>
              <button type="button" style={btnSecondary} onClick={resetForm}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {sports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎾</div>
          <p>No sports yet. Add your first sport to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
          {sports.map(sport => (
            <div key={sport.id} style={{ ...card, opacity: sport.is_active ? 1 : 0.6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '2rem' }}>{sport.icon || '🏅'}</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{sport.name}</div>
                  <div style={{ fontSize: '0.75rem', color: sport.is_active ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                    {sport.is_active ? '● Active' : '○ Inactive'}
                  </div>
                </div>
              </div>
              {sport.description && <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.75rem' }}>{sport.description}</p>}
              {canEdit && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button style={{ ...btnSecondary, padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                    onClick={() => { setEditing(sport); setForm({ name: sport.name, description: sport.description || '', icon: sport.icon || '🎾', sort_order: sport.sort_order }); setShowForm(true); }}>
                    ✏️ Edit
                  </button>
                  <button style={{ ...btnDanger }} onClick={() => handleToggle(sport)}>
                    {sport.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Courts Tab ──────────────────────────────────────────────────────────────
function CourtsTab({ role }) {
  const { toast } = useToast();
  const [courts, setCourts] = useState([]);
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', sport_id: '', surface: '', description: '', is_indoor: false, has_lighting: false, max_players: 4, sort_order: 0, is_active: true });

  const canEdit = ['owner', 'manager'].includes(role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, s] = await Promise.all([courtsApi.list(null), sportsApi.list(true)]);
      setCourts(c); setSports(s);
    } catch { toast.error('Failed to load courts'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setForm({ name: '', sport_id: '', surface: '', description: '', is_indoor: false, has_lighting: false, max_players: 4, sort_order: 0, is_active: true }); setEditing(null); setShowForm(false); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Court name is required');
    if (!form.sport_id) return toast.error('Please select a sport');
    try {
      if (editing) { await courtsApi.update(editing.id, form); toast.success('Court updated!'); }
      else { await courtsApi.create(form); toast.success('Court created!'); }
      resetForm(); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save court'); }
  };

  const handleToggle = async (court) => {
    try { await courtsApi.update(court.id, { is_active: !court.is_active }); toast.success('Updated'); load(); }
    catch { toast.error('Failed'); }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Loading courts...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Courts</h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>Manage your facility's courts and their properties</p>
        </div>
        {canEdit && sports.length > 0 && (
          <button style={btnPrimary} onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ name: '', sport_id: sports[0]?.id || '', surface: '', description: '', is_indoor: false, has_lighting: false, max_players: 4, sort_order: courts.length, is_active: true }); }}>+ Add Court</button>
        )}
      </div>

      {sports.length === 0 && <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '0.5rem', padding: '1rem', color: '#92400e', marginBottom: '1rem' }}>⚠️ Add at least one sport first before creating courts.</div>}

      {showForm && (
        <div style={{ ...card, background: '#f8fafc', marginBottom: '1.5rem', border: '1px solid #bfdbfe' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700 }}>{editing ? 'Edit Court' : 'New Court'}</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={labelStyle}>Court Name *</label>
                <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Court A" required />
              </div>
              <div>
                <label style={labelStyle}>Sport *</label>
                <select style={inputStyle} value={form.sport_id} onChange={e => setForm(f => ({ ...f, sport_id: e.target.value }))} required>
                  <option value="">Select sport...</option>
                  {sports.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Surface Type</label>
                <select style={inputStyle} value={form.surface} onChange={e => setForm(f => ({ ...f, surface: e.target.value }))}>
                  <option value="">Select...</option>
                  {['Hard Court', 'Clay', 'Grass', 'Synthetic', 'Wood', 'Acrylic', 'Concrete', 'Other'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Max Players</label>
                <input type="number" style={inputStyle} value={form.max_players} onChange={e => setForm(f => ({ ...f, max_players: +e.target.value }))} min={1} max={50} />
              </div>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={labelStyle}>Description</label>
              <input style={inputStyle} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional notes about this court" />
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {[['is_indoor', '🏠 Indoor'], ['has_lighting', '💡 Floodlights'], ['is_active', '✅ Active']].map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
                  <input type="checkbox" checked={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} />
                  {label}
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="submit" style={btnPrimary}>Save Court</button>
              <button type="button" style={btnSecondary} onClick={resetForm}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {courts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏟️</div>
          <p>No courts yet. Add your first court to get started.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                {['Court', 'Sport', 'Surface', 'Type', 'Max Players', 'Lighting', 'Status', canEdit ? 'Actions' : ''].filter(Boolean).map(h => (
                  <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {courts.map(court => (
                <tr key={court.id} style={{ borderBottom: '1px solid #f1f5f9', opacity: court.is_active ? 1 : 0.5 }}>
                  <td style={{ padding: '0.85rem 0.75rem', fontWeight: 700, color: '#0f172a' }}>{court.name}</td>
                  <td style={{ padding: '0.85rem 0.75rem' }}>{court.sport_icon || '🏅'} {court.sport_name || '—'}</td>
                  <td style={{ padding: '0.85rem 0.75rem', color: '#64748b' }}>{court.surface || '—'}</td>
                  <td style={{ padding: '0.85rem 0.75rem' }}>{court.is_indoor ? '🏠 Indoor' : '☀️ Outdoor'}</td>
                  <td style={{ padding: '0.85rem 0.75rem' }}>{court.max_players}</td>
                  <td style={{ padding: '0.85rem 0.75rem' }}>{court.has_lighting ? '✅' : '—'}</td>
                  <td style={{ padding: '0.85rem 0.75rem' }}>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, background: court.is_active ? '#dcfce7' : '#fee2e2', color: court.is_active ? '#16a34a' : '#dc2626' }}>
                      {court.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {canEdit && (
                    <td style={{ padding: '0.85rem 0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button style={{ ...btnSecondary, padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                          onClick={() => { setEditing(court); setForm({ name: court.name, sport_id: court.sport_id, surface: court.surface || '', description: court.description || '', is_indoor: court.is_indoor, has_lighting: court.has_lighting, max_players: court.max_players, sort_order: court.sort_order, is_active: court.is_active }); setShowForm(true); }}>
                          Edit
                        </button>
                        <button style={btnDanger} onClick={() => handleToggle(court)}>{court.is_active ? 'Off' : 'On'}</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Operating Hours Tab ──────────────────────────────────────────────────────
function OperatingHoursTab({ role }) {
  const { toast } = useToast();
  const [courts, setCourts] = useState([]);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [hours, setHours] = useState([]);
  const [saving, setSaving] = useState(false);
  const canEdit = ['owner', 'manager'].includes(role);

  const DEFAULT_HOURS = WEEKDAYS.map((_, i) => ({ weekday: i, opens_at: '06:00', closes_at: '22:00', is_closed: false }));

  useEffect(() => { courtsApi.list(true).then(setCourts).catch(() => {}); }, []);

  useEffect(() => {
    if (!selectedCourt) { setHours(DEFAULT_HOURS); return; }
    courtsApi.getHours(selectedCourt).then(fetched => {
      const map = Object.fromEntries(fetched.map(h => [h.weekday, h]));
      setHours(DEFAULT_HOURS.map(d => map[d.weekday] ? { ...d, ...map[d.weekday] } : d));
    }).catch(() => setHours(DEFAULT_HOURS));
  }, [selectedCourt]);

  const handleSave = async () => {
    if (!selectedCourt) return toast.error('Select a court first');
    setSaving(true);
    try {
      await courtsApi.setHours(selectedCourt, hours);
      toast.success('Operating hours saved!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); } finally { setSaving(false); }
  };

  const update = (weekday, field, value) => setHours(h => h.map(d => d.weekday === weekday ? { ...d, [field]: value } : d));

  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.25rem' }}>Operating Hours</h2>
        <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>Set open/close times for each court per day of the week</p>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>Select Court</label>
        <select style={{ ...inputStyle, maxWidth: '320px' }} value={selectedCourt || ''} onChange={e => setSelectedCourt(e.target.value || null)}>
          <option value="">— Pick a court —</option>
          {courts.map(c => <option key={c.id} value={c.id}>{c.sport_icon || '🏅'} {c.name} ({c.sport_name})</option>)}
        </select>
      </div>

      <div style={{ ...card, padding: '0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
              {['Day', 'Opens At', 'Closes At', 'Closed'].map(h => (
                <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map(h => (
              <tr key={h.weekday} style={{ borderBottom: '1px solid #f1f5f9', opacity: h.is_closed ? 0.5 : 1 }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{WEEKDAYS[h.weekday]}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <input type="time" style={{ ...inputStyle, width: '130px' }} value={h.opens_at} disabled={h.is_closed || !canEdit} onChange={e => update(h.weekday, 'opens_at', e.target.value)} />
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <input type="time" style={{ ...inputStyle, width: '130px' }} value={h.closes_at} disabled={h.is_closed || !canEdit} onChange={e => update(h.weekday, 'closes_at', e.target.value)} />
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: canEdit ? 'pointer' : 'default' }}>
                    <input type="checkbox" checked={h.is_closed} disabled={!canEdit} onChange={e => update(h.weekday, 'is_closed', e.target.checked)} />
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Closed</span>
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <div style={{ marginTop: '1rem' }}>
          <button style={btnPrimary} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : '💾 Save Operating Hours'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Court Rates Tab ──────────────────────────────────────────────────────────
function CourtRatesTab({ role }) {
  const { toast } = useToast();
  const [rates, setRates] = useState([]);
  const [sports, setSports] = useState([]);
  const [courts, setCourts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ sport_id: '', court_id: '', plan_id: '', weekday: '', time_from: '', time_to: '', valid_from: '', valid_to: '', price: '', priority: 0 });
  const canEdit = ['owner', 'manager'].includes(role);

  const load = async () => {
    setLoading(true);
    try {
      const [r, s, c, p] = await Promise.all([
        courtRatesApi.list(),
        sportsApi.list(true),
        courtsApi.list(true),
        import('../../clubs/services/admin.api.js').then(m => m.plansApi.list(true)),
      ]);
      setRates(r); setSports(s); setCourts(c); setPlans(p);
    } catch { toast.error('Failed to load pricing data'); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm({ sport_id: '', court_id: '', plan_id: '', weekday: '', time_from: '', time_to: '', valid_from: '', valid_to: '', price: '', priority: 0 }); setEditing(null); setShowForm(false); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.price) return toast.error('Price is required');
    const payload = {
      ...form,
      sport_id: form.sport_id || null,
      court_id: form.court_id || null,
      plan_id: form.plan_id || null,
      weekday: form.weekday !== '' ? +form.weekday : null,
      time_from: form.time_from || null,
      time_to: form.time_to || null,
      valid_from: form.valid_from || null,
      valid_to: form.valid_to || null,
      price: +form.price,
    };
    try {
      if (editing) { await courtRatesApi.update(editing.id, payload); toast.success('Rate updated!'); }
      else { await courtRatesApi.create(payload); toast.success('Rate created!'); }
      resetForm(); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save rate'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this pricing rule?')) return;
    try { await courtRatesApi.remove(id); toast.success('Rate deactivated'); load(); }
    catch { toast.error('Failed'); }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Loading pricing rules...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Court Pricing Rules</h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>Most specific match wins. Higher priority = applied first.</p>
        </div>
        {canEdit && <button style={btnPrimary} onClick={() => { setShowForm(!showForm); setEditing(null); resetForm(); }}>+ Add Rate</button>}
      </div>

      {showForm && (
        <div style={{ ...card, background: '#f8fafc', marginBottom: '1.5rem', border: '1px solid #bfdbfe' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700 }}>{editing ? 'Edit Pricing Rule' : 'New Pricing Rule'}</h3>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#1e40af' }}>
            💡 Leave Sport/Court/Plan blank to apply to ALL. Leave Weekday/Time blank to apply to ALL times.
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={labelStyle}>Sport (optional)</label>
                <select style={inputStyle} value={form.sport_id} onChange={e => setForm(f => ({ ...f, sport_id: e.target.value, court_id: '' }))}>
                  <option value="">All Sports</option>
                  {sports.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Court (optional)</label>
                <select style={inputStyle} value={form.court_id} onChange={e => setForm(f => ({ ...f, court_id: e.target.value }))}>
                  <option value="">All Courts</option>
                  {courts.filter(c => !form.sport_id || c.sport_id === form.sport_id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Plan (optional)</label>
                <select style={inputStyle} value={form.plan_id} onChange={e => setForm(f => ({ ...f, plan_id: e.target.value }))}>
                  <option value="">Walk-in / Default</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={labelStyle}>Weekday (optional)</label>
                <select style={inputStyle} value={form.weekday} onChange={e => setForm(f => ({ ...f, weekday: e.target.value }))}>
                  <option value="">All Days</option>
                  {WEEKDAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Time From</label>
                <input type="time" style={inputStyle} value={form.time_from} onChange={e => setForm(f => ({ ...f, time_from: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Time To</label>
                <input type="time" style={inputStyle} value={form.time_to} onChange={e => setForm(f => ({ ...f, time_to: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Priority</label>
                <input type="number" style={inputStyle} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: +e.target.value }))} min={0} max={100} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={labelStyle}>Price (₹) *</label>
                <input type="number" style={inputStyle} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" min={0} step="0.01" required />
              </div>
              <div>
                <label style={labelStyle}>Valid From</label>
                <input type="date" style={inputStyle} value={form.valid_from} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Valid To</label>
                <input type="date" style={inputStyle} value={form.valid_to} onChange={e => setForm(f => ({ ...f, valid_to: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="submit" style={btnPrimary}>Save Rate</button>
              <button type="button" style={btnSecondary} onClick={resetForm}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {rates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>💰</div>
          <p>No pricing rules yet. Add rates to control court booking prices.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
                {['Applies To', 'Plan', 'Day', 'Time Window', 'Price', 'Priority', 'Status', canEdit ? 'Actions' : ''].filter(Boolean).map(h => (
                  <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rates.map(rate => (
                <tr key={rate.id} style={{ borderBottom: '1px solid #f1f5f9', opacity: rate.is_active ? 1 : 0.5 }}>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.8rem' }}>
                      {rate.court_name ? <span style={{ fontWeight: 700 }}>{rate.court_name}</span> : rate.sport_name ? <span>{rate.sport_name} (all courts)</span> : <span style={{ color: '#94a3b8' }}>All courts</span>}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem' }}>{rate.plan_name ? <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '0.15rem 0.5rem', borderRadius: '0.3rem', fontSize: '0.75rem', fontWeight: 700 }}>{rate.plan_name}</span> : <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Walk-in</span>}</td>
                  <td style={{ padding: '0.75rem', fontSize: '0.8rem' }}>{rate.weekday != null ? WEEKDAYS[rate.weekday] : 'All'}</td>
                  <td style={{ padding: '0.75rem', fontSize: '0.8rem' }}>{rate.time_from && rate.time_to ? `${rate.time_from}–${rate.time_to}` : 'All day'}</td>
                  <td style={{ padding: '0.75rem', fontWeight: 700, color: '#0f172a' }}>₹{Number(rate.price).toFixed(0)}</td>
                  <td style={{ padding: '0.75rem' }}><span style={{ background: '#f1f5f9', borderRadius: '0.3rem', padding: '0.15rem 0.4rem', fontSize: '0.75rem' }}>{rate.priority}</span></td>
                  <td style={{ padding: '0.75rem' }}><span style={{ padding: '0.2rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, background: rate.is_active ? '#dcfce7' : '#fee2e2', color: rate.is_active ? '#16a34a' : '#dc2626' }}>{rate.is_active ? 'Active' : 'Off'}</span></td>
                  {canEdit && (
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button style={{ ...btnSecondary, padding: '0.25rem 0.6rem', fontSize: '0.8rem' }} onClick={() => {
                          setEditing(rate);
                          setForm({ sport_id: rate.sport_id || '', court_id: rate.court_id || '', plan_id: rate.plan_id || '', weekday: rate.weekday != null ? String(rate.weekday) : '', time_from: rate.time_from || '', time_to: rate.time_to || '', valid_from: rate.valid_from || '', valid_to: rate.valid_to || '', price: rate.price, priority: rate.priority });
                          setShowForm(true);
                        }}>Edit</button>
                        <button style={btnDanger} onClick={() => handleDelete(rate.id)}>Del</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Courts Management Page ──────────────────────────────────────────────
const TABS = [
  { key: 'sports', label: '🎾 Sports' },
  { key: 'courts', label: '🏟️ Courts' },
  { key: 'hours', label: '🕐 Operating Hours' },
  { key: 'pricing', label: '💰 Pricing Rules' },
];

export default function CourtsManagement() {
  const { role } = useAuth();
  const userRole = (role || 'public').toLowerCase();
  const [tab, setTab] = useState('sports');

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', background: '#FAF9F6', minHeight: 'calc(100vh - 70px)' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1A1A18', margin: '0 0 0.25rem' }}>Courts & Sports Management</h1>
        <p style={{ color: '#6B6B66', fontSize: '0.875rem', margin: 0 }}>Configure sports, courts, operating hours, and multi-tier pricing rules</p>
      </div>

      {/* Tab Nav */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #E7E5DF', marginBottom: '1.5rem', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '0.65rem 1.1rem', fontWeight: 600, fontSize: '0.85rem',
            background: tab === t.key ? '#EBF3F0' : 'transparent',
            border: 'none', cursor: 'pointer',
            borderBottom: tab === t.key ? '2px solid #1F5C46' : '2px solid transparent',
            color: tab === t.key ? '#1F5C46' : '#6B6B66',
            marginBottom: '-1px', whiteSpace: 'nowrap', borderRadius: '6px 6px 0 0',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'sports' && <SportsTab role={userRole} />}
      {tab === 'courts' && <CourtsTab role={userRole} />}
      {tab === 'hours' && <OperatingHoursTab role={userRole} />}
      {tab === 'pricing' && <CourtRatesTab role={userRole} />}
    </div>
  );
}
