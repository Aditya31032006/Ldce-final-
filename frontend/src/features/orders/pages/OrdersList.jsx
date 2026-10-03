import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import useAuth from '../../auth/hook/useAuth.js';
import ordersApi from '../services/orders.api.js';
import { useToast } from '../../../shared/context/ToastContext.jsx';
import {
  ShoppingBag,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Truck,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Filter,
  Search,
  RefreshCw,
  Eye,
  ShieldCheck,
  ChevronRight,
  Receipt,
  X,
  ArrowLeft,
  Kanban,
  List,
  ArrowRight,
  GripVertical
} from 'lucide-react';

const KANBAN_STAGES = [
  {
    id: 'pending',
    title: 'Pending',
    badge: 'Awaiting Packing',
    color: '#D97706',
    border: '#FDE68A',
    bg: '#FFFBEB',
    headerBg: '#FEF3C7',
    icon: AlertCircle,
    nextStatus: 'confirmed',
    nextBtnLabel: 'Confirm Order →',
  },
  {
    id: 'confirmed',
    title: 'Confirmed',
    badge: 'Being Prepared',
    color: '#2563EB',
    border: '#BFDBFE',
    bg: '#EFF6FF',
    headerBg: '#DBEAFE',
    icon: Clock,
    nextStatus: 'ready',
    nextBtnLabel: 'Mark Ready →',
  },
  {
    id: 'ready',
    title: 'Out for Delivery / Ready',
    badge: 'Dispatched / At Desk',
    color: '#7C3AED',
    border: '#DDD6FE',
    bg: '#F5F3FF',
    headerBg: '#EDE9FE',
    icon: Truck,
    nextStatus: 'completed',
    nextBtnLabel: '✓ Mark Delivered',
  },
  {
    id: 'completed',
    title: 'Delivered',
    badge: 'Completed',
    color: '#059669',
    border: '#A7F3D0',
    bg: '#ECFDF5',
    headerBg: '#D1FAE5',
    icon: CheckCircle2,
    nextStatus: null,
    nextBtnLabel: null,
  },
  {
    id: 'cancelled',
    title: 'Cancelled',
    badge: 'Voided',
    color: '#DC2626',
    border: '#FECACA',
    bg: '#FEF2F2',
    headerBg: '#FEE2E2',
    icon: XCircle,
    nextStatus: null,
    nextBtnLabel: null,
  },
];

