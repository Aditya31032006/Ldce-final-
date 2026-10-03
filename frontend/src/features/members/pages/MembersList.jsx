import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Users,
  Search,
  UserPlus,
  RefreshCw,
  Mail,
  Phone,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  IdCard,
} from 'lucide-react';
import { fetchMembers } from '../members.slice.js';
import membersApi from '../services/members.api.js';

export default function MembersList() {
  const dispatch = useDispatch();
  const { membersList = [], loading, error } = useSelector((state) => state.members);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const [newMember, setNewMember] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    status: 'active',
  });

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  useEffect(() => {
    dispatch(fetchMembers());
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchMembers());
    showToast('Refreshing live directory from database...', 'info');
  };

  // Strictly live data from DB - No mock fallbacks!
  const liveMembers = useMemo(() => {
    return Array.isArray(membersList) ? membersList : [];
  }, [membersList]);

  // Filtered members by search and status
  const filteredMembers = useMemo(() => {
    return liveMembers.filter((m) => {
      const fullName = (m.full_name || `${m.first_name || ''} ${m.last_name || ''}`).toLowerCase();
      const email = (m.email || '').toLowerCase();
      const phone = (m.phone || '').toLowerCase();
      const code = (m.member_code || '').toLowerCase();
      const plan = (m.plan_name || '').toLowerCase();

      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        fullName.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        code.includes(q) ||
        plan.includes(q);

      const memberStatus = (m.status || m.membership_status || 'active').toLowerCase();
      const matchesStatus = statusFilter === 'all' || memberStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [liveMembers, search, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = liveMembers.length;
    const active = liveMembers.filter(
      (m) => (m.status || m.membership_status || 'active').toLowerCase() === 'active'
    ).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [liveMembers]);

  // Handle Add Member
  const handleCreateMember = async (e) => {
    e.preventDefault();
    if (!newMember.first_name.trim() || (!newMember.email && !newMember.phone)) {
      showToast('First name and either email or phone are required', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await membersApi.createMember({
        first_name: newMember.first_name.trim(),
        last_name: newMember.last_name.trim() || null,
        email: newMember.email.trim() || null,
        phone: newMember.phone.trim() || null,
        status: newMember.status,
      });
      showToast(`Member ${newMember.first_name} registered successfully!`);
      setNewMember({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        status: 'active',
      });
      setIsAddModalOpen(false);
      dispatch(fetchMembers());
    } catch (err) {
      console.error(err);
      showToast(err.customMessage || 'Failed to create member', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="df-page-wrapper" style={{ background: '#FAF9F6', minHeight: '100vh', padding: '1.75rem 2rem' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            padding: '0.75rem 1.25rem',
            borderRadius: '8px',
            background: notification.type === 'error' ? '#EF4444' : notification.type === 'info' ? '#2563EB' : '#1F5C46',
            color: '#FFFFFF',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          }}
        >
          {notification.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <IdCard size={24} color="#1F5C46" />
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#1A1A18', margin: 0 }}>
              Live Members Directory
            </h1>
          </div>
          <p style={{ color: '#6B6B66', fontSize: '0.85rem', margin: '0.35rem 0 0' }}>
            Real-time registered club members from database, active passes, and account statuses.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh Directory"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 0.9rem',
              borderRadius: '8px',
              border: '1px solid #E7E5DF',
              background: '#FFFFFF',
              color: '#1A1A18',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1.15rem',
              borderRadius: '8px',
              border: 'none',
              background: '#1F5C46',
              color: '#FFFFFF',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(31,92,70,0.2)',
            }}
          >
            <UserPlus size={16} />
            <span>Register Member</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ background: '#FFFFFF', border: '1px solid #E7E5DF', borderRadius: '10px', padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#6B6B66', fontWeight: 600 }}>Total Members in DB</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1A1A18', marginTop: '0.25rem' }}>
            {stats.total}
          </div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E7E5DF', borderRadius: '10px', padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 600 }}>Active Memberships</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#059669', marginTop: '0.25rem' }}>
            {stats.active}
          </div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E7E5DF', borderRadius: '10px', padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 600 }}>Inactive / Expired</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#DC2626', marginTop: '0.25rem' }}>
            {stats.inactive}
          </div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E7E5DF',
          borderRadius: '10px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: '#FAF9F6',
            border: '1px solid #E7E5DF',
            borderRadius: '8px',
            padding: '0.5rem 0.85rem',
            width: '100%',
            maxWidth: '380px',
            gap: '0.5rem',
          }}
        >
          <Search size={16} color="#6B6B66" />
          <input
            type="text"
            placeholder="Search by name, member code, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              width: '100%',
              fontSize: '0.85rem',
              color: '#1A1A18',
            }}
          />
        </div>

        {/* Status Filters */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[
            { id: 'all', label: `All (${liveMembers.length})` },
            { id: 'active', label: `Active (${stats.active})` },
            { id: 'inactive', label: `Inactive (${stats.inactive})` },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStatusFilter(st.id)}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: statusFilter === st.id ? '#1F5C46' : '#E7E5DF',
                background: statusFilter === st.id ? '#1F5C46' : '#FFFFFF',
                color: statusFilter === st.id ? '#FFFFFF' : '#1A1A18',
                fontSize: '0.78rem',
                fontWeight: statusFilter === st.id ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Table */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E7E5DF',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        {loading ? (
          <div style={{ padding: '3.5rem 2rem', textAlign: 'center', color: '#6B6B66' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
            <div style={{ fontWeight: 600 }}>Loading real-time member records from database...</div>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div style={{ padding: '3.5rem 2rem', textAlign: 'center', color: '#6B6B66' }}>
            <Users size={38} color="#A8A29E" style={{ margin: '0 auto 0.75rem' }} />
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1A1A18' }}>No members found</div>
            <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
              {search.trim()
                ? 'No live members matching your search query.'
                : 'No members are currently registered in this club directory.'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead style={{ background: '#F4F2EC', borderBottom: '1px solid #E7E5DF' }}>
              <tr>
                <th style={{ padding: '0.85rem 1.25rem', color: '#6B6B66', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Member Details
                </th>
                <th style={{ padding: '0.85rem 1.25rem', color: '#6B6B66', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Contact Information
                </th>
                <th style={{ padding: '0.85rem 1.25rem', color: '#6B6B66', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Membership Plan
                </th>
                <th style={{ padding: '0.85rem 1.25rem', color: '#6B6B66', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Joined Date
                </th>
                <th style={{ padding: '0.85rem 1.25rem', color: '#6B6B66', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((m) => {
                const name = m.full_name || `${m.first_name || ''} ${m.last_name || ''}`.trim() || 'Club Member';
                const status = (m.status || m.membership_status || 'active').toLowerCase();
                const isActive = status === 'active';
                const planName = m.plan_name || 'Standard Member';
                const initials = name
                  .split(' ')
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                const joinedDate = m.joined_on || m.created_at
                  ? new Date(m.joined_on || m.created_at).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Recent';

                return (
                  <tr key={m.id} style={{ borderBottom: '1px solid #F4F2EC' }}>
                    {/* Name & Code */}
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: m.plan_color || '#1F5C46',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: '#1A1A18', fontSize: '0.9rem' }}>{name}</div>
                          <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.2rem', alignItems: 'center' }}>
                            <span
                              style={{
                                background: '#EBF3F0',
                                color: '#1F5C46',
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                padding: '0.1rem 0.4rem',
                                borderRadius: '4px',
                              }}
                            >
                              {m.member_code || `ID-${m.id.substring(0, 6).toUpperCase()}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Email & Phone */}
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#1A1A18', fontSize: '0.82rem' }}>
                          <Mail size={13} color="#6B6B66" />
                          <span>{m.email || 'No email registered'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#6B6B66', fontSize: '0.75rem' }}>
                          <Phone size={13} color="#6B6B66" />
                          <span>{m.phone || 'No phone'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Membership Plan */}
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.3rem 0.65rem',
                          borderRadius: '6px',
                          background: '#EBF3F0',
                          color: '#1F5C46',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                        }}
                      >
                        <ShieldCheck size={13} />
                        <span>{planName}</span>
                      </span>
                      {m.membership_end_date && (
                        <div style={{ fontSize: '0.7rem', color: '#6B6B66', marginTop: '0.25rem' }}>
                          Valid until {new Date(m.membership_end_date).toLocaleDateString()}
                        </div>
                      )}
                    </td>

                    {/* Joined Date */}
                    <td style={{ padding: '1rem 1.25rem', color: '#6B6B66', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Calendar size={13} />
                        <span>{joinedDate}</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <span
                        style={{
                          padding: '0.25rem 0.6rem',
                          borderRadius: '20px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          background: isActive ? '#EBFDF5' : '#FEF2F2',
                          color: isActive ? '#047857' : '#DC2626',
                          textTransform: 'uppercase',
                        }}
                      >
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ─── MODAL: REGISTER MEMBER ─── */}
      {isAddModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              maxWidth: '460px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 12px 36px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#1A1A18' }}>
                Register New Club Member
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B6B66' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateMember} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1A1A18', display: 'block', marginBottom: '0.35rem' }}>
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John"
                    value={newMember.first_name}
                    onChange={(e) => setNewMember({ ...newMember, first_name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #E7E5DF',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1A1A18', display: 'block', marginBottom: '0.35rem' }}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Doe"
                    value={newMember.last_name}
                    onChange={(e) => setNewMember({ ...newMember, last_name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #E7E5DF',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1A1A18', display: 'block', marginBottom: '0.35rem' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. member@example.com"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #E7E5DF',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1A1A18', display: 'block', marginBottom: '0.35rem' }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9825000000"
                  value={newMember.phone}
                  onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #E7E5DF',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1A1A18', display: 'block', marginBottom: '0.35rem' }}>
                  Status
                </label>
                <select
                  value={newMember.status}
                  onChange={(e) => setNewMember({ ...newMember, status: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #E7E5DF',
                    fontSize: '0.85rem',
                    background: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '0.65rem',
                    borderRadius: '6px',
                    border: '1px solid #E7E5DF',
                    background: '#FFFFFF',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    flex: 1,
                    padding: '0.65rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#1F5C46',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {actionLoading ? 'Saving...' : 'Register Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
