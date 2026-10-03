import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStaff } from '../hr.slice.js';
import hrApi from '../services/hr.api.js';
import useAuth from '../../auth/hook/useAuth.js';
import { useToast } from '../../../shared/context/ToastContext.jsx';
import {
  Users,
  UserPlus,
  Trash2,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Building,
  Briefcase,
  X
} from 'lucide-react';

const ROLE_LABELS = {
  owner: 'Club Owner',
  manager: 'Operations Manager',
  front_desk: 'Front Desk Lead',
  shop_staff: 'Pro Shop Staff',
  bar_staff: 'Bar & Cafe Lead',
  kitchen: 'Kitchen & F&B',
  coach: 'Head Coach',
  maintenance: 'Facilities & Maintenance'
};

const ROLE_DEPARTMENTS = {
  owner: 'Executive Office',
  manager: 'General Operations',
  front_desk: 'Reception & Front Desk',
  shop_staff: 'Pro Shop & Retail',
  bar_staff: 'Hospitality & Bar',
  kitchen: 'Dining & Kitchen',
  coach: 'Athletics & Coaching',
  maintenance: 'Facility Management'
};

export default function StaffManagement() {
  const dispatch = useDispatch();
  const { staffList, loading } = useSelector((state) => state.hr);
  const { user, role, clubId, clubs } = useAuth();
  const { toast } = useToast();

  const userRole = (role || '').toLowerCase();
  const isOwner = userRole === 'owner' || userRole === 'admin';

  const activeClub = clubs?.find(c => (c.club_id === clubId || c.id === clubId)) || clubs?.[0];
  const clubName = activeClub?.name || 'Club Facility';

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('front_desk');

  const loadData = () => {
    dispatch(fetchStaff());
  };

  useEffect(() => {
    loadData();
  }, [dispatch, clubId]);

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!newStaffEmail.trim()) {
      toast.error('Please enter the employee or user email');
      return;
    }

    setSubmitting(true);
    try {
      await hrApi.addStaff({
        email: newStaffEmail.trim(),
        role: newStaffRole,
      });
      toast.success('Staff member assigned successfully!');
      setShowAddModal(false);
      setNewStaffEmail('');
      setNewStaffRole('front_desk');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.customMessage || 'Failed to add staff member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveStaff = async (staffMember) => {
    const name = staffMember.full_name || staffMember.name || staffMember.email;
    const staffUserId = staffMember.user_id || staffMember.id;
    if (staffUserId === user?.id) {
      toast.error('You cannot remove yourself from the club staff list');
      return;
    }
    if (!window.confirm(`Are you sure you want to remove "${name}" from club staff?`)) {
      return;
    }

    try {
      await hrApi.removeStaff(staffUserId);
      toast.success(`${name} was removed from staff`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.customMessage || 'Failed to remove staff member');
    }
  };

  const filteredStaff = (staffList || []).filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const name = (s.full_name || s.name || '').toLowerCase();
    const email = (s.email || '').toLowerCase();
    const phone = (s.phone || '').toLowerCase();
    const staffRole = (s.role || '').toLowerCase();
    const dept = (s.department || ROLE_DEPARTMENTS[s.role] || '').toLowerCase();
    return name.includes(q) || email.includes(q) || phone.includes(q) || staffRole.includes(q) || dept.includes(q);
  });

  const totalStaffCount = staffList?.length || 0;
  const activeRolesCount = new Set((staffList || []).map(s => s.role)).size;

  return (
    <div className="df-page-wrapper" style={{ background: '#FAF9F6', minHeight: '100vh', padding: '2rem 1.5rem' }}>
      <div className="df-page-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header Strip */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '10px',
                background: '#EBF3F0', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Users size={20} color="#1F5C46" />
              </div>
              <div>
                <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#1A1A18', margin: 0 }}>
                  Staff & Human Resources
                </h1>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#6B6B66' }}>
                  Manage authorized coaches, front desk teams, and operational roles for {clubName}
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={loadData}
              disabled={loading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.6rem 1rem', background: '#FFFFFF', border: '1px solid #E7E5DF',
                borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, color: '#1A1A18',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              <RefreshCw size={15} style={{ animation: loading ? 'df-spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>

            {isOwner && (
              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                  padding: '0.6rem 1.25rem', background: '#1F5C46', color: '#FFFFFF',
                  borderRadius: '8px', border: 'none', fontSize: '0.85rem', fontWeight: 700,
                  cursor: 'pointer', boxShadow: '0 2px 8px rgba(31, 92, 70, 0.2)'
                }}
              >
                <UserPlus size={16} />
                Add Staff Member
              </button>
            )}
          </div>
        </div>

        {/* Metrics Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E7E5DF', borderRadius: '10px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B6B66' }}>
                Total Club Staff
              </span>
              <div style={{ padding: '0.35rem', borderRadius: '6px', background: '#EBF3F0', color: '#1F5C46' }}>
                <Users size={16} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1A1A18' }}>{totalStaffCount}</div>
            <div style={{ fontSize: '0.75rem', color: '#6B6B66', marginTop: '0.2rem' }}>Assigned to {clubName}</div>
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid #E7E5DF', borderRadius: '10px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B6B66' }}>
                Active Operations Roles
              </span>
              <div style={{ padding: '0.35rem', borderRadius: '6px', background: '#EFF6FF', color: '#2563EB' }}>
                <Briefcase size={16} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#2563EB' }}>{activeRolesCount}</div>
            <div style={{ fontSize: '0.75rem', color: '#6B6B66', marginTop: '0.2rem' }}>Front desk, shop, bar & coaches</div>
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid #E7E5DF', borderRadius: '10px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B6B66' }}>
                Access Permissions
              </span>
              <div style={{ padding: '0.35rem', borderRadius: '6px', background: '#F0FDF4', color: '#15803D' }}>
                <ShieldCheck size={16} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#15803D' }}>RBAC Enforced</div>
            <div style={{ fontSize: '0.75rem', color: '#6B6B66', marginTop: '0.2rem' }}>Tenant PostgreSQL isolation</div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div style={{
          background: '#FFFFFF', border: '1px solid #E7E5DF', borderRadius: '10px',
          padding: '1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem'
        }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} color="#6B6B66" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search staff members by name, role, email, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '0.55rem 0.85rem 0.55rem 2.4rem',
                border: '1px solid #E7E5DF', borderRadius: '6px', fontSize: '0.85rem',
                background: '#FAF9F6', outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Staff Table */}
        <div style={{
          background: '#FFFFFF', border: '1px solid #E7E5DF', borderRadius: '12px',
          overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead style={{ background: '#FAF9F6', borderBottom: '1px solid #E7E5DF' }}>
                <tr>
                  <th style={{ padding: '0.85rem 1.25rem', color: '#6B6B66', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Employee Name
                  </th>
                  <th style={{ padding: '0.85rem 1.25rem', color: '#6B6B66', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Role
                  </th>
                  <th style={{ padding: '0.85rem 1.25rem', color: '#6B6B66', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Department
                  </th>
                  <th style={{ padding: '0.85rem 1.25rem', color: '#6B6B66', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Contact Details
                  </th>
                  <th style={{ padding: '0.85rem 1.25rem', color: '#6B6B66', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Status
                  </th>
                  {isOwner && (
                    <th style={{ padding: '0.85rem 1.25rem', color: '#6B6B66', fontWeight: 700, fontSize: '0.78rem', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={isOwner ? 6 : 5} style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#6B6B66' }}>
                      <Users size={32} style={{ opacity: 0.3, margin: '0 auto 0.5rem' }} />
                      <p style={{ margin: 0, fontWeight: 500 }}>No staff members found matching your search</p>
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((s) => {
                    const fullName = s.full_name || s.name || s.email?.split('@')[0] || 'Staff Member';
                    const roleKey = (s.role || '').toLowerCase();
                    const roleLabel = ROLE_LABELS[roleKey] || s.role || 'Staff Member';
                    const deptLabel = s.department || ROLE_DEPARTMENTS[roleKey] || 'Operations';
                    const isActive = s.status ? s.status === 'active' : s.is_active !== false;
                    const staffId = s.user_id || s.id;
                    const initials = fullName
                      .split(' ')
                      .map(p => p[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || 'ST';

                    return (
                      <tr key={staffId} style={{ borderBottom: '1px solid #F1F0EC', transition: 'background 0.15s ease' }}>
                        
                        {/* Employee Name & Email */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              width: '38px', height: '38px', borderRadius: '50%',
                              background: '#EBF3F0', color: '#1F5C46',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 700, fontSize: '0.85rem', flexShrink: 0
                            }}>
                              {initials}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#1A1A18', fontSize: '0.925rem' }}>
                                {fullName}
                              </div>
                              {s.email && (
                                <div style={{ fontSize: '0.775rem', color: '#6B6B66', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.15rem' }}>
                                  <Mail size={12} color="#94A3B8" />
                                  <span>{s.email}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                            padding: '0.25rem 0.65rem', borderRadius: '6px',
                            fontSize: '0.8rem', fontWeight: 600,
                            background: roleKey === 'owner' ? '#FEF3C7' : '#EFF6FF',
                            color: roleKey === 'owner' ? '#92400E' : '#1D4ED8',
                            border: roleKey === 'owner' ? '1px solid #FDE68A' : '1px solid #DBEAFE'
                          }}>
                            {roleKey === 'owner' ? <ShieldCheck size={13} /> : <Briefcase size={13} />}
                            {roleLabel}
                          </span>
                        </td>

                        {/* Department */}
                        <td style={{ padding: '1rem 1.25rem', color: '#475569', fontWeight: 500, fontSize: '0.85rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Building size={14} color="#94A3B8" />
                            <span>{deptLabel}</span>
                          </div>
                        </td>

                        {/* Contact Details */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          {s.phone ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#1A1A18', fontWeight: 600, fontSize: '0.85rem' }}>
                              <Phone size={13} color="#1F5C46" />
                              <span>{s.phone}</span>
                            </div>
                          ) : (
                            <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>No phone recorded</span>
                          )}
                        </td>

                        {/* Status */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                            padding: '0.2rem 0.6rem', borderRadius: '9999px',
                            fontSize: '0.75rem', fontWeight: 700,
                            background: isActive ? '#F0FDF4' : '#FEF2F2',
                            color: isActive ? '#15803D' : '#DC2626',
                            border: isActive ? '1px solid #DCFCE7' : '1px solid #FEE2E2'
                          }}>
                            {isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        {/* Actions (Owner only) */}
                        {isOwner && (
                          <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                            {roleKey !== 'owner' ? (
                              <button
                                onClick={() => handleRemoveStaff(s)}
                                title="Remove staff role"
                                style={{
                                  background: 'none', border: 'none', cursor: 'pointer',
                                  color: '#DC2626', padding: '0.35rem', borderRadius: '4px',
                                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                  transition: 'background 0.15s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#FEE2E2'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                              >
                                <Trash2 size={15} />
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontStyle: 'italic' }}>Primary Owner</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Staff Modal */}
        {showAddModal && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(26, 26, 24, 0.45)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
          }}>
            <div style={{
              background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E7E5DF',
              maxWidth: '460px', width: '100%', overflow: 'hidden',
              boxShadow: '0 16px 36px rgba(26, 26, 24, 0.15)'
            }}>
              <div style={{
                padding: '1.25rem 1.5rem', borderBottom: '1px solid #E7E5DF',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1A1A18' }}>
                    Add Staff Member
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#6B6B66' }}>
                    Assign club operational role to a registered user
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B6B66' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddStaff} style={{ padding: '1.5rem' }}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#1A1A18', marginBottom: '0.4rem' }}>
                    User / Employee Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. employee@domain.com"
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    style={{
                      width: '100%', padding: '0.65rem 0.85rem', borderRadius: '6px',
                      border: '1px solid #CBD5E1', fontSize: '0.875rem'
                    }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginTop: '0.25rem' }}>
                    The user must have an account registered on the platform.
                  </span>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#1A1A18', marginBottom: '0.4rem' }}>
                    Assign Role *
                  </label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value)}
                    style={{
                      width: '100%', padding: '0.65rem 0.85rem', borderRadius: '6px',
                      border: '1px solid #CBD5E1', fontSize: '0.875rem', background: '#FFFFFF'
                    }}
                  >
                    <option value="front_desk">Front Desk Lead (Bookings, Check-in, Members)</option>
                    <option value="manager">Operations Manager (Full Facility Operations)</option>
                    <option value="shop_staff">Pro Shop Staff (Inventory, Products, Sales)</option>
                    <option value="bar_staff">Bar & Cafe Staff (Bar POS & Orders)</option>
                    <option value="kitchen">Kitchen & Dining</option>
                    <option value="coach">Head Coach</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    style={{
                      padding: '0.6rem 1.25rem', background: '#FFFFFF',
                      border: '1px solid #CBD5E1', borderRadius: '6px',
                      fontSize: '0.85rem', fontWeight: 600, color: '#475569', cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      padding: '0.6rem 1.25rem', background: '#1F5C46',
                      border: 'none', borderRadius: '6px',
                      fontSize: '0.85rem', fontWeight: 700, color: '#FFFFFF',
                      cursor: submitting ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {submitting ? 'Assigning...' : 'Assign Role'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