export default function OrdersList() {
  const { user, role, clubId, clubs, changeClub } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const queryClubId = searchParams.get('clubId') || searchParams.get('club');
  const effectiveClubId = queryClubId || clubId;

  const userRole = (role || '').toLowerCase();
  const isStaff = ['owner', 'shop_staff', 'manager', 'admin'].includes(userRole);

  const activeClub = clubs?.find(c => (c.club_id === effectiveClubId || c.id === effectiveClubId)) || clubs?.[0];
  const clubName = activeClub?.name || 'Current Club';

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [viewMode, setViewMode] = useState(isStaff ? 'kanban' : 'table');

  // Drag and drop states for Kanban
  const [draggedOrderId, setDraggedOrderId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const loadOrders = async () => {
    if (!effectiveClubId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await ordersApi.getOrders();
      const list = res.orders || (Array.isArray(res) ? res : []);
      setOrders(list);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Error loading orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (queryClubId && queryClubId !== clubId && changeClub) {
      changeClub(queryClubId);
    }
    loadOrders();
  }, [effectiveClubId, queryClubId]);

  const normalizeStatus = (status) => {
    const s = (status || 'pending').toLowerCase();
    if (s === 'processing') return 'confirmed';
    return s;
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      setUpdatingId(orderId);
      await ordersApi.updateOrderStatus(orderId, newStatus);
      toast.success(`Order status updated to ${newStatus.toUpperCase()}`);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Status update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, orderId) => {
    e.dataTransfer.setData('text/plain', orderId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedOrderId(orderId);
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== colId) {
      setDragOverCol(colId);
    }
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    const orderId = e.dataTransfer.getData('text/plain') || draggedOrderId;
    setDragOverCol(null);
    setDraggedOrderId(null);
    if (!orderId) return;

    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    if (normalizeStatus(order.status) === targetStatus) return;

    await handleUpdateStatus(orderId, targetStatus);
  };

  // Filtered orders
  const filteredOrders = orders.filter((order) => {
    const norm = normalizeStatus(order.status);
    const matchesStatus = statusFilter === 'ALL' || norm === statusFilter.toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesStatus;

    const matchesNo = (order.order_no || '').toLowerCase().includes(query);
    const matchesCustomer = (order.customer_name || '').toLowerCase().includes(query);
    const matchesEmail = (order.customer_email || '').toLowerCase().includes(query);
    const matchesItems = Array.isArray(order.items) && order.items.some(i => (i.item_name || '').toLowerCase().includes(query));

    return matchesStatus && (matchesNo || matchesCustomer || matchesEmail || matchesItems);
  });

  // Calculate metrics
  const totalOrdersCount = orders.length;
  const pendingCount = orders.filter(o => normalizeStatus(o.status) === 'pending').length;
  const completedCount = orders.filter(o => normalizeStatus(o.status) === 'completed').length;
  const totalRevenue = orders
    .filter(o => normalizeStatus(o.status) !== 'cancelled')
    .reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);

  const getStatusBadge = (status) => {
    const s = normalizeStatus(status);
    switch (s) {
      case 'completed':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.3rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: 'rgba(16, 185, 129, 0.12)',
            color: '#059669',
            border: '1px solid rgba(16, 185, 129, 0.25)'
          }}>
            <CheckCircle2 size={13} /> Completed
          </span>
        );
      case 'ready':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.3rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: 'rgba(124, 58, 237, 0.12)',
            color: '#7c3aed',
            border: '1px solid rgba(124, 58, 237, 0.25)'
          }}>
            <Truck size={13} /> Ready / Out for Delivery
          </span>
        );
      case 'confirmed':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.3rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: 'rgba(59, 130, 246, 0.12)',
            color: '#2563eb',
            border: '1px solid rgba(59, 130, 246, 0.25)'
          }}>
            <Clock size={13} /> Confirmed / Packing
          </span>
        );
      case 'cancelled':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.3rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#dc2626',
            border: '1px solid rgba(239, 68, 68, 0.25)'
          }}>
            <XCircle size={13} /> Cancelled
          </span>
        );
      default:
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.3rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: 'rgba(245, 158, 11, 0.12)',
            color: '#d97706',
            border: '1px solid rgba(245, 158, 11, 0.25)'
          }}>
            <AlertCircle size={13} /> Pending
          </span>
        );
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div style={{
      background: '#f8fafc',
      minHeight: '100vh',
      padding: '2rem 1.5rem',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
        
        {/* Header Strip */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '0.6rem',
                background: '#0f172a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)'
              }}>
                <ShoppingBag size={22} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                  Online & Shop Orders
                </h1>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.875rem', color: '#64748b' }}>
                  {isStaff 
                    ? `Live delivery tracking, fulfillment kanban, and customer receipts for ${clubName}` 
                    : `View and track the status of all your club purchases and equipment orders`}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: isStaff ? '#e0e7ff' : '#ecfdf5',
                color: isStaff ? '#4338ca' : '#047857',
                padding: '0.25rem 0.65rem',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                fontWeight: 600
              }}>
                {isStaff ? <ShieldCheck size={12} /> : <User size={12} />}
                {isStaff ? 'Staff Access • All Club Orders' : 'Customer View • My Orders Only'}
              </span>

              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: '#f1f5f9',
                color: '#475569',
                padding: '0.25rem 0.65rem',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                fontWeight: 500
              }}>
                Club: {clubName}
              </span>

              {activeClub && (
                <button
                  type="button"
                  onClick={() => navigate(`/club/${activeClub.slug || activeClub.id || effectiveClubId}`)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: '#f8fafc',
                    color: '#059669',
                    border: '1px solid #cbd5e1',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <ArrowLeft size={12} /> Back to Club Portal
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* View Mode Toggle: Kanban vs Table */}
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.25rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  background: viewMode === 'kanban' ? '#ffffff' : 'transparent',
                  color: viewMode === 'kanban' ? '#0f172a' : '#64748b',
                  fontWeight: viewMode === 'kanban' ? 700 : 500,
                  fontSize: '0.8rem',
                  boxShadow: viewMode === 'kanban' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer'
                }}
              >
                <Kanban size={15} /> Kanban Board
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  background: viewMode === 'table' ? '#ffffff' : 'transparent',
                  color: viewMode === 'table' ? '#0f172a' : '#64748b',
                  fontWeight: viewMode === 'table' ? 700 : 500,
                  fontSize: '0.8rem',
                  boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer'
                }}
              >
                <List size={15} /> Table View
              </button>
            </div>

            <button
              onClick={loadOrders}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1rem',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '0.5rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#334155',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {isStaff ? 'Total Club Orders' : 'My Total Orders'}
              </span>
              <div style={{ padding: '0.4rem', borderRadius: '0.4rem', background: '#f1f5f9', color: '#0f172a' }}>
                <Receipt size={16} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>{totalOrdersCount}</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Recorded in database</div>
          </div>

          <div style={{
            background: '#ffffff',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Pending Fulfillment
              </span>
              <div style={{ padding: '0.4rem', borderRadius: '0.4rem', background: '#fffbeb', color: '#d97706' }}>
                <AlertCircle size={16} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#d97706' }}>{pendingCount}</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Needs dispatch / pickup</div>
          </div>

          <div style={{
            background: '#ffffff',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Completed Orders
              </span>
              <div style={{ padding: '0.4rem', borderRadius: '0.4rem', background: '#ecfdf5', color: '#059669' }}>
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#059669' }}>{completedCount}</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Delivered & fulfilled</div>
          </div>

          <div style={{
            background: '#ffffff',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {isStaff ? 'Total Revenue' : 'Total Spent'}
              </span>
              <div style={{ padding: '0.4rem', borderRadius: '0.4rem', background: '#eff6ff', color: '#2563eb' }}>
                <DollarSign size={16} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
              ${totalRevenue.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              {isStaff ? 'Gross orders value' : 'Across all your orders'}
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div style={{
          background: '#ffffff',
          borderRadius: '0.75rem',
          padding: '1rem 1.25rem',
          border: '1px solid #e2e8f0',
          marginBottom: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          {/* Search Bar */}
          <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder={isStaff ? "Search by order #, customer, item..." : "Search your orders by # or item name..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem 0.6rem 2.25rem',
                border: '1px solid #cbd5e1',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                outline: 'none',
                transition: 'border-color 0.15s ease',
                background: '#f8fafc'
              }}
            />
          </div>

          {/* Status Tabs (used in Table mode or to focus columns) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflowX: 'auto' }}>
            {['ALL', 'pending', 'confirmed', 'ready', 'completed', 'cancelled'].map((tab) => {
              const active = statusFilter === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.8rem',
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    border: 'none',
                    background: active ? '#0f172a' : '#f1f5f9',
                    color: active ? '#ffffff' : '#475569',
                    textTransform: 'capitalize',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab === 'confirmed' ? 'Confirmed / Packing' : tab === 'ready' ? 'Ready / Dispatched' : tab}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── KANBAN BOARD VIEW ─── */}
        {viewMode === 'kanban' && (
          <div style={{ marginBottom: '2.5rem' }}>
            {isStaff && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8rem',
                color: '#64748b',
                marginBottom: '1rem',
                background: '#eff6ff',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: '1px solid #dbeafe'
              }}>
                <Truck size={15} color="#2563eb" />
                <span>
                  <strong>Delivery Kanban Board:</strong> Drag and drop order cards between columns to change delivery status, or use the quick action buttons on each card.
                </span>
              </div>
            )}

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.25rem',
              alignItems: 'start'
            }}>
              {KANBAN_STAGES.map((stage) => {
                const stageOrders = filteredOrders.filter(
                  (o) => normalizeStatus(o.status) === stage.id
                );
                const Icon = stage.icon;
                const isDragOver = dragOverCol === stage.id;

                return (
                  <div
                    key={stage.id}
                    onDragOver={(e) => isStaff && handleDragOver(e, stage.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => isStaff && handleDrop(e, stage.id)}
                    style={{
                      background: '#f8fafc',
                      borderRadius: '0.75rem',
                      border: isDragOver ? `2px dashed ${stage.color}` : '1px solid #e2e8f0',
                      boxShadow: isDragOver ? `0 0 16px ${stage.border}` : '0 2px 6px rgba(0,0,0,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: '480px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Column Header */}
                    <div style={{
                      padding: '0.85rem 1rem',
                      background: stage.headerBg,
                      borderBottom: `1px solid ${stage.border}`,
                      borderTopLeftRadius: '0.75rem',
                      borderTopRightRadius: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Icon size={16} color={stage.color} />
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                          {stage.title}
                        </span>
                      </div>
                      <span style={{
                        background: '#ffffff',
                        color: stage.color,
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        border: `1px solid ${stage.border}`
                      }}>
                        {stageOrders.length}
                      </span>
                    </div>

                    {/* Column Cards Drop Area */}
                    <div style={{
                      padding: '0.85rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.85rem',
                      flex: 1
                    }}>
                      {stageOrders.length === 0 ? (
                        <div style={{
                          padding: '2.5rem 1rem',
                          textAlign: 'center',
                          color: '#94a3b8',
                          fontSize: '0.8rem',
                          border: '1px dashed #cbd5e1',
                          borderRadius: '0.5rem',
                          background: '#ffffff'
                        }}>
                          No {stage.title.toLowerCase()} orders
                        </div>
                      ) : (
                        stageOrders.map((order) => {
                          const items = Array.isArray(order.items) ? order.items : [];
                          const isBeingUpdated = updatingId === order.id;

                          return (
                            <div
                              key={order.id}
                              draggable={isStaff && !isBeingUpdated}
                              onDragStart={(e) => handleDragStart(e, order.id)}
                              style={{
                                background: '#ffffff',
                                borderRadius: '0.6rem',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                                padding: '1rem',
                                cursor: isStaff ? 'grab' : 'default',
                                opacity: isBeingUpdated ? 0.6 : 1,
                                transition: 'all 0.15s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.65rem'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = '0 6px 14px rgba(0,0,0,0.08)';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.04)';
                                e.currentTarget.style.transform = 'translateY(0)';
                              }}
                            >
                              {/* Card Header */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    {isStaff && <GripVertical size={13} color="#94a3b8" style={{ marginRight: '-2px' }} />}
                                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', fontFamily: 'monospace' }}>
                                      {order.order_no || `SO-${order.id.slice(0, 6)}`}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                                    {formatDate(order.placed_at || order.created_at)}
                                  </div>
                                </div>

                                <span style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '0.25rem',
                                  background: order.channel === 'online' ? '#eff6ff' : '#f1f5f9',
                                  color: order.channel === 'online' ? '#2563eb' : '#475569'
                                }}>
                                  {order.channel || 'online'}
                                </span>
                              </div>

                              {/* Customer Details */}
                              <div style={{
                                background: '#f8fafc',
                                padding: '0.5rem 0.65rem',
                                borderRadius: '0.4rem',
                                fontSize: '0.8rem',
                                color: '#1e293b'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                                  <User size={13} color="#475569" />
                                  <span>{order.customer_name || 'Customer'}</span>
                                </div>
                                {order.customer_phone && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#64748b', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                                    <Phone size={11} color="#94a3b8" />
                                    <span>{order.customer_phone}</span>
                                  </div>
                                )}
                              </div>

                              {/* Fulfillment & Address */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  {order.fulfillment === 'delivery' ? (
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem',
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      padding: '0.15rem 0.5rem',
                                      borderRadius: '0.3rem',
                                      background: '#eff6ff',
                                      color: '#1d4ed8'
                                    }}>
                                      <Truck size={12} /> Doorstep Delivery
                                    </span>
                                  ) : (
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem',
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      padding: '0.15rem 0.5rem',
                                      borderRadius: '0.3rem',
                                      background: '#f0fdf4',
                                      color: '#15803d'
                                    }}>
                                      <Package size={12} /> Counter Pickup
                                    </span>
                                  )}
                                </div>

                                {order.fulfillment === 'delivery' && order.delivery_address && (
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '0.3rem',
                                    fontSize: '0.72rem',
                                    color: '#64748b',
                                    lineHeight: '1.3'
                                  }}>
                                    <MapPin size={12} color="#94a3b8" style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                      {order.delivery_address}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Items Summary */}
                              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
                                {items.length > 0 ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                    {items.slice(0, 2).map((item, idx) => (
                                      <div key={idx} style={{ fontSize: '0.78rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <span style={{
                                          background: '#f1f5f9',
                                          color: '#475569',
                                          padding: '0.05rem 0.3rem',
                                          borderRadius: '0.2rem',
                                          fontSize: '0.68rem',
                                          fontWeight: 700
                                        }}>
                                          x{item.quantity}
                                        </span>
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {item.item_name}
                                        </span>
                                      </div>
                                    ))}
                                    {items.length > 2 && (
                                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>
                                        +{items.length - 2} more items
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>No item details</span>
                                )}
                              </div>

                              {/* Price and Action Bar */}
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                borderTop: '1px solid #f1f5f9',
                                paddingTop: '0.6rem'
                              }}>
                                <div>
                                  <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Order Total</span>
                                  <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem' }}>
                                    ${parseFloat(order.total || 0).toFixed(2)}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <button
                                    onClick={() => setSelectedOrder(order)}
                                    title="View Invoice Receipt"
                                    style={{
                                      padding: '0.4rem 0.65rem',
                                      background: '#f8fafc',
                                      border: '1px solid #cbd5e1',
                                      borderRadius: '0.35rem',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      color: '#334155',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem'
                                    }}
                                  >
                                    <Eye size={12} /> Receipt
                                  </button>
                                </div>
                              </div>

                              {/* Staff Stage Advancement Controls */}
                              {isStaff && (
                                <div style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.4rem',
                                  borderTop: '1px solid #f1f5f9',
                                  paddingTop: '0.6rem'
                                }}>
                                  {stage.nextStatus && (
                                    <button
                                      type="button"
                                      disabled={isBeingUpdated}
                                      onClick={() => handleUpdateStatus(order.id, stage.nextStatus)}
                                      style={{
                                        width: '100%',
                                        padding: '0.45rem',
                                        background: stage.color,
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '0.35rem',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        cursor: isBeingUpdated ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.35rem',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
                                      }}
                                    >
                                      <span>{stage.nextBtnLabel}</span>
                                    </button>
                                  )}

                                  {/* Direct Status Selector */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Move to:</span>
                                    <select
                                      value={normalizeStatus(order.status)}
                                      disabled={isBeingUpdated}
                                      onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                                      style={{
                                        flex: 1,
                                        padding: '0.3rem 0.5rem',
                                        borderRadius: '0.35rem',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        background: '#ffffff',
                                        color: '#0f172a',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <option value="pending">Pending</option>
                                      <option value="confirmed">Confirmed</option>
                                      <option value="ready">Ready / Out for Delivery</option>
                                      <option value="completed">Delivered</option>
                                      <option value="cancelled">Cancelled</option>
                                    </select>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── TABLE VIEW ─── */}
        {viewMode === 'table' && (
          <div style={{
            background: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
            overflow: 'hidden'
          }}>
            {loading ? (
              <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b' }}>
                <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem', display: 'block', color: '#3b82f6' }} />
                <p style={{ fontWeight: 500, margin: 0 }}>Loading order records...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div style={{ padding: '4.5rem 2rem', textAlign: 'center' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                  color: '#94a3b8'
                }}>
                  <ShoppingBag size={28} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem' }}>
                  {searchQuery || statusFilter !== 'ALL' ? 'No orders match your filter' : 'No orders found'}
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
                  {isStaff 
                    ? 'There are currently no customer or shop orders for this club. Once orders are placed online or at POS, they will show up here.'
                    : 'You have not placed any orders yet. Visit our inventory shop to explore equipment and gear!'}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '0.85rem 1.25rem', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order #</th>
                      <th style={{ padding: '0.85rem 1.25rem', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date Placed</th>
                      {isStaff && (
                        <th style={{ padding: '0.85rem 1.25rem', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer</th>
                      )}
                      <th style={{ padding: '0.85rem 1.25rem', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Items Summary</th>
                      <th style={{ padding: '0.85rem 1.25rem', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fulfillment</th>
                      <th style={{ padding: '0.85rem 1.25rem', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                      <th style={{ padding: '0.85rem 1.25rem', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Total</th>
                      <th style={{ padding: '0.85rem 1.25rem', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => {
                      const items = Array.isArray(order.items) ? order.items : [];
                      return (
                        <tr 
                          key={order.id} 
                          style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.12s ease' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          {/* Order Number */}
                          <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                            <span style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                              {order.order_no || `SO-${order.id.slice(0, 6)}`}
                            </span>
                            <div style={{ marginTop: '0.2rem' }}>
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '0.25rem',
                                background: order.channel === 'online' ? '#eff6ff' : '#f1f5f9',
                                color: order.channel === 'online' ? '#2563eb' : '#475569'
                              }}>
                                {order.channel || 'online'}
                              </span>
                            </div>
                          </td>

                          {/* Date Placed */}
                          <td style={{ padding: '1rem 1.25rem', color: '#475569', fontSize: '0.825rem', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Calendar size={13} style={{ color: '#94a3b8' }} />
                              {formatDate(order.placed_at || order.created_at)}
                            </div>
                          </td>

                          {/* Customer Info (Staff view only) */}
                          {isStaff && (
                            <td style={{ padding: '1rem 1.25rem' }}>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>
                                {order.customer_name || 'Guest Customer'}
                              </div>
                              {(order.customer_email || order.customer_phone) && (
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                                  {order.customer_email || order.customer_phone}
                                </div>
                              )}
                            </td>
                          )}

                          {/* Items Summary */}
                          <td style={{ padding: '1rem 1.25rem', maxWidth: '320px' }}>
                            {items.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                {items.slice(0, 2).map((item, idx) => (
                                  <div key={idx} style={{ fontSize: '0.825rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <span style={{
                                      display: 'inline-block',
                                      background: '#f1f5f9',
                                      color: '#475569',
                                      padding: '0.1rem 0.35rem',
                                      borderRadius: '0.25rem',
                                      fontSize: '0.7rem',
                                      fontWeight: 700
                                    }}>
                                      x{item.quantity}
                                    </span>
                                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                      {item.item_name}
                                    </span>
                                  </div>
                                ))}
                                {items.length > 2 && (
                                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                                    +{items.length - 2} more item{items.length - 2 > 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.825rem' }}>No item details</span>
                            )}
                          </td>

                          {/* Fulfillment */}
                          <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: '#475569'
                            }}>
                              {order.fulfillment === 'delivery' ? <Truck size={14} style={{ color: '#2563eb' }} /> : <Package size={14} style={{ color: '#16a34a' }} />}
                              <span style={{ textTransform: 'capitalize' }}>{order.fulfillment || 'counter'}</span>
                            </span>
                          </td>

                          {/* Status */}
                          <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                            {getStatusBadge(order.status)}
                          </td>

                          {/* Total */}
                          <td style={{ padding: '1rem 1.25rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>
                              ${parseFloat(order.total || 0).toFixed(2)}
                            </span>
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '1rem 1.25rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                              <button
                                onClick={() => setSelectedOrder(order)}
                                title="View Order Receipt"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  padding: '0.45rem 0.75rem',
                                  background: '#f8fafc',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.775rem',
                                  fontWeight: 600,
                                  color: '#334155',
                                  cursor: 'pointer'
                                }}
                              >
                                <Eye size={13} /> Details
                              </button>

                              {/* Staff Status Dropdown */}
                              {isStaff && (
                                <select
                                  value={normalizeStatus(order.status)}
                                  disabled={updatingId === order.id}
                                  onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                                  style={{
                                    padding: '0.4rem 0.6rem',
                                    borderRadius: '0.375rem',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    background: '#ffffff',
                                    color: '#0f172a',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <option value="pending">Pending</option>
                                  <option value="confirmed">Confirmed</option>
                                  <option value="ready">Ready / Delivery</option>
                                  <option value="completed">Completed</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Order Details / Invoice Modal */}
      {selectedOrder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          zIndex: 9999
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '1rem',
            width: '100%',
            maxWidth: '620px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            border: '1px solid #e2e8f0'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Order Invoice
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0.15rem 0 0' }}>
                  {selectedOrder.order_no || `SO-${selectedOrder.id.slice(0, 6)}`}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  borderRadius: '0.375rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '1.5rem' }}>
              
              {/* Order Meta Bar */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '1rem',
                padding: '1rem',
                background: '#f8fafc',
                borderRadius: '0.5rem',
                marginBottom: '1.5rem',
                border: '1px solid #e2e8f0'
              }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>Status</span>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>Channel</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>
                    {selectedOrder.channel || 'ONLINE'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>Fulfillment</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', textTransform: 'capitalize' }}>
                    {selectedOrder.fulfillment || 'counter'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>Date Placed</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                    {formatDate(selectedOrder.placed_at || selectedOrder.created_at)}
                  </span>
                </div>
              </div>

              {/* Delivery Information (if delivery) */}
              {selectedOrder.fulfillment === 'delivery' && (
                <div style={{
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  background: '#eff6ff',
                  border: '1px solid #dbeafe'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', color: '#1e40af', fontWeight: 700, fontSize: '0.85rem' }}>
                    <Truck size={16} /> Delivery Destination
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#1e3a8a', lineHeight: '1.4' }}>
                    {selectedOrder.delivery_address || 'Club Facility Delivery / In-person Pickup'}
                  </p>
                </div>
              )}

              {/* Customer Contact */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  Customer Details
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#334155' }}>
                    <User size={15} color="#64748b" />
                    <span>{selectedOrder.customer_name || 'Customer'}</span>
                  </div>
                  {selectedOrder.customer_email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#334155' }}>
                      <Mail size={15} color="#64748b" />
                      <span>{selectedOrder.customer_email}</span>
                    </div>
                  )}
                  {selectedOrder.customer_phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#334155' }}>
                      <Phone size={15} color="#64748b" />
                      <span>{selectedOrder.customer_phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  Purchased Items
                </h4>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                        <th style={{ padding: '0.65rem 1rem' }}>Item</th>
                        <th style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>Qty</th>
                        <th style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>Price</th>
                        <th style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                        selectedOrder.items.map((it, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0f172a' }}>
                              {it.item_name}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#475569' }}>
                              {it.quantity}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#475569' }}>
                              ${parseFloat(it.unit_price || 0).toFixed(2)}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                              ${parseFloat(it.line_total || (it.quantity * it.unit_price) || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8' }}>
                            No line item breakdowns available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Calculation */}
              <div style={{
                background: '#f8fafc',
                padding: '1.25rem',
                borderRadius: '0.5rem',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b' }}>
                  <span>Subtotal</span>
                  <span>${parseFloat(selectedOrder.subtotal || selectedOrder.total || 0).toFixed(2)}</span>
                </div>
                {parseFloat(selectedOrder.delivery_fee || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b' }}>
                    <span>Delivery Fee</span>
                    <span>${parseFloat(selectedOrder.delivery_fee).toFixed(2)}</span>
                  </div>
                )}
                {parseFloat(selectedOrder.tax_total || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b' }}>
                    <span>Taxes</span>
                    <span>${parseFloat(selectedOrder.tax_total).toFixed(2)}</span>
                  </div>
                )}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  borderTop: '1px solid #cbd5e1',
                  paddingTop: '0.5rem',
                  marginTop: '0.25rem'
                }}>
                  <span>Final Total</span>
                  <span>${parseFloat(selectedOrder.total || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Staff Delivery Status Controller in Modal */}
              {isStaff && (
                <div style={{
                  marginTop: '1.5rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.2rem' }}>
                      Update Delivery / Order Status
                    </label>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Changes are recorded in real-time
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <select
                      value={normalizeStatus(selectedOrder.status)}
                      disabled={updatingId === selectedOrder.id}
                      onChange={(e) => handleUpdateStatus(selectedOrder.id, e.target.value)}
                      style={{
                        padding: '0.55rem 0.85rem',
                        borderRadius: '0.375rem',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        background: '#ffffff',
                        color: '#0f172a',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="ready">Ready / Out for Delivery</option>
                      <option value="completed">Completed / Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
