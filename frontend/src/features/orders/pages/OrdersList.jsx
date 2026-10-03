import React, { useState, useEffect } from 'react';
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
  X
} from 'lucide-react';

export default function OrdersList() {
  const { user, role, clubId, clubs } = useAuth();
  const { toast } = useToast();

  const userRole = (role || '').toLowerCase();
  const isStaff = ['owner', 'shop_staff', 'manager', 'admin'].includes(userRole);

  const activeClub = clubs?.find(c => (c.club_id === clubId || c.id === clubId)) || clubs?.[0];
  const clubName = activeClub?.name || 'Current Club';

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const loadOrders = async () => {
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
    loadOrders();
  }, [clubId]);

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      setUpdatingId(orderId);
      await ordersApi.updateOrderStatus(orderId, newStatus);
      toast.success(`Order marked as ${newStatus}`);
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

  // Filtered orders
  const filteredOrders = orders.filter((order) => {
    const matchesStatus = statusFilter === 'ALL' || (order.status || '').toLowerCase() === statusFilter.toLowerCase();
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
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const completedCount = orders.filter(o => o.status === 'completed').length;
  const totalRevenue = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);

  const getStatusBadge = (status) => {
    const s = (status || 'pending').toLowerCase();
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
      case 'processing':
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
            <Clock size={13} /> Processing
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
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
      padding: '2rem 1.5rem',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        
        {/* Top Header Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '1rem',
          padding: '1.75rem 2rem',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0',
          marginBottom: '2rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                color: '#ffffff',
                padding: '0.6rem',
                borderRadius: '0.6rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ShoppingBag size={22} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.025em' }}>
                  {isStaff ? 'Online & Shop Orders' : 'My Order History'}
                </h1>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  {isStaff 
                    ? `Showing all member & guest orders placed at ${clubName}` 
                    : `Your personal purchase and order history at ${clubName}`}
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
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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

          {/* Status Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflowX: 'auto' }}>
            {['ALL', 'pending', 'processing', 'completed', 'cancelled'].map((tab) => {
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
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Orders Table / List Card */}
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
                                value={order.status || 'pending'}
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
                                <option value="processing">Processing</option>
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
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '0.4rem',
                  borderRadius: '0.375rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem' }}>
              {/* Order Meta Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1rem',
                background: '#f8fafc',
                padding: '1rem',
                borderRadius: '0.5rem',
                marginBottom: '1.5rem',
                fontSize: '0.85rem'
              }}>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Placed On</div>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{formatDate(selectedOrder.placed_at || selectedOrder.created_at)}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Status</div>
                  <div style={{ marginTop: '0.2rem' }}>{getStatusBadge(selectedOrder.status)}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Channel</div>
                  <div style={{ fontWeight: 600, color: '#0f172a', textTransform: 'uppercase' }}>{selectedOrder.channel || 'online'}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Fulfillment</div>
                  <div style={{ fontWeight: 600, color: '#0f172a', textTransform: 'capitalize' }}>{selectedOrder.fulfillment || 'counter pickup'}</div>
                </div>
              </div>

              {/* Customer & Delivery Details */}
              <div style={{ marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.65rem' }}>
                  Customer & Delivery
                </h4>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.85rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <User size={15} style={{ color: '#64748b' }} />
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedOrder.customer_name || 'Guest'}</span>
                  </div>
                  {selectedOrder.customer_email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', color: '#475569' }}>
                      <Mail size={15} style={{ color: '#64748b' }} />
                      <span>{selectedOrder.customer_email}</span>
                    </div>
                  )}
                  {selectedOrder.customer_phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', color: '#475569' }}>
                      <Phone size={15} style={{ color: '#64748b' }} />
                      <span>{selectedOrder.customer_phone}</span>
                    </div>
                  )}
                  {selectedOrder.delivery_address && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginTop: '0.5rem', color: '#475569' }}>
                      <MapPin size={15} style={{ color: '#2563eb', marginTop: '0.15rem' }} />
                      <span>{selectedOrder.delivery_address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Breakdown Table */}
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.65rem' }}>
                Purchased Items ({Array.isArray(selectedOrder.items) ? selectedOrder.items.length : 0})
              </h4>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', overflow: 'hidden', marginBottom: '1.5rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', color: '#64748b' }}>Item</th>
                      <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center', color: '#64748b' }}>Qty</th>
                      <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right', color: '#64748b' }}>Price</th>
                      <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right', color: '#64748b' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(selectedOrder.items) ? selectedOrder.items : []).map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem 0.85rem', fontWeight: 600, color: '#0f172a' }}>{item.item_name}</td>
                        <td style={{ padding: '0.75rem 0.85rem', textAlign: 'center', color: '#475569' }}>{item.quantity}</td>
                        <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right', color: '#475569' }}>${parseFloat(item.unit_price || 0).toFixed(2)}</td>
                        <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                          ${parseFloat(item.line_total || item.unit_price * item.quantity || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Price Totals */}
              <div style={{ background: '#f8fafc', borderRadius: '0.5rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>Subtotal</span>
                  <span>${parseFloat(selectedOrder.subtotal || selectedOrder.total || 0).toFixed(2)}</span>
                </div>
                {parseFloat(selectedOrder.delivery_fee) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                    <span>Delivery Fee</span>
                    <span>${parseFloat(selectedOrder.delivery_fee).toFixed(2)}</span>
                  </div>
                )}
                {parseFloat(selectedOrder.tax_total) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                    <span>Tax</span>
                    <span>${parseFloat(selectedOrder.tax_total).toFixed(2)}</span>
                  </div>
                )}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 800,
                  fontSize: '1.05rem',
                  color: '#0f172a',
                  borderTop: '1px solid #e2e8f0',
                  paddingTop: '0.65rem',
                  marginTop: '0.25rem'
                }}>
                  <span>Grand Total</span>
                  <span>${parseFloat(selectedOrder.total || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              background: '#f8fafc'
            }}>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                style={{
                  padding: '0.6rem 1.25rem',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.5rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
