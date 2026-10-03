import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import useAuth from '../../auth/hook/useAuth.js';
import dashboardApi from '../services/dashboard.api.js';
import { useToast } from '../../../shared/context/ToastContext.jsx';
import {
  Calendar,
  Users,
  ShoppingBag,
  Coffee,
  Activity,
  ArrowUpRight,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  BarChart3,
  Layers,
  Trophy,
  Sparkles,
  CreditCard,
  Building2,
  ChevronRight,
  TrendingUp,
  DollarSign
} from 'lucide-react';

export default function Dashboard() {
  const { user, role, clubId, clubs, changeClub } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const queryClubId = searchParams.get('clubId') || searchParams.get('club');
  const effectiveClubId = queryClubId || clubId || (clubs && (clubs[0]?.id || clubs[0]?.club_id));

  const activeClubObj = clubs?.find(c => (c.club_id === effectiveClubId || c.id === effectiveClubId)) || clubs?.[0];
  const clubName = activeClubObj?.name || 'Sports Facility';
  const clubSlug = activeClubObj?.slug || activeClubObj?.id || effectiveClubId;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);

  const loadData = async (isManualRefresh = false) => {
    if (!effectiveClubId) {
      setLoading(false);
      return;
    }
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await dashboardApi.getDashboardData({ clubId: effectiveClubId });
      if (res && res.data) {
        setDashboardData(res.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      toast.error('Could not refresh dashboard metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (queryClubId && queryClubId !== clubId && changeClub) {
      changeClub(queryClubId);
    }
    loadData();
  }, [effectiveClubId, queryClubId]);

  const kpi = dashboardData?.kpi || {
    totalRevenue: 0,
    activeBookings: 0,
    totalBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    todayBookings: 0,
    activeMembers: 0,
    totalMembers: 0,
    newMembers30d: 0,
    courtOccupancyRate: '0%',
    courtOccupancyNum: 0,
    totalCourts: 0,
    shopOrdersTotal: 0,
    shopOrdersPending: 0,
    barOrdersTotal: 0,
    barOrdersOpen: 0,
    paymentTransactionsCount: 0,
  };

  const revenueBySource = dashboardData?.revenueBySource || {
    membership: 0,
    courts: 0,
    shop: 0,
    bar: 0,
    total: 0,
  };

  const courts = dashboardData?.courts || [];
  const recentActivity = dashboardData?.recentActivity || [];

  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  const revenueTotal = Math.max(revenueBySource.total, 1);
  const revStreams = [
    { label: 'Memberships', amount: revenueBySource.membership, color: '#3b82f6', icon: Users },
    { label: 'Bar & Cafe', amount: revenueBySource.bar, color: '#f59e0b', icon: Coffee },
    { label: 'Pro Shop', amount: revenueBySource.shop, color: '#10b981', icon: ShoppingBag },
    { label: 'Court Fees', amount: revenueBySource.courts, color: '#8b5cf6', icon: Trophy },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
      padding: '2rem 1.5rem',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      <div style={{ maxWidth: '1440px', margin: '0 auto' }}>

        {/* Top Operational Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1.25rem',
          marginBottom: '2rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <div style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                color: '#ffffff',
                padding: '0.65rem',
                borderRadius: '0.65rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)'
              }}>
                <Activity size={24} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.025em' }}>
                  Operations & KPI Dashboard
                </h1>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.875rem', color: '#64748b' }}>
                  Live facility metrics, court reservations, and multi-stream revenue for <strong style={{ color: '#0f172a' }}>{clubName}</strong>
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: '#e0e7ff',
                color: '#4338ca',
                padding: '0.25rem 0.65rem',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase'
              }}>
                <ShieldCheck size={12} /> {role || 'Staff'} Mode
              </span>

              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: '#ecfdf5',
                color: '#047857',
                padding: '0.25rem 0.65rem',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                fontWeight: 600
              }}>
                ● Real-time DB Synced
              </span>

              {activeClubObj && (
                <button
                  type="button"
                  onClick={() => navigate(`/club/${clubSlug}`)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: '#ffffff',
                    color: '#2563eb',
                    border: '1px solid #cbd5e1',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Building2 size={12} /> View Public Portal →
                </button>
              )}
            </div>
          </div>

          {/* Header Action Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing || loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.6rem 1rem',
                background: '#ffffff',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '0.5rem',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: refreshing ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
              {refreshing ? 'Syncing...' : 'Refresh KPIs'}
            </button>

            <Link
              to="/reports"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.6rem 1.15rem',
                background: '#0f172a',
                color: '#ffffff',
                borderRadius: '0.5rem',
                fontWeight: 600,
                fontSize: '0.85rem',
                textDecoration: 'none',
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.2)'
              }}
            >
              <BarChart3 size={15} /> Full Analytics & Reports →
            </Link>
          </div>
        </div>

        {/* 6 Executive KPI Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          {/* KPI 1: Total Realized Revenue */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Revenue
              </span>
              <div style={{ background: '#ecfdf5', color: '#059669', padding: '0.35rem', borderRadius: '0.375rem' }}>
                <DollarSign size={16} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
              {formatCurrency(kpi.totalRevenue)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <TrendingUp size={12} /> {kpi.paymentTransactionsCount} verified payments
            </div>
          </div>

          {/* KPI 2: Active Court Bookings */}
          <Link
            to="/bookings"
            style={{
              textDecoration: 'none',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              transition: 'transform 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Active Bookings
              </span>
              <div style={{ background: '#eff6ff', color: '#2563eb', padding: '0.35rem', borderRadius: '0.375rem' }}>
                <Calendar size={16} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
              {kpi.activeBookings}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>
              {kpi.todayBookings} scheduled for today ({kpi.totalBookings} all-time)
            </div>
          </Link>

          {/* KPI 3: Active Members */}
          <Link
            to="/members"
            style={{
              textDecoration: 'none',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Club Members
              </span>
              <div style={{ background: '#f5f3ff', color: '#7c3aed', padding: '0.35rem', borderRadius: '0.375rem' }}>
                <Users size={16} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
              {kpi.activeMembers}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 600 }}>
              +{kpi.newMembers30d} joined past 30 days
            </div>
          </Link>

          {/* KPI 4: Court Occupancy Rate */}
          <Link
            to="/courts"
            style={{
              textDecoration: 'none',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Court Utilization
              </span>
              <div style={{ background: '#fef3c7', color: '#d97706', padding: '0.35rem', borderRadius: '0.375rem' }}>
                <Trophy size={16} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
              {kpi.courtOccupancyRate}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600 }}>
              Across {kpi.totalCourts} configured courts
            </div>
          </Link>

          {/* KPI 5: Pro Shop Orders */}
          <Link
            to="/orders"
            style={{
              textDecoration: 'none',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Shop Orders
              </span>
              <div style={{ background: '#ecfdf5', color: '#059669', padding: '0.35rem', borderRadius: '0.375rem' }}>
                <ShoppingBag size={16} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
              {kpi.shopOrdersTotal}
            </div>
            <div style={{ fontSize: '0.75rem', color: kpi.shopOrdersPending > 0 ? '#d97706' : '#059669', fontWeight: 600 }}>
              {kpi.shopOrdersPending > 0 ? `⚠️ ${kpi.shopOrdersPending} pending delivery` : '✓ All orders fulfilled'}
            </div>
          </Link>

          {/* KPI 6: Bar & Cafe Orders */}
          <Link
            to="/bar"
            style={{
              textDecoration: 'none',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Cafe & Bar POS
              </span>
              <div style={{ background: '#fff7ed', color: '#ea580c', padding: '0.35rem', borderRadius: '0.375rem' }}>
                <Coffee size={16} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
              {kpi.barOrdersTotal}
            </div>
            <div style={{ fontSize: '0.75rem', color: kpi.barOrdersOpen > 0 ? '#ea580c' : '#059669', fontWeight: 600 }}>
              {kpi.barOrdersOpen > 0 ? `● ${kpi.barOrdersOpen} active open orders` : '✓ All tabs settled'}
            </div>
          </Link>
        </div>

        {/* 2-Column Dashboard Centerpiece */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>

          {/* Left Column: Live Court Availability & Telemetry */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '0.875rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.2rem 0' }}>
                  Live Court Fleet Status ({courts.length})
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                  Real-time occupancy status and total court hours booked
                </p>
              </div>
              <Link
                to="/courts"
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#2563eb',
                  textDecoration: 'none'
                }}
              >
                Manage Courts →
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {courts.map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.85rem 1rem',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.6rem',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '0.5rem',
                      background: c.is_currently_occupied ? '#fee2e2' : '#ecfdf5',
                      color: c.is_currently_occupied ? '#dc2626' : '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.9rem'
                    }}>
                      🎾
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                        {c.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {c.sport} • {c.surface || 'Pro Turf'} • {c.is_indoor ? 'Indoor Facility' : 'Outdoor Court'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                        {Number(c.total_hours_booked).toFixed(1)} hrs booked
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        {c.total_reservations} reservations
                      </div>
                    </div>

                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.3rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: c.is_currently_occupied ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                      color: c.is_currently_occupied ? '#dc2626' : '#059669',
                      border: c.is_currently_occupied ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)'
                    }}>
                      {c.is_currently_occupied ? '● IN USE' : '● AVAILABLE'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Revenue Streams Breakdown */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '0.875rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.2rem 0' }}>
                  Revenue Composition
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                  Real financial breakdown by business department
                </p>
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                {formatCurrency(revenueBySource.total)}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {revStreams.map((st) => {
                const pct = Math.round((Number(st.amount || 0) / revenueTotal) * 100);
                const IconComponent = st.icon;
                return (
                  <div key={st.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <IconComponent size={14} style={{ color: st.color }} /> {st.label}
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                        {formatCurrency(st.amount)} <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 500 }}>({pct}%)</span>
                      </span>
                    </div>
                    <div style={{ height: '7px', background: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: st.color, borderRadius: '9999px', transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '1.5rem 0 1rem' }} />

            {/* Quick Financial Highlight Box */}
            <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Completed Transactions</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{kpi.paymentTransactionsCount} Payments Verified</div>
              </div>
              <Link
                to="/reports"
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#2563eb',
                  textDecoration: 'none'
                }}
              >
                Detailed Ledger →
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Row: Live Recent Activity Feed & Module Launchpad */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)',
          gap: '1.5rem'
        }}>
          {/* Recent Live Activity Stream */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '0.875rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.2rem 0' }}>
                  Live Operations Activity Feed
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                  Real chronologically ordered events across bookings, POS, and sales
                </p>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600, background: '#ecfdf5', padding: '0.2rem 0.5rem', borderRadius: '0.375rem' }}>
                ● Live Database Feed
              </span>
            </div>

            {recentActivity.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>
                No recent activity recorded yet in this club facility.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {recentActivity.slice(0, 8).map((evt, idx) => (
                  <div
                    key={`${evt.id}-${idx}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.65rem 0.85rem',
                      background: '#f8fafc',
                      borderRadius: '0.5rem',
                      border: '1px solid #f1f5f9',
                      gap: '0.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span style={{ fontSize: '1.1rem' }}>
                        {evt.type === 'booking' ? '🎾' : evt.type === 'payment' ? '💳' : evt.type === 'shop_order' ? '🛍️' : '☕'}
                      </span>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                          {evt.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Customer: <span style={{ fontWeight: 600 }}>{evt.actor}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      {Number(evt.amount) > 0 && (
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#059669' }}>
                          {formatCurrency(evt.amount)}
                        </div>
                      )}
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                        {formatTimeAgo(evt.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Modules Navigation Grid */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '0.875rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1rem 0' }}>
              Operational Quick Links
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              <Link
                to="/bookings/calendar"
                style={{
                  padding: '1rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.6rem',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem'
                }}
              >
                <span style={{ fontSize: '1.4rem' }}>🏸</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Court Calendar</span>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Schedule slots</span>
              </Link>

              <Link
                to="/members"
                style={{
                  padding: '1rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.6rem',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem'
                }}
              >
                <span style={{ fontSize: '1.4rem' }}>👥</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Member Passes</span>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Manage accounts</span>
              </Link>

              <Link
                to="/bar"
                style={{
                  padding: '1rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.6rem',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem'
                }}
              >
                <span style={{ fontSize: '1.4rem' }}>☕</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Bar POS & Kitchen</span>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Order billing</span>
              </Link>

              <Link
                to="/inventory"
                style={{
                  padding: '1rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.6rem',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem'
                }}
              >
                <span style={{ fontSize: '1.4rem' }}>📦</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Pro Shop</span>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Stock & gear</span>
              </Link>

              <Link
                to="/orders"
                style={{
                  padding: '1rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.6rem',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem'
                }}
              >
                <span style={{ fontSize: '1.4rem' }}>🛍️</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Fulfillment Kanban</span>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Delivery tracking</span>
              </Link>

              <Link
                to="/reports"
                style={{
                  padding: '1rem',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '0.6rem',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem'
                }}
              >
                <span style={{ fontSize: '1.4rem' }}>📈</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1d4ed8' }}>Executive Reports</span>
                <span style={{ fontSize: '0.7rem', color: '#2563eb' }}>Full telemetry</span>
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
