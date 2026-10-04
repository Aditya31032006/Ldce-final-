import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router';
import useAuth from '../../auth/hook/useAuth.js';
import reportsApi from '../services/reports.api.js';
import { useToast } from '../../../shared/context/ToastContext.jsx';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Users,
  Activity,
  Layers,
  ShoppingBag,
  Coffee,
  Building2,
  RefreshCw,
  Printer,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  PieChart as PieChartIcon,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Award,
  Sparkles,
  ArrowUpRight,
  Zap,
  Filter,
  Eye,
  Percent,
  Compass,
  FileSpreadsheet
} from 'lucide-react';

// Custom dark styled tooltip for all Recharts visualizations
const CustomChartTooltip = React.memo(({ active, payload, label, prefix = '', suffix = '' }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '0.625rem',
        padding: '0.75rem 1rem',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
        color: '#ffffff',
        fontSize: '0.8rem',
        minWidth: '150px'
      }}>
        {label && (
          <p style={{ fontWeight: 700, margin: '0 0 0.4rem', color: '#94a3b8', borderBottom: '1px solid #1e293b', paddingBottom: '0.35rem' }}>
            {label}
          </p>
        )}
        {payload.map((entry, index) => (
          <div key={`tip-${index}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginTop: '0.25rem' }}>
            <span style={{ color: entry.color || '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color || '#38bdf8', display: 'inline-block' }}></span>
              {entry.name}:
            </span>
            <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.8rem' }}>
              {prefix}{typeof entry.value === 'number' ? entry.value.toLocaleString('en-IN') : entry.value}{suffix}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
});

function ReportsDashboard() {
  const { user, role, clubId, clubs, changeClub } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const queryClubId = searchParams.get('clubId') || searchParams.get('club');
  const effectiveClubId = queryClubId || clubId || (clubs && (clubs[0]?.id || clubs[0]?.club_id));

  const activeClubObj = useMemo(() => {
    return clubs?.find(c => (c.club_id === effectiveClubId || c.id === effectiveClubId)) || clubs?.[0];
  }, [clubs, effectiveClubId]);
  const clubName = activeClubObj?.name || 'Club Facility';

  const [timeRange, setTimeRange] = useState('all'); // 'all', '30d', '7d', 'today'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Interactive Chart View Controls
  const [revenueChartMode, setRevenueChartMode] = useState('donut'); // 'donut' | 'bar'
  const [sportMetricMode, setSportMetricMode] = useState('hours'); // 'hours' | 'reservations'
  const [hourlyChartType, setHourlyChartType] = useState('area'); // 'area' | 'bar'

  const fetchAnalytics = useCallback(async (isManual = false) => {
    if (!effectiveClubId) {
      setLoading(false);
      return;
    }
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await reportsApi.getAnalyticsData({ clubId: effectiveClubId, range: timeRange });
      if (res && res.data) {
        setAnalyticsData(res.data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to load analytics report:', err);
      toast.error('Unable to fetch detailed business analytics. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [effectiveClubId, timeRange, toast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const kpi = analyticsData?.kpi || {};
  const revBySource = analyticsData?.revenueBySource || {};
  const paymentMethods = analyticsData?.paymentMethods || [];
  const sportUtil = analyticsData?.sportUtilization || [];
  const courtDetails = analyticsData?.courtDetails || [];
  const hourlyTraffic = analyticsData?.hourlyTraffic || [];
  const membershipTiers = analyticsData?.membershipTiers || [];
  const topShopProducts = analyticsData?.topShopProducts || [];
  const topBarItems = analyticsData?.topBarItems || [];
  const demographics = analyticsData?.bookingDemographics || {};
  const staffDist = analyticsData?.staffDistribution || [];
  const recentActivity = analyticsData?.recentActivity || [];

  // Computed Financial Metrics
  const totalRev = Number(revBySource.total || kpi.totalRevenue || 0);
  const memberRev = Number(revBySource.membership || 0);
  const courtRev = Number(revBySource.courts || 0);
  const barRev = Number(revBySource.bar || 0);
  const shopRev = Number(revBySource.shop || 0);

  // Average Revenue Per Member (ARPU)
  const arpu = kpi.activeMembers > 0 ? Math.round(totalRev / kpi.activeMembers) : 0;

  // Booking Success & Conversion Rates
  const totalBookings = Number(kpi.totalBookings || 0);
  const completedBookings = Number(kpi.completedBookings || 0);
  const cancelledBookings = Number(kpi.cancelledBookings || 0);
  const completionRate = totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0;
  const cancellationRate = totalBookings > 0 ? Math.round((cancelledBookings / totalBookings) * 100) : 0;

  // Demographics Split
  const totalBookingsDemog = Number(demographics.total_bookings || totalBookings || 0);
  const memberBookingsCount = Number(demographics.member_bookings || 0);
  const guestBookingsCount = Number(demographics.guest_bookings || 0);
  const memberBookingPct = totalBookingsDemog > 0 ? Math.round((memberBookingsCount / totalBookingsDemog) * 100) : 0;
  const guestBookingPct = 100 - memberBookingPct;

  const onlineBookingsCount = Number(demographics.online_bookings || 0);
  const walkinBookingsCount = Number(demographics.walkin_bookings || 0);
  const onlineBookingPct = totalBookingsDemog > 0 ? Math.round((onlineBookingsCount / totalBookingsDemog) * 100) : 0;
  const walkinBookingPct = 100 - onlineBookingPct;

  // Order Fulfillment Rates
  const shopOrdersTotal = Number(kpi.shopOrdersTotal || 0);
  const shopOrdersPending = Number(kpi.shopOrdersPending || 0);
  const shopFulfillmentPct = shopOrdersTotal > 0 ? Math.round(((shopOrdersTotal - shopOrdersPending) / shopOrdersTotal) * 100) : 100;

  // 1. Revenue Stream Breakdown Data for Recharts
  const revenueChartData = useMemo(() => {
    return [
      { name: 'Membership Subscriptions', value: memberRev, color: '#8b5cf6' },
      { name: 'Court Bookings', value: courtRev, color: '#3b82f6' },
      { name: 'Bar & Cafe POS', value: barRev, color: '#f59e0b' },
      { name: 'Pro Shop Merchandise', value: shopRev, color: '#10b981' }
    ].filter(item => item.value > 0);
  }, [memberRev, courtRev, barRev, shopRev]);

  // Fallback if zero revenue recorded yet
  const displayRevenueChartData = revenueChartData.length > 0 ? revenueChartData : [
    { name: 'Membership Subscriptions', value: 0, color: '#8b5cf6' },
    { name: 'Court Bookings', value: 0, color: '#3b82f6' },
    { name: 'Bar & Cafe POS', value: 0, color: '#f59e0b' },
    { name: 'Pro Shop Merchandise', value: 0, color: '#10b981' }
  ];

  // 2. 24-Hour Peak Traffic Data for Recharts (Area/Bar)
  const fullHourlyData = useMemo(() => {
    const hoursMap = {};
    for (let h = 6; h <= 23; h++) {
      hoursMap[h] = 0;
    }
    hourlyTraffic.forEach(item => {
      if (hoursMap[item.hour] !== undefined) {
        hoursMap[item.hour] = item.count;
      }
    });
    return Object.entries(hoursMap).map(([hour, count]) => ({
      hour: Number(hour),
      time: `${String(hour).padStart(2, '0')}:00`,
      bookings: count,
      loadIndex: Math.min(100, count * 25)
    }));
  }, [hourlyTraffic]);

  const peakHourRecord = useMemo(() => {
    if (!hourlyTraffic || hourlyTraffic.length === 0) return null;
    const sorted = [...hourlyTraffic].sort((a, b) => b.count - a.count);
    return sorted[0]?.count > 0 ? `${String(sorted[0].hour).padStart(2, '0')}:00` : null;
  }, [hourlyTraffic]);

  // 3. Sport Utilization Data for Recharts
  const sportChartData = useMemo(() => {
    return sportUtil.map(su => ({
      sport: su.sport ? su.sport.charAt(0).toUpperCase() + su.sport.slice(1) : 'Sport',
      courts: su.courtsCount,
      reservations: su.reservationsCount,
      hoursBooked: su.totalHoursBooked,
      capacityHours: su.courtsCount * 14,
      occupancy: su.courtsCount > 0 ? Math.min(100, Math.round((su.totalHoursBooked / (su.courtsCount * 14)) * 100)) : 0
    }));
  }, [sportUtil]);

  // 4. Payment Settlement Tender Data for Recharts
  const paymentTenderData = useMemo(() => {
    const colorMap = {
      online: '#3b82f6',
      card: '#8b5cf6',
      upi: '#10b981',
      cash: '#f59e0b',
      wallet: '#ec4899'
    };
    return paymentMethods.map(pm => ({
      name: pm.method ? pm.method.toUpperCase() : 'OTHER',
      amount: pm.totalAmount,
      count: pm.count,
      color: colorMap[pm.method?.toLowerCase()] || '#64748b'
    }));
  }, [paymentMethods]);

  // 5. Operational Radar Diagnostics (360° Facility Performance)
  const radarDiagnosticsData = useMemo(() => {
    return [
      { subject: 'Court Occupancy', score: kpi.courtOccupancyNum || 0, fullMark: 100 },
      { subject: 'Member Retention', score: memberBookingPct || 0, fullMark: 100 },
      { subject: 'Digital Automation', score: onlineBookingPct || 0, fullMark: 100 },
      { subject: 'Booking Success', score: completionRate || (totalBookings > 0 ? 100 - cancellationRate : 90), fullMark: 100 },
      { subject: 'Shop Fulfillment', score: shopFulfillmentPct, fullMark: 100 },
      { subject: 'Staff Readiness', score: kpi.totalStaffCount > 0 ? Math.min(100, kpi.totalStaffCount * 18) : 80, fullMark: 100 }
    ];
  }, [kpi, memberBookingPct, onlineBookingPct, completionRate, cancellationRate, shopFulfillmentPct]);

  // 6. Departmental Payroll Breakdown Data for Recharts
  const staffPayrollData = useMemo(() => {
    return staffDist.map(st => ({
      department: st.department ? st.department.charAt(0).toUpperCase() + st.department.slice(1) : 'Dept',
      staffCount: st.staffCount,
      monthlySalary: st.totalSalary,
      avgPerStaff: st.staffCount > 0 ? Math.round(st.totalSalary / st.staffCount) : 0
    }));
  }, [staffDist]);

  // 7. Commercial Retail vs F&B Top Items
  const commercialComparisonData = useMemo(() => {
    const list = [];
    topShopProducts.slice(0, 4).forEach(sp => {
      list.push({
        name: sp.itemName.length > 14 ? sp.itemName.slice(0, 12) + '..' : sp.itemName,
        fullName: sp.itemName,
        category: 'Pro Shop',
        units: sp.unitsSold,
        sales: sp.totalSales,
        fill: '#10b981'
      });
    });
    topBarItems.slice(0, 4).forEach(bi => {
      list.push({
        name: bi.itemName.length > 14 ? bi.itemName.slice(0, 12) + '..' : bi.itemName,
        fullName: bi.itemName,
        category: 'Bar & Cafe',
        units: bi.unitsSold,
        sales: bi.totalSales,
        fill: '#f59e0b'
      });
    });
    return list;
  }, [topShopProducts, topBarItems]);

  if (loading && !analyticsData) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', background: '#f8fafc' }}>
        <RefreshCw className="animate-spin text-emerald-600" size={40} style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#64748b', fontWeight: 600, fontSize: '1rem' }}>Synthesizing real-time facility analytics & charts...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', paddingBottom: '5rem', color: '#0f172a' }}>
      {/* EXECUTIVE TOP HEADER */}
      <div style={{ background: '#0f172a', color: '#ffffff', padding: '2.5rem 1.5rem 2.25rem', borderBottom: '1px solid #1e293b' }}>
        <div style={{ maxWidth: '1360px', margin: '0 auto' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.65rem', borderRadius: '9999px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                  LIVE DATABASE TELEMETRY & MULTI-CHART BI
                </span>
                {lastUpdated && (
                  <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                    Synced {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </div>
              <h1 style={{ fontSize: '2.15rem', fontWeight: 800, letterSpacing: '-0.025em', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <BarChart3 className="text-emerald-400" size={34} />
                Executive Business Intelligence & Analytics
              </h1>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginTop: '0.35rem', marginBottom: 0 }}>
                Interactive multi-dimensional charts, revenue attribution, peak load curves & workforce telemetry for <strong style={{ color: '#f1f5f9' }}>{clubName}</strong>
              </p>
            </div>

            {/* Filter Controls & Actions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
              {/* Club Selector */}
              {clubs && clubs.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#1e293b', padding: '0.35rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #334155' }}>
                  <Building2 size={16} className="text-emerald-400" />
                  <select
                    value={effectiveClubId || ''}
                    onChange={(e) => {
                      if (changeClub) changeClub(e.target.value);
                      setSearchParams({ clubId: e.target.value });
                    }}
                    style={{ background: 'transparent', color: '#f8fafc', border: 'none', outline: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {clubs.map(c => (
                      <option key={c.id || c.club_id} value={c.id || c.club_id} style={{ background: '#0f172a', color: '#ffffff' }}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Time Range Pills */}
              <div style={{ display: 'flex', background: '#1e293b', padding: '0.25rem', borderRadius: '0.5rem', border: '1px solid #334155' }}>
                {[
                  { id: 'all', label: 'All Time' },
                  { id: '30d', label: 'Last 30d' },
                  { id: '7d', label: 'Last 7d' },
                  { id: 'today', label: 'Today' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setTimeRange(tab.id)}
                    style={{
                      background: timeRange === tab.id ? '#10b981' : 'transparent',
                      color: timeRange === tab.id ? '#ffffff' : '#94a3b8',
                      border: 'none',
                      padding: '0.35rem 0.85rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Refresh Sync Button */}
              <button
                onClick={() => fetchAnalytics(true)}
                disabled={refreshing}
                title="Synchronize fresh metrics from database"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: '#1e293b',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                  padding: '0.5rem 0.9rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={15} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                <span>Sync</span>
              </button>

              {/* Print / Export Report */}
              <button
                onClick={() => window.print()}
                title="Print or save PDF summary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                }}
              >
                <Printer size={16} />
                <span>Export PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1360px', margin: '-1.5rem auto 0', padding: '0 1.5rem' }}>
        {/* ROW 1: 6 GRANULAR EXECUTIVE METRIC CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
          {/* Card 1: Gross Realized Revenue */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.875rem', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Gross Revenue</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '0.5rem', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.2rem' }}>
              ₹{totalRev.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>
              {kpi.paymentTransactionsCount || 0} Settled Transactions
            </div>
          </div>

          {/* Card 2: Average Revenue Per Member (ARPU) */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.875rem', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Member ARPU</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '0.5rem', background: '#faf5ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DollarSign size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.2rem' }}>
              ₹{arpu.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#8b5cf6', fontWeight: 700 }}>
              Avg Yield / Active Member
            </div>
          </div>

          {/* Card 3: Court Occupancy Rate */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.875rem', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Court Occupancy</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '0.5rem', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.2rem' }}>
              {kpi.courtOccupancyRate || '0%'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 700 }}>
              {kpi.totalCourts || 0} Facility Courts Active
            </div>
          </div>

          {/* Card 4: Booking Completion Rate */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.875rem', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Booking Success</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '0.5rem', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.2rem' }}>
              {completionRate}%
            </div>
            <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>
              {completedBookings} Completed • {cancelledBookings} Cancelled
            </div>
          </div>

          {/* Card 5: Digital Channel Share */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.875rem', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Digital Adoption</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '0.5rem', background: '#fdf4ff', color: '#d946ef', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.2rem' }}>
              {onlineBookingPct}%
            </div>
            <div style={{ fontSize: '0.75rem', color: '#d946ef', fontWeight: 700 }}>
              Online Self-Service Bookings
            </div>
          </div>

          {/* Card 6: Monthly Workforce Payroll Commitment */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.875rem', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Workforce Payroll</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '0.5rem', background: '#fff7ed', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Briefcase size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.2rem' }}>
              ₹{(kpi.totalPayroll || 0).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#ea580c', fontWeight: 700 }}>
              {kpi.totalStaffCount || 0} Employees Across Facility
            </div>
          </div>
        </div>

        {/* ROW 2: PRIMARY INTERACTIVE VISUALIZATIONS (REVENUE MIX & PEAK HOUR CURVE) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
          {/* CHART 1: MULTI-STREAM REVENUE ATTRIBUTION (DONUT / BAR) */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.875rem', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Revenue Stream Attribution</h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0' }}>Proportional contribution by commercial channel</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.2rem', borderRadius: '0.375rem' }}>
                  <button
                    onClick={() => setRevenueChartMode('donut')}
                    style={{
                      background: revenueChartMode === 'donut' ? '#ffffff' : 'transparent',
                      color: revenueChartMode === 'donut' ? '#0f172a' : '#64748b',
                      border: 'none',
                      borderRadius: '0.25rem',
                      padding: '0.25rem 0.6rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: revenueChartMode === 'donut' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    Donut View
                  </button>
                  <button
                    onClick={() => setRevenueChartMode('bar')}
                    style={{
                      background: revenueChartMode === 'bar' ? '#ffffff' : 'transparent',
                      color: revenueChartMode === 'bar' ? '#0f172a' : '#64748b',
                      border: 'none',
                      borderRadius: '0.25rem',
                      padding: '0.25rem 0.6rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: revenueChartMode === 'bar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    Bar View
                  </button>
                </div>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#10b981' }}>₹{totalRev.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div style={{ width: '100%', height: 280, position: 'relative' }}>
              {revenueChartMode === 'donut' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={displayRevenueChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={105}
                      paddingAngle={4}
                      stroke="none"
                    >
                      {displayRevenueChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomChartTooltip prefix="₹" />} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(val, entry) => (
                        <span style={{ color: '#475569', fontSize: '0.775rem', fontWeight: 600 }}>{val}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={displayRevenueChartData} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tickFormatter={(val) => `₹${val}`} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: '#0f172a', fontWeight: 600 }} />
                    <Tooltip content={<CustomChartTooltip prefix="₹" />} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {displayRevenueChartData.map((entry, index) => (
                        <Cell key={`bar-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Quick Stream Badges */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Membership</span>
                <strong style={{ fontSize: '0.85rem', color: '#8b5cf6' }}>₹{memberRev.toLocaleString('en-IN')}</strong>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Courts</span>
                <strong style={{ fontSize: '0.85rem', color: '#3b82f6' }}>₹{courtRev.toLocaleString('en-IN')}</strong>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Bar & Cafe</span>
                <strong style={{ fontSize: '0.85rem', color: '#f59e0b' }}>₹{barRev.toLocaleString('en-IN')}</strong>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Pro Shop</span>
                <strong style={{ fontSize: '0.85rem', color: '#10b981' }}>₹{shopRev.toLocaleString('en-IN')}</strong>
              </div>
            </div>
          </div>

          {/* CHART 2: 24-HOUR PEAK LOAD & TRAFFIC CURVE (AREA / BAR) */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.875rem', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>24-Hour Peak Traffic Curve</h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0' }}>Real booking load & hourly distribution (06:00 - 23:00)</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {peakHourRecord && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#eff6ff', color: '#2563eb', padding: '0.2rem 0.6rem', borderRadius: '0.375rem', border: '1px solid #dbeafe' }}>
                    Peak: {peakHourRecord}
                  </span>
                )}
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.2rem', borderRadius: '0.375rem' }}>
                  <button
                    onClick={() => setHourlyChartType('area')}
                    style={{
                      background: hourlyChartType === 'area' ? '#ffffff' : 'transparent',
                      color: hourlyChartType === 'area' ? '#0f172a' : '#64748b',
                      border: 'none',
                      borderRadius: '0.25rem',
                      padding: '0.25rem 0.6rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: hourlyChartType === 'area' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    Area Curve
                  </button>
                  <button
                    onClick={() => setHourlyChartType('bar')}
                    style={{
                      background: hourlyChartType === 'bar' ? '#ffffff' : 'transparent',
                      color: hourlyChartType === 'bar' ? '#0f172a' : '#64748b',
                      border: 'none',
                      borderRadius: '0.25rem',
                      padding: '0.25rem 0.6rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: hourlyChartType === 'bar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    Bar Columns
                  </button>
                </div>
              </div>
            </div>

            <div style={{ width: '100%', height: 280 }}>
              {hourlyChartType === 'area' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={fullHourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} interval={2} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                    <Tooltip content={<CustomChartTooltip suffix=" Bookings" />} />
                    <Area type="monotone" dataKey="bookings" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#trafficGradient)" name="Reservations" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fullHourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} interval={2} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                    <Tooltip content={<CustomChartTooltip suffix=" Bookings" />} />
                    <Bar dataKey="bookings" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Reservations" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', fontSize: '0.75rem', color: '#64748b' }}>
              <span>Total Operating Range: <strong>06:00 to 23:00</strong></span>
              <span>Cumulative Reservations: <strong style={{ color: '#2563eb' }}>{kpi.totalBookings || 0} Slots</strong></span>
            </div>
          </div>
        </div>

        {/* ROW 3: SPORT LOAD & 360° FACILITY RADAR DIAGNOSTICS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
          {/* CHART 3: SPORT LOAD & OCCUPANCY (BAR CHART) */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.875rem', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Sport Utilization & Capacity</h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0' }}>Compare court hours booked vs reservation volumes by sport</p>
              </div>
              <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.2rem', borderRadius: '0.375rem' }}>
                <button
                  onClick={() => setSportMetricMode('hours')}
                  style={{
                    background: sportMetricMode === 'hours' ? '#ffffff' : 'transparent',
                    color: sportMetricMode === 'hours' ? '#0f172a' : '#64748b',
                    border: 'none',
                    borderRadius: '0.25rem',
                    padding: '0.25rem 0.6rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: sportMetricMode === 'hours' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  Hours Booked
                </button>
                <button
                  onClick={() => setSportMetricMode('reservations')}
                  style={{
                    background: sportMetricMode === 'reservations' ? '#ffffff' : 'transparent',
                    color: sportMetricMode === 'reservations' ? '#0f172a' : '#64748b',
                    border: 'none',
                    borderRadius: '0.25rem',
                    padding: '0.25rem 0.6rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: sportMetricMode === 'reservations' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  Reservations
                </button>
              </div>
            </div>

            {sportChartData.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                No court utilization records logged yet.
              </div>
            ) : (
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sportChartData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="sport" tick={{ fontSize: 12, fill: '#0f172a', fontWeight: 600 }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                    <Tooltip content={<CustomChartTooltip suffix={sportMetricMode === 'hours' ? ' hrs' : ' bookings'} />} />
                    <Legend wrapperStyle={{ fontSize: '0.775rem' }} />
                    {sportMetricMode === 'hours' ? (
                      <>
                        <Bar dataKey="hoursBooked" fill="#10b981" radius={[4, 4, 0, 0]} name="Hours Booked" />
                        <Bar dataKey="capacityHours" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Max Daily Capacity (hrs)" />
                      </>
                    ) : (
                      <>
                        <Bar dataKey="reservations" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total Reservations" />
                        <Bar dataKey="courts" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Active Courts" />
                      </>
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* CHART 4: 360° OPERATIONAL PERFORMANCE RADAR */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.875rem', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>360° Operational Performance Radar</h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0' }}>Multi-axis diagnostic benchmarking club efficiency</p>
              </div>
              <Compass size={20} className="text-emerald-500" />
            </div>

            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius={85} data={radarDiagnosticsData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <Radar name="Club Diagnostic Index" dataKey="score" stroke="#10b981" fill="#10b981" fillOpacity={0.45} />
                  <Tooltip content={<CustomChartTooltip suffix="%" />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', color: '#64748b', marginTop: '0.5rem', textAlign: 'center' }}>
              <span>Scale: 0-100% Normalized</span>
              <span style={{ color: '#10b981', fontWeight: 700 }}>● Optimal Operating Zone</span>
            </div>
          </div>
        </div>

        {/* ROW 4: COMMERCIAL GEAR/FOOD SALES COMPARISON & PAYMENT TENDER MIX */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
          {/* CHART 5: COMMERCIAL F&B & PRO SHOP REVENUE LEADERS */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.875rem', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Top Commercial Items (Pro Shop & Bar POS)</h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0' }}>Gross revenue generated by top catalog items</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#10b981', fontWeight: 600 }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span> Pro Shop
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#f59e0b', fontWeight: 600 }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }}></span> Bar & Cafe
                </span>
              </div>
            </div>

            {commercialComparisonData.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                No product or beverage sales logged yet.
              </div>
            ) : (
              <div style={{ width: '100%', height: 270 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={commercialComparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#0f172a' }} angle={-25} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `₹${val}`} />
                    <Tooltip content={<CustomChartTooltip prefix="₹" />} />
                    <Bar dataKey="sales" name="Gross Sales (₹)" radius={[4, 4, 0, 0]}>
                      {commercialComparisonData.map((entry, index) => (
                        <Cell key={`comm-bar-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* CHART 6: PAYMENT SETTLEMENT TENDER MIX */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.875rem', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Payment Settlement Mix</h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0' }}>Transaction distribution by gateway & tender type</p>
              </div>
              <CreditCard size={20} className="text-slate-400" />
            </div>

            {paymentTenderData.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                No settled transactions recorded yet.
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', height: 270 }}>
                <div style={{ flex: 1, height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentTenderData}
                        dataKey="amount"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={85}
                        innerRadius={45}
                        paddingAngle={3}
                      >
                        {paymentTenderData.map((entry, index) => (
                          <Cell key={`pm-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomChartTooltip prefix="₹" />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '1rem' }}>
                  {paymentTenderData.map((pm, i) => {
                    const share = totalRev > 0 ? Math.round((pm.amount / totalRev) * 100) : 0;
                    return (
                      <div key={i} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.4rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                          <span style={{ fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: pm.color }}></span>
                            {pm.name}
                          </span>
                          <strong style={{ color: '#0f172a' }}>₹{pm.amount.toLocaleString('en-IN')}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem' }}>
                          <span>{pm.count} Transactions</span>
                          <span style={{ fontWeight: 700, color: pm.color }}>{share}% volume</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ROW 5: WORKFORCE DEPARTMENTAL PAYROLL (HORIZONTAL BARS) */}
        {staffPayrollData.length > 0 && (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.875rem', padding: '1.5rem', marginBottom: '1.75rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Workforce & Departmental Payroll Allocation</h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0' }}>Departmental salary burden vs staffing headcount</p>
              </div>
              <Link to="/hr" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ea580c', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                HR System <ChevronRight size={14} />
              </Link>
            </div>

            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={staffPayrollData} layout="vertical" margin={{ top: 10, right: 30, left: 30, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tickFormatter={(val) => `₹${val}`} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis type="category" dataKey="department" tick={{ fontSize: 12, fill: '#0f172a', fontWeight: 600 }} width={100} />
                  <Tooltip content={<CustomChartTooltip prefix="₹" suffix="/mo" />} />
                  <Bar dataKey="monthlySalary" fill="#ea580c" radius={[0, 4, 4, 0]} name="Monthly Payroll (₹)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ROW 6: DETAILED COURT TELEMETRY & LIFETIME STATS TABLE */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.875rem', padding: '1.5rem', marginBottom: '1.75rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Court-Level Facility Telemetry</h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0' }}>Granular operating statistics, surface types, and lifetime hours for every court</p>
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#3b82f6', background: '#eff6ff', padding: '0.3rem 0.65rem', borderRadius: '0.375rem' }}>
              {courtDetails.length} Active Courts
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Court Facility</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Sport</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Surface & Format</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Hourly Base Rate</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Total Bookings</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Hours Logged</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Operational Status</th>
                </tr>
              </thead>
              <tbody>
                {courtDetails.map((court, i) => (
                  <tr key={court.id || i} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#0f172a' }}>
                      {court.name}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textTransform: 'capitalize', color: '#334155' }}>
                      {court.sport}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>
                      {court.surface || 'Standard'} • {court.is_indoor ? 'Indoor' : 'Outdoor'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#0f172a' }}>
                      ₹{court.hourly_rate || 0}/hr
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#2563eb' }}>
                      {court.total_reservations || 0}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                      {court.total_hours_booked || 0} hrs
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '9999px',
                        background: court.status === 'active' || court.is_active ? '#ecfdf5' : '#fff1f2',
                        color: court.status === 'active' || court.is_active ? '#059669' : '#e11d48'
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: court.status === 'active' || court.is_active ? '#10b981' : '#f43f5e' }}></span>
                        {court.status || (court.is_active ? 'Active' : 'Maintenance')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ROW 7: MEMBERSHIP TIERS & AUDIENCE CHANNELS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
          {/* Membership Tier Performance */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.875rem', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Membership Tiers Commercial Yield</h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0' }}>Plan pricing, active subscribers & subscription yield</p>
              </div>
              <Link to="/plans" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#8b5cf6', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                All Plans <ChevronRight size={14} />
              </Link>
            </div>

            {membershipTiers.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                No active membership plans registered in the database.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {membershipTiers.map((tier) => (
                  <div key={tier.id} style={{ border: '1px solid #f1f5f9', background: '#faf5ff', borderRadius: '0.75rem', padding: '0.85rem 1.1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                      <div>
                        <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{tier.name}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                          ₹{tier.price.toLocaleString('en-IN')}/mo • {tier.courtDiscountPercent}% court booking discount
                        </div>
                      </div>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#8b5cf6' }}>
                        ₹{tier.totalCollected.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', marginTop: '0.4rem' }}>
                      <span style={{ color: '#475569', fontWeight: 600 }}>{tier.activeSubscribers} Active Paid Subscribers</span>
                      <span style={{ color: '#8b5cf6', fontWeight: 700 }}>Total Collected</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Booking Demographics Ratios */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.875rem', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Audience & Booking Channel Split</h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0' }}>Member loyalty vs casual guest & digital automation</p>
              </div>
              <Users size={20} className="text-slate-400" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
              {/* Ratio 1: Member vs Guest */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>
                    Member Bookings ({memberBookingsCount})
                  </span>
                  <span style={{ fontWeight: 600, color: '#64748b' }}>
                    Guest / Public ({guestBookingsCount})
                  </span>
                </div>
                <div style={{ height: '12px', borderRadius: '6px', background: '#e2e8f0', display: 'flex', overflow: 'hidden' }}>
                  <div style={{ width: `${memberBookingPct}%`, background: '#8b5cf6', transition: 'width 0.3s' }} />
                  <div style={{ width: `${guestBookingPct}%`, background: '#94a3b8', transition: 'width 0.3s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', color: '#64748b', marginTop: '0.35rem' }}>
                  <span>{memberBookingPct}% Loyalty Retention</span>
                  <span>{guestBookingPct}% Casual Public</span>
                </div>
              </div>

              {/* Ratio 2: Online vs Walk-in */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>
                    Online App Bookings ({onlineBookingsCount})
                  </span>
                  <span style={{ fontWeight: 600, color: '#64748b' }}>
                    Front Desk Walk-ins ({walkinBookingsCount})
                  </span>
                </div>
                <div style={{ height: '12px', borderRadius: '6px', background: '#e2e8f0', display: 'flex', overflow: 'hidden' }}>
                  <div style={{ width: `${onlineBookingPct}%`, background: '#10b981', transition: 'width 0.3s' }} />
                  <div style={{ width: `${walkinBookingPct}%`, background: '#cbd5e1', transition: 'width 0.3s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', color: '#64748b', marginTop: '0.35rem' }}>
                  <span>{onlineBookingPct}% Digital Self-Service</span>
                  <span>{walkinBookingPct}% Staff Front Desk</span>
                </div>
              </div>

              {/* Status Breakdown Bar */}
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>{totalBookingsDemog}</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Total Bookings</div>
                </div>
                <div style={{ width: '1px', background: '#e2e8f0' }} />
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#059669' }}>{completedBookings}</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Completed</div>
                </div>
                <div style={{ width: '1px', background: '#e2e8f0' }} />
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#dc2626' }}>{cancelledBookings}</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Cancelled</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 8: REAL TRANSACTIONAL AUDIT TELEMETRY TABLE */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.875rem', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Real Transactional Audit Telemetry</h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0' }}>Chronological ledger events recorded in the database across all streams</p>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Live Ledger Feed</span>
          </div>

          {recentActivity.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
              No transactional activity recorded yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Stream Type</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Transaction / Subject</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Customer / Member</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Timestamp</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Ledger Status</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.slice(0, 15).map((act, idx) => {
                    const badgeColors = {
                      booking: { bg: '#eff6ff', text: '#2563eb' },
                      membership_payment: { bg: '#faf5ff', text: '#8b5cf6' },
                      bar_order: { bg: '#fffbeb', text: '#d97706' },
                      shop_order: { bg: '#ecfdf5', text: '#059669' },
                    };
                    const styling = badgeColors[act.activity_type] || { bg: '#f1f5f9', text: '#475569' };
                    const isSuccess = ['confirmed', 'completed', 'paid'].includes(act.status?.toLowerCase());

                    return (
                      <tr key={act.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '0.375rem', background: styling.bg, color: styling.text, textTransform: 'capitalize' }}>
                            {act.activity_type?.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#0f172a' }}>
                          {act.title}
                          {act.subtitle && <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>{act.subtitle}</div>}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: '#334155' }}>
                          {act.user_name || 'Guest User'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>
                          {act.created_at ? new Date(act.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '9999px',
                            background: isSuccess ? '#ecfdf5' : '#fef2f2',
                            color: isSuccess ? '#059669' : '#dc2626',
                            textTransform: 'capitalize'
                          }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: isSuccess ? '#10b981' : '#ef4444' }}></span>
                            {act.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                          ₹{Number(act.amount || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(ReportsDashboard);
