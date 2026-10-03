import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  Coffee,
  Utensils,
  Search,
  Plus,
  Minus,
  Trash2,
  Clock,
  Sparkles,
  ShoppingBag,
  CheckCircle2,
  ArrowRight,
  X,
  CreditCard,
  Percent,
  Wallet,
  AlertCircle,
  Grid,
  Users,
  RefreshCw,
  ChefHat,
  MapPin,
  Activity,
  Check,
} from 'lucide-react';
import barApi from '../services/bar.api.js';
import { openRazorpayCheckout } from '../../../shared/utils/razorpay.util.js';

export default function MemberCafe({ club, membership }) {
  const { user } = useSelector((state) => state.auth);
  const clubId = club?.id;

  // Active view: 'menu' | 'occupancy' | 'orders'
  const [activeView, setActiveView] = useState('menu');

  // Core Data
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshingOrders, setRefreshingOrders] = useState(false);

  // Filters for Menu
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [vegOnly, setVegOnly] = useState(false);

  // Filter for Occupancy
  const [selectedZone, setSelectedZone] = useState('all');

  // Cart State
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [servingLocation, setServingLocation] = useState('takeaway'); // 'takeaway' | 'table'
  const [selectedTableId, setSelectedTableId] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');

  // Checkout states
  const [submitting, setSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [notification, setNotification] = useState(null);

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Determine member discount rate dynamically from membership plan
  const memberDiscountRate = useMemo(() => {
    if (membership?.bar_discount_percent != null) {
      return Number(membership.bar_discount_percent) / 100;
    }
    if (membership?.plan?.bar_discount_percent != null) {
      return Number(membership.plan.bar_discount_percent) / 100;
    }
    const planName = (membership?.plan_name || membership?.plan?.name || '').toLowerCase();
    if (planName.includes('gold')) return 0.03;
    return 0;
  }, [membership]);

  // Load Menu and Tables
  const loadData = useCallback(async () => {
    if (!clubId) return;
    try {
      setLoading(true);
      const [menuData, tablesData] = await Promise.all([
        barApi.getMenu(clubId, null, true), // available items only
        barApi.getTables(clubId, true), // all active tables
      ]);
      setCategories(menuData.categories || []);
      setMenuItems(menuData.items || []);
      setTables(tablesData || []);
    } catch (err) {
      console.error('Failed to load cafe menu or tables:', err);
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  // Load User's Past and Active Orders
  const loadMyOrders = useCallback(async () => {
    if (!clubId) return;
    try {
      setRefreshingOrders(true);
      const orders = await barApi.getOrders(
        { member_id: membership?.member_id || undefined, limit: 30 },
        clubId
      );
      setMyOrders(orders || []);
    } catch (err) {
      console.error('Failed to load member cafe orders:', err);
    } finally {
      setRefreshingOrders(false);
    }
  }, [clubId, membership?.member_id]);

  useEffect(() => {
    loadData();
    loadMyOrders();

    const handleTablesUpdated = () => {
      loadData();
    };
    const handleKdsUpdated = () => {
      loadMyOrders();
    };
    window.addEventListener('tables-updated', handleTablesUpdated);
    window.addEventListener('kds-updated', handleKdsUpdated);
    const handleStorage = (e) => {
      if (e.key === 'ldce_tables_updated') {
        loadData();
      }
      if (e.key === 'ldce_kds_updated' || e.key === 'ldce_orders_updated') {
        loadMyOrders();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('tables-updated', handleTablesUpdated);
      window.removeEventListener('kds-updated', handleKdsUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, [loadData, loadMyOrders]);

  // Poll orders and tables when active view is 'orders' or 'occupancy'
  useEffect(() => {
    if (activeView === 'orders') {
      loadMyOrders();
      const interval = setInterval(loadMyOrders, 3000);
      return () => clearInterval(interval);
    }
    if (activeView === 'occupancy') {
      const refreshTables = async () => {
        try {
          const freshTables = await barApi.getTables(clubId, true);
          setTables(freshTables || []);
        } catch (e) {
          // silent
        }
      };
      refreshTables();
      const interval = setInterval(refreshTables, 10000);
      return () => clearInterval(interval);
    }
  }, [activeView, loadMyOrders, clubId]);

  // Filtered Menu Items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchCat = activeCategory === 'all' || item.category_id === activeCategory;
      const matchSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchVeg = !vegOnly || item.is_veg === true;
      return matchCat && matchSearch && matchVeg;
    });
  }, [menuItems, activeCategory, searchQuery, vegOnly]);

  // Occupancy Zones & Filtered Tables
  const zones = useMemo(() => {
    const list = tables.map((t) => t.zone || 'Main Dining');
    return ['all', ...Array.from(new Set(list))];
  }, [tables]);

  const filteredTables = useMemo(() => {
    if (selectedZone === 'all') return tables;
    return tables.filter((t) => (t.zone || 'Main Dining') === selectedZone);
  }, [tables, selectedZone]);

  const occupancyStats = useMemo(() => {
    const total = tables.length;
    const occupied = tables.filter((t) => t.status === 'occupied').length;
    const reserved = tables.filter((t) => t.status === 'reserved' || t.status === 'billed').length;
    const available = tables.filter((t) => t.status !== 'occupied' && t.status !== 'reserved' && t.status !== 'billed').length;
    const totalSeats = tables.reduce((acc, t) => acc + (Number(t.capacity) || 0), 0);
    return { total, available, occupied, reserved, totalSeats };
  }, [tables]);

  // Cart Totals
  const { subtotal, discountTotal, taxTotal, grandTotal } = useMemo(() => {
    let sub = 0;
    cart.forEach((i) => {
      sub += Number(i.item.price || 0) * i.quantity;
    });
    const disc = sub * memberDiscountRate;
    const taxable = sub - disc;
    const tax = taxable * 0.05;
    const total = taxable + tax;
    return {
      subtotal: sub,
      discountTotal: disc,
      taxTotal: tax,
      grandTotal: total,
    };
  }, [cart, memberDiscountRate]);

  const addToCart = (item) => {
    setCart((prev) => {
      const exists = prev.find((x) => x.item.id === item.id);
      if (exists) {
        return prev.map((x) => (x.item.id === item.id ? { ...x, quantity: x.quantity + 1 } : x));
      }
      return [...prev, { item, quantity: 1, notes: '' }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (itemId, delta) => {
    setCart((prev) =>
      prev
        .map((x) => {
          if (x.item.id === itemId) {
            const nextQty = x.quantity + delta;
            return nextQty > 0 ? { ...x, quantity: nextQty } : null;
          }
          return x;
        })
        .filter(Boolean)
    );
  };

  // Pre-select table from occupancy view
  const handleSelectTableFromOccupancy = (table) => {
    if (table.status !== 'available') return;
    setServingLocation('table');
    setSelectedTableId(table.id);
    setActiveView('menu');
    showToast(`Table ${table.name} selected for Dine-in! Add items to cart.`);
  };

  // Checkout with Razorpay
  const handlePayWithRazorpay = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    let createdOrder = null;
    try {
      const selectedTable = tables.find((t) => t.id === selectedTableId);
      const orderPayload = {
        table_id: servingLocation === 'table' ? selectedTableId || null : null,
        member_id: membership?.member_id || null,
        guest_name: user?.full_name || 'Member',
        notes: `Member app order (${servingLocation === 'table' ? 'Table ' + (selectedTable?.name || '') : 'Takeaway'})${deliveryNote ? ' - ' + deliveryNote : ''}`,
        items: cart.map((i) => ({
          menu_item_id: i.item.id,
          quantity: i.quantity,
          notes: i.notes || null,
        })),
      };

      createdOrder = await barApi.createOrder(orderPayload, clubId);

      // Create Razorpay order
      const rzpOrder = await barApi.createRazorpayOrder(
        { order_id: createdOrder.id, amount: grandTotal },
        clubId
      );

      // Open Razorpay Checkout modal
      await openRazorpayCheckout({
        orderId: rzpOrder.orderId,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        name: club.name + ' - Cafe & Bar',
        description: `Order #${createdOrder.order_no}`,
        prefill: {
          name: user?.full_name,
          email: user?.email,
          phone: user?.phone,
        },
        onSuccess: async (rzpResponse) => {
          await barApi.verifyRazorpayPayment(
            {
              razorpay_order_id: rzpResponse.razorpay_order_id,
              razorpay_payment_id: rzpResponse.razorpay_payment_id,
              razorpay_signature: rzpResponse.razorpay_signature,
              order_id: createdOrder.id,
            },
            clubId
          );

          setCompletedOrder({
            id: createdOrder.id,
            orderNo: createdOrder.order_no,
            amount: grandTotal,
            reference: rzpResponse.razorpay_payment_id,
            method: 'Razorpay Online',
          });
          setCart([]);
          setIsCartOpen(false);
          loadMyOrders();
          loadData();
          window.dispatchEvent(new CustomEvent('tables-updated'));
          window.dispatchEvent(new CustomEvent('order-placed'));
          localStorage.setItem('ldce_tables_updated', Date.now().toString());
          showToast('Payment successful! Your order has been placed and table is now occupied.', 'success');
        },
        onDismiss: async () => {
          if (createdOrder?.id) {
            try {
              await barApi.cancelOrder(createdOrder.id, 'Payment cancelled by user', clubId);
            } catch (e) {
              console.error('Failed to cancel unpaid order:', e);
            }
          }
          showToast('Payment cancelled. Order was not sent to kitchen.', 'error');
          loadData();
          loadMyOrders();
          window.dispatchEvent(new CustomEvent('tables-updated'));
          localStorage.setItem('ldce_tables_updated', Date.now().toString());
        },
      });
    } catch (err) {
      console.error('Member cafe checkout error:', err);
      if (createdOrder?.id) {
        try {
          await barApi.cancelOrder(createdOrder.id, err.message || 'Payment failed', clubId);
        } catch (e) {
          console.error('Failed to cancel order on error:', e);
        }
      }
      showToast(err.customMessage || err.message || 'Payment failed. Order not placed.', 'error');
      loadData();
      loadMyOrders();
      window.dispatchEvent(new CustomEvent('tables-updated'));
      localStorage.setItem('ldce_tables_updated', Date.now().toString());
    } finally {
      setSubmitting(false);
    }
  };

  // Charge to Member Tab
  const handleChargeToTab = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const selectedTable = tables.find((t) => t.id === selectedTableId);
      const resolvedMemberId = membership?.member_id || membership?.id || user?.member_id || null;
      const orderPayload = {
        table_id: servingLocation === 'table' ? selectedTableId || null : null,
        member_id: resolvedMemberId,
        guest_name: user?.full_name || 'Club Member',
        charge_to_tab: true,
        notes: `Member tab order (${servingLocation === 'table' ? 'Table ' + (selectedTable?.name || '') : 'Takeaway'})${deliveryNote ? ' - ' + deliveryNote : ''}`,
        items: cart.map((i) => ({
          menu_item_id: i.item.id,
          quantity: i.quantity,
          notes: i.notes || null,
        })),
      };

      const createdOrder = await barApi.createOrder(orderPayload, clubId);
      setCompletedOrder({
        id: createdOrder.id,
        orderNo: createdOrder.order_no,
        amount: grandTotal,
        method: 'Charged to Club Tab',
      });
      setCart([]);
      setIsCartOpen(false);
      loadMyOrders();
      loadData();
      window.dispatchEvent(new CustomEvent('tables-updated'));
      window.dispatchEvent(new CustomEvent('order-placed'));
      window.dispatchEvent(new CustomEvent('tabs-updated'));
      window.dispatchEvent(new CustomEvent('kds-updated'));
      localStorage.setItem('ldce_tables_updated', Date.now().toString());
      localStorage.setItem('ldce_tabs_updated', Date.now().toString());
      localStorage.setItem('ldce_kds_updated', Date.now().toString());
      localStorage.setItem('ldce_orders_updated', Date.now().toString());
      showToast('Order placed & charged to your member tab! Outstanding due updated.', 'success');
    } catch (err) {
      console.error('Tab checkout error:', err);
      showToast(err.customMessage || 'Could not charge to tab.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Toast */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            padding: '0.75rem 1.25rem',
            borderRadius: '8px',
            background: notification.type === 'error' ? '#EF4444' : '#1F5C46',
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

      {/* Header Banner with Member Tier Discount Indicator */}
      <div
        style={{
          background: '#1F5C46',
          borderRadius: '12px',
          padding: '1.5rem',
          color: '#FAF9F6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Coffee size={24} color="#FAF9F6" />
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
              {club.name} Cafe & Dining
            </h2>
          </div>
          <p style={{ margin: '0.35rem 0 0', opacity: 0.85, fontSize: '0.85rem' }}>
            Order gourmet meals & smoothies, view table occupancy in real time, and track preparation.
          </p>
        </div>

        {memberDiscountRate > 0 && (
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              borderRadius: '8px',
              padding: '0.65rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Sparkles size={18} color="#FDE047" />
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#FDE047' }}>
                {(memberDiscountRate * 100).toFixed(0)}% Member Plan Discount
              </div>
              <div style={{ fontSize: '0.7rem', opacity: 0.85 }}>
                Applied automatically for {membership?.plan?.name || 'Club Member'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Switcher Tabs (Order Menu | Table Occupancy | My Orders) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          borderBottom: '1px solid #E7E5DF',
          paddingBottom: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[
            { id: 'menu', label: 'Cafe Menu & Order', icon: Utensils },
            { id: 'occupancy', label: 'Table Occupancy', icon: Grid, count: `${occupancyStats.available}/${occupancyStats.total} Free` },
            { id: 'orders', label: 'My Orders & Live Status', icon: Activity, count: myOrders.filter((o) => o.status === 'open' || o.status === 'sent').length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveView(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem 1.15rem',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: isActive ? '#1F5C46' : '#E7E5DF',
                  background: isActive ? '#1F5C46' : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : '#1A1A18',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    style={{
                      background: isActive ? 'rgba(255,255,255,0.25)' : '#EBF3F0',
                      color: isActive ? '#FFFFFF' : '#1F5C46',
                      borderRadius: '10px',
                      padding: '0.1rem 0.45rem',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Floating Cart Trigger */}
        {cart.length > 0 && (
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.55rem 1.15rem',
              borderRadius: '8px',
              border: 'none',
              background: '#1F5C46',
              color: '#FAF9F6',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(31,92,70,0.25)',
            }}
          >
            <ShoppingBag size={16} />
            <span>View Cart ({cart.reduce((a, b) => a + b.quantity, 0)})</span>
            <span
              style={{
                background: '#FAF9F6',
                color: '#1F5C46',
                borderRadius: '4px',
                padding: '0.15rem 0.4rem',
                fontSize: '0.78rem',
                fontWeight: 900,
              }}
            >
              ₹{grandTotal.toFixed(0)}
            </span>
          </button>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* ─── VIEW 1: CAFE MENU & ORDERING ─── */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeView === 'menu' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Selected Table Notification Banner if pre-selected */}
          {servingLocation === 'table' && selectedTableId && (
            <div
              style={{
                background: '#EBFDF5',
                border: '1.5px solid #A7F3D0',
                borderRadius: '8px',
                padding: '0.65rem 1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#065F46', fontWeight: 600 }}>
                <CheckCircle2 size={16} color="#059669" />
                <span>
                  Dining In at: <strong>{tables.find((t) => t.id === selectedTableId)?.name || 'Selected Table'}</strong> ({tables.find((t) => t.id === selectedTableId)?.zone || 'Dining Area'})
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedTableId('');
                  setServingLocation('takeaway');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '0.75rem',
                  color: '#DC2626',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                Change to Takeaway
              </button>
            </div>
          )}

          {/* Filter and Search Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#FFFFFF',
                border: '1px solid #E7E5DF',
                borderRadius: '8px',
                padding: '0.5rem 0.85rem',
                flex: 1,
                maxWidth: '420px',
                gap: '0.5rem',
              }}
            >
              <Search size={16} color="#6B6B66" />
              <input
                type="text"
                placeholder="Search smoothies, protein bowls, wraps, coffee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.85rem' }}
              />
            </div>

            <button
              type="button"
              onClick={() => setVegOnly(!vegOnly)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.9rem',
                borderRadius: '8px',
                border: vegOnly ? '1.5px solid #10B981' : '1px solid #E7E5DF',
                background: vegOnly ? '#EBFDF5' : '#FFFFFF',
                color: vegOnly ? '#047857' : '#6B6B66',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '2px',
                  border: '1.5px solid #10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#10B981' }} />
              </span>
              <span>Pure Veg</span>
            </button>
          </div>

          {/* Category Pills */}
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: '20px',
                border: '1px solid',
                borderColor: activeCategory === 'all' ? '#1F5C46' : '#E7E5DF',
                background: activeCategory === 'all' ? '#1F5C46' : '#FFFFFF',
                color: activeCategory === 'all' ? '#FAF9F6' : '#1A1A18',
                fontWeight: activeCategory === 'all' ? 700 : 500,
                fontSize: '0.8rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              All Items ({menuItems.length})
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCategory(c.id)}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: '20px',
                  border: '1px solid',
                  borderColor: activeCategory === c.id ? '#1F5C46' : '#E7E5DF',
                  background: activeCategory === c.id ? '#1F5C46' : '#FFFFFF',
                  color: activeCategory === c.id ? '#FAF9F6' : '#1A1A18',
                  fontWeight: activeCategory === c.id ? 700 : 500,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Menu Items Cards Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6B6B66' }}>
              Loading fresh cafe menu...
            </div>
          ) : filteredItems.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '3rem',
                background: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #E7E5DF',
                color: '#6B6B66',
              }}
            >
              <Utensils size={36} color="#A8A29E" style={{ margin: '0 auto 0.5rem' }} />
              <div style={{ fontWeight: 600 }}>No items match your filter</div>
              <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                Try adjusting your search query or category.
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '1rem',
              }}
            >
              {filteredItems.map((item) => {
                const inCart = cart.find((x) => x.item.id === item.id);
                const isVeg = item.is_veg !== false;

                return (
                  <div
                    key={item.id}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '10px',
                      border: inCart ? '1.5px solid #1F5C46' : '1px solid #E7E5DF',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      transition: 'transform 0.15s ease',
                    }}
                  >
                    <div>
                      {/* Image Thumbnail */}
                      <div
                        style={{
                          height: '130px',
                          background: item.image_url
                            ? `url(${item.image_url}) center/cover no-repeat`
                            : '#F4F2EC',
                          position: 'relative',
                        }}
                      >
                        {/* Veg / Non-Veg badge */}
                        <div
                          style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            width: '16px',
                            height: '16px',
                            background: '#FFFFFF',
                            borderRadius: '3px',
                            border: `1.5px solid ${isVeg ? '#10B981' : '#EF4444'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <span
                            style={{
                              width: '5px',
                              height: '5px',
                              borderRadius: '50%',
                              background: isVeg ? '#10B981' : '#EF4444',
                            }}
                          />
                        </div>

                        {item.prep_minutes && (
                          <div
                            style={{
                              position: 'absolute',
                              bottom: '8px',
                              right: '8px',
                              fontSize: '0.68rem',
                              background: 'rgba(0,0,0,0.65)',
                              color: '#FFFFFF',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                            }}
                          >
                            <Clock size={11} />
                            <span>{item.prep_minutes}m</span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div style={{ padding: '0.85rem' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.25rem', color: '#1A1A18' }}>
                          {item.name}
                        </h4>
                        {item.description && (
                          <p style={{ fontSize: '0.75rem', color: '#6B6B66', margin: '0 0 0.5rem', lineHeight: 1.4 }}>
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Price and Cart Action */}
                    <div
                      style={{
                        padding: '0.75rem 0.85rem',
                        borderTop: '1px solid #F4F2EC',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1F5C46' }}>
                          ₹{Number(item.price).toLocaleString()}
                        </div>
                        {memberDiscountRate > 0 && (
                          <div style={{ fontSize: '0.68rem', color: '#047857', fontWeight: 700 }}>
                            Member: ₹{(Number(item.price) * (1 - memberDiscountRate)).toFixed(0)}
                          </div>
                        )}
                      </div>

                      {inCart ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, -1)}
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '4px',
                              border: '1px solid #E7E5DF',
                              background: '#FAF9F6',
                              cursor: 'pointer',
                              fontWeight: 800,
                            }}
                          >
                            -
                          </button>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, minWidth: '18px', textAlign: 'center' }}>
                            {inCart.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, 1)}
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '4px',
                              border: '1px solid #E7E5DF',
                              background: '#FAF9F6',
                              cursor: 'pointer',
                              fontWeight: 800,
                            }}
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addToCart(item)}
                          style={{
                            padding: '0.4rem 0.85rem',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#1F5C46',
                            color: '#FAF9F6',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                        >
                          <Plus size={14} />
                          <span>Add</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* ─── VIEW 2: TABLE OCCUPANCY & FLOOR PLAN ─── */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeView === 'occupancy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Top Occupancy Banner */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E7E5DF',
              borderRadius: '10px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#1A1A18' }}>
                  Live Dining Room & Table Occupancy
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#6B6B66' }}>
                  Real-time seating availability across dining halls, lounge and terrace. Pick a table to dine in!
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.78rem', fontWeight: 700 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#10B981' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
                  {occupancyStats.available} Available
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#F59E0B' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B' }} />
                  {occupancyStats.occupied} Occupied
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#6366F1' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366F1' }} />
                  {occupancyStats.reserved} Reserved
                </span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '0.75rem',
                borderTop: '1px solid #F4F2EC',
                paddingTop: '0.75rem',
              }}
            >
              <div style={{ background: '#FAF9F6', padding: '0.65rem 0.85rem', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.7rem', color: '#6B6B66' }}>Total Tables</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1A1A18' }}>{occupancyStats.total}</div>
              </div>
              <div style={{ background: '#EBFDF5', padding: '0.65rem 0.85rem', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.7rem', color: '#047857' }}>Available Seats</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>
                  {tables.filter((t) => t.status !== 'occupied' && t.status !== 'reserved' && t.status !== 'billed').reduce((a, b) => a + (Number(b.capacity) || 0), 0)} Seats
                </div>
              </div>
              <div style={{ background: '#FAF9F6', padding: '0.65rem 0.85rem', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.7rem', color: '#6B6B66' }}>Total Seating Capacity</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1F5C46' }}>{occupancyStats.totalSeats} Seats</div>
              </div>
            </div>
          </div>

          {/* Zone Selector */}
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            {zones.map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setSelectedZone(z)}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '20px',
                  border: '1px solid',
                  borderColor: selectedZone === z ? '#1F5C46' : '#E7E5DF',
                  background: selectedZone === z ? '#1F5C46' : '#FFFFFF',
                  color: selectedZone === z ? '#FAF9F6' : '#1A1A18',
                  fontWeight: selectedZone === z ? 700 : 500,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  textTransform: 'capitalize',
                }}
              >
                {z === 'all' ? 'All Areas' : z} ({z === 'all' ? tables.length : tables.filter((t) => (t.zone || 'Main Dining') === z).length})
              </button>
            ))}
          </div>

          {/* Tables Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '1rem',
            }}
          >
            {filteredTables.map((table) => {
              const isOccupied = table.status === 'occupied';
              const isBilled = table.status === 'billed';
              const isReserved = table.status === 'reserved';
              const isAvail = !isOccupied && !isBilled && !isReserved;

              let statusColor = '#10B981';
              let statusBg = '#EBFDF5';
              let statusText = 'Available Now';
              if (isOccupied) {
                statusColor = '#F59E0B';
                statusBg = '#FEF3C7';
                statusText = 'Occupied (Dining)';
              } else if (isBilled) {
                statusColor = '#6366F1';
                statusBg = '#EEF2FF';
                statusText = 'Awaiting Settlement';
              } else if (isReserved) {
                statusColor = '#2563EB';
                statusBg = '#EFF6FF';
                statusText = 'Reserved';
              }

              const isSelected = servingLocation === 'table' && selectedTableId === table.id;

              return (
                <div
                  key={table.id}
                  style={{
                    background: '#FFFFFF',
                    border: isSelected ? '2px solid #1F5C46' : `1.5px solid ${statusColor}`,
                    borderRadius: '10px',
                    padding: '1.25rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1A1A18' }}>
                          {table.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6B6B66', marginTop: '0.15rem' }}>
                          {table.zone || 'Main Dining'}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: statusColor,
                          background: statusBg,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '4px',
                        }}
                      >
                        {statusText}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        background: '#FAF9F6',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '6px',
                        border: '1px solid #E7E5DF',
                        fontSize: '0.8rem',
                        color: '#1A1A18',
                      }}
                    >
                      <Users size={16} color="#1F5C46" />
                      <span>
                        Seating Capacity: <strong>{table.capacity} Guests</strong>
                      </span>
                    </div>
                  </div>

                  <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #F4F2EC' }}>
                    {isAvail ? (
                      <button
                        type="button"
                        onClick={() => handleSelectTableFromOccupancy(table)}
                        style={{
                          width: '100%',
                          padding: '0.55rem',
                          borderRadius: '6px',
                          border: 'none',
                          background: isSelected ? '#047857' : '#1F5C46',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <Utensils size={14} />
                        <span>{isSelected ? 'Table Selected ✓' : 'Dine at this Table'}</span>
                      </button>
                    ) : (
                      <div
                        style={{
                          textAlign: 'center',
                          fontSize: '0.75rem',
                          color: '#6B6B66',
                          padding: '0.45rem',
                          background: '#FAF9F6',
                          borderRadius: '6px',
                        }}
                      >
                        Currently in use • Pick another table
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* ─── VIEW 3: MY ORDERS & LIVE STATUS TRACKER ─── */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeView === 'orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#1A1A18' }}>
                My Cafe Orders & Live Status
              </h3>
              <span style={{ fontSize: '0.82rem', color: '#6B6B66' }}>
                Track real-time preparation in the kitchen, pickup readiness, and order invoices.
              </span>
            </div>

            <button
              type="button"
              onClick={loadMyOrders}
              disabled={refreshingOrders}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                border: '1px solid #E7E5DF',
                background: '#FFFFFF',
                color: '#1A1A18',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} className={refreshingOrders ? 'animate-spin' : ''} />
              <span>Refresh Status</span>
            </button>
          </div>

          {myOrders.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                background: '#FFFFFF',
                borderRadius: '10px',
                border: '1px solid #E7E5DF',
                color: '#6B6B66',
              }}
            >
              <ShoppingBag size={42} color="#A8A29E" style={{ margin: '0 auto 0.75rem' }} />
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1A1A18' }}>No orders placed yet</div>
              <p style={{ fontSize: '0.82rem', marginTop: '0.35rem' }}>
                Browse our fresh artisanal menu and place an order to track it live here.
              </p>
              <button
                type="button"
                onClick={() => setActiveView('menu')}
                style={{
                  marginTop: '1rem',
                  padding: '0.55rem 1.25rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#1F5C46',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                Browse Menu
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {myOrders.map((ord) => {
                // Compute aggregate order stage from items
                const items = ord.items || [];
                const isVoid = ord.status === 'void';
                const isUnpaid = ord.status === 'open' && !ord.tab_id;
                const anyReady = items.some((i) => i.kds_status === 'ready');
                const anyPrep = items.some((i) => i.kds_status === 'preparing');
                const allServed = items.length > 0 && items.every((i) => i.kds_status === 'served');

                let currentStage = 1; // 1: Placed, 2: Preparing, 3: Ready, 4: Served
                if (allServed || ord.status === 'served') {
                  currentStage = 4;
                } else if (anyReady) {
                  currentStage = 3;
                } else if (anyPrep || ord.status === 'sent') {
                  currentStage = 2;
                }

                return (
                  <div
                    key={ord.id}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E7E5DF',
                      padding: '1.5rem',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                      opacity: isVoid ? 0.75 : 1,
                    }}
                  >
                    {/* Order Header */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                        borderBottom: '1px solid #F4F2EC',
                        paddingBottom: '1rem',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <span style={{ fontSize: '1.15rem', fontWeight: 900, color: isVoid ? '#6B6B66' : '#1F5C46' }}>
                            Order #{ord.order_no}
                          </span>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.55rem',
                              borderRadius: '4px',
                              background: isVoid ? '#FEF2F2' : isUnpaid ? '#FFFBEB' : currentStage === 4 ? '#EBFDF5' : '#FEF3C7',
                              color: isVoid ? '#DC2626' : isUnpaid ? '#D97706' : currentStage === 4 ? '#047857' : '#D97706',
                              textTransform: 'uppercase',
                            }}
                          >
                            {isVoid
                              ? 'Payment Cancelled'
                              : isUnpaid
                              ? 'Payment Pending'
                              : currentStage === 4
                              ? 'Served'
                              : currentStage === 3
                              ? 'Ready for Pickup'
                              : currentStage === 2
                              ? 'Cooking in Kitchen'
                              : 'Order Placed'}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.78rem', color: '#6B6B66', marginTop: '0.35rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <span>📅 {new Date(ord.opened_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          <span>•</span>
                          <span>
                            📍 {ord.table_name ? `Table ${ord.table_name} (${ord.table_zone || 'Dining Area'})` : 'Takeaway / Counter Pickup'}
                          </span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#1A1A18' }}>
                          ₹{Number(ord.total || 0).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: isVoid ? '#DC2626' : '#047857', fontWeight: 700 }}>
                          {isVoid
                            ? 'Not Charged'
                            : ord.tab_id
                            ? 'Charged to Member Tab'
                            : ord.status === 'paid'
                            ? 'Paid Online'
                            : 'Payment Pending'}
                        </div>
                      </div>
                    </div>

                    {/* Progress Tracker or Cancellation Banner */}
                    <div style={{ padding: '1.25rem 0', borderBottom: '1px solid #F4F2EC' }}>
                      {isVoid ? (
                        <div
                          style={{
                            padding: '1rem',
                            background: '#FEF2F2',
                            borderRadius: '8px',
                            border: '1px solid #FECACA',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            color: '#991B1B',
                            fontSize: '0.82rem',
                          }}
                        >
                          <AlertCircle size={20} color="#DC2626" />
                          <div>
                            <div style={{ fontWeight: 700 }}>Order Cancelled (Payment Not Completed)</div>
                            <div style={{ fontSize: '0.75rem', color: '#B91C1C', marginTop: '0.15rem' }}>
                              Payment was not completed or was cancelled. This order was NOT sent to the kitchen.
                            </div>
                          </div>
                        </div>
                      ) : isUnpaid ? (
                        <div
                          style={{
                            padding: '1rem',
                            background: '#FFFBEB',
                            borderRadius: '8px',
                            border: '1px solid #FDE68A',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            color: '#92400E',
                            fontSize: '0.82rem',
                          }}
                        >
                          <Clock size={20} color="#D97706" />
                          <div>
                            <div style={{ fontWeight: 700 }}>Awaiting Payment Confirmation</div>
                            <div style={{ fontSize: '0.75rem', color: '#B45309', marginTop: '0.15rem' }}>
                              Order will only be sent to the kitchen after payment is verified.
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '0.5rem',
                            position: 'relative',
                          }}
                        >
                          {[
                            { step: 1, label: 'Order Placed', desc: 'Sent to cafe', icon: Clock },
                            { step: 2, label: 'Kitchen Preparing', desc: 'Chefs cooking', icon: ChefHat },
                            { step: 3, label: 'Ready', desc: ord.table_name ? 'Ready to serve' : 'Pickup at counter', icon: Sparkles },
                            { step: 4, label: 'Served', desc: 'Enjoy your meal', icon: Utensils },
                          ].map((st) => {
                            const Icon = st.icon;
                            const isDone = currentStage >= st.step;
                            const isCurrent = currentStage === st.step;

                            return (
                              <div
                                key={st.step}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  textAlign: 'center',
                                }}
                              >
                                <div
                                  style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '50%',
                                    background: isDone ? '#1F5C46' : '#F4F2EC',
                                    color: isDone ? '#FFFFFF' : '#A8A29E',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '0.5rem',
                                    border: isCurrent ? '3px solid #A7F3D0' : 'none',
                                    boxShadow: isCurrent ? '0 0 0 4px rgba(31,92,70,0.15)' : 'none',
                                    transition: 'all 0.2s ease',
                                  }}
                                >
                                  {isDone && !isCurrent ? <Check size={18} /> : <Icon size={18} />}
                                </div>
                                <div style={{ fontSize: '0.8rem', fontWeight: isDone ? 700 : 500, color: isDone ? '#1A1A18' : '#6B6B66' }}>
                                  {st.label}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#6B6B66', marginTop: '0.15rem' }}>
                                  {st.desc}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Ordered Items Breakdown */}
                    <div style={{ marginTop: '1rem' }}>
                      <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#6B6B66', margin: '0 0 0.65rem', textTransform: 'uppercase' }}>
                        Items in this Order ({items.length})
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {items.map((item, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '0.85rem',
                              background: '#FAF9F6',
                              padding: '0.65rem 0.85rem',
                              borderRadius: '6px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontWeight: 800, color: '#1F5C46' }}>{item.quantity}×</span>
                              <span style={{ fontWeight: 600, color: '#1A1A18' }}>{item.item_name}</span>
                              {item.notes && (
                                <span style={{ fontSize: '0.75rem', color: '#D97706' }}>({item.notes})</span>
                              )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                  background:
                                    item.kds_status === 'served'
                                      ? '#EBFDF5'
                                      : item.kds_status === 'ready'
                                      ? '#EEF2FF'
                                      : item.kds_status === 'preparing'
                                      ? '#FEF3C7'
                                      : '#F4F2EC',
                                  color:
                                    item.kds_status === 'served'
                                      ? '#047857'
                                      : item.kds_status === 'ready'
                                      ? '#4F46E5'
                                      : item.kds_status === 'preparing'
                                      ? '#D97706'
                                      : '#6B6B66',
                                  textTransform: 'capitalize',
                                }}
                              >
                                {item.kds_status || 'placed'}
                              </span>
                              <span style={{ fontWeight: 700, color: '#1A1A18' }}>
                                ₹{Number(item.line_total || item.unit_price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* ─── CART DRAWER MODAL ─── */}
      {/* ═══════════════════════════════════════════════════ */}
      {isCartOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(26, 26, 24, 0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              background: '#FFFFFF',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
            }}
          >
            <div
              style={{
                padding: '1.25rem',
                borderBottom: '1px solid #E7E5DF',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#FAF9F6',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <ShoppingBag size={18} color="#1F5C46" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#1A1A18' }}>
                  Your Cafe Order ({cart.reduce((a, b) => a + b.quantity, 0)})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B6B66' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Serving location selection & Table Picker */}
            <div style={{ padding: '1rem', borderBottom: '1px solid #E7E5DF', background: '#FFFFFF' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#6B6B66', marginBottom: '0.45rem', textTransform: 'uppercase' }}>
                Serving Mode
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {[
                  { id: 'takeaway', label: 'Takeaway / Counter' },
                  { id: 'table', label: 'Dine-in at Table' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setServingLocation(m.id)}
                    style={{
                      flex: 1,
                      padding: '0.45rem',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: servingLocation === m.id ? '#1F5C46' : '#E7E5DF',
                      background: servingLocation === m.id ? '#EBF3F0' : '#FFFFFF',
                      color: servingLocation === m.id ? '#1F5C46' : '#1A1A18',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {servingLocation === 'table' && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#1A1A18', marginBottom: '0.35rem' }}>
                    Choose Table & Seating Capacity *
                  </label>
                  <select
                    value={selectedTableId}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1.5px solid #1F5C46',
                      fontSize: '0.82rem',
                      background: '#FFFFFF',
                      outline: 'none',
                    }}
                  >
                    <option value="">Select available table...</option>
                    {tables.map((t) => {
                      const isAvail = t.status === 'available';
                      return (
                        <option key={t.id} value={t.id} disabled={!isAvail}>
                          {t.name} ({t.zone || 'Dining Area'} • {t.capacity} Seats) {isAvail ? '✓ Available' : `• (${t.status.toUpperCase()})`}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              <input
                type="text"
                placeholder="Special preparation notes or allergies (optional)..."
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.65rem',
                  border: '1px solid #E7E5DF',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Cart Items list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#A8A29E', marginTop: '2rem' }}>
                  Cart is empty
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {cart.map((i) => (
                    <div
                      key={i.item.id}
                      style={{
                        padding: '0.65rem 0.85rem',
                        border: '1px solid #E7E5DF',
                        borderRadius: '8px',
                        background: '#FAF9F6',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1A1A18' }}>
                          {i.item.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#6B6B66' }}>
                          ₹{Number(i.item.price).toLocaleString()} × {i.quantity}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <button
                          type="button"
                          onClick={() => updateQuantity(i.item.id, -1)}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '4px',
                            border: '1px solid #E7E5DF',
                            background: '#FFFFFF',
                            cursor: 'pointer',
                            fontWeight: 800,
                          }}
                        >
                          -
                        </button>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, minWidth: '18px', textAlign: 'center' }}>
                          {i.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(i.item.id, 1)}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '4px',
                            border: '1px solid #E7E5DF',
                            background: '#FFFFFF',
                            cursor: 'pointer',
                            fontWeight: 800,
                          }}
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => updateQuantity(i.item.id, -i.quantity)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#EF4444',
                            cursor: 'pointer',
                            marginLeft: '0.35rem',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Financial Summary & Payment Actions */}
            {cart.length > 0 && (
              <div style={{ padding: '1rem', borderTop: '1px solid #E7E5DF', background: '#FFFFFF' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#6B6B66' }}>
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>

                  {discountTotal > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#047857', fontWeight: 600 }}>
                      <span>Member Plan Discount ({(memberDiscountRate * 100).toFixed(0)}%)</span>
                      <span>-₹{discountTotal.toFixed(2)}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#6B6B66' }}>
                    <span>GST (5%)</span>
                    <span>₹{taxTotal.toFixed(2)}</span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      borderTop: '1px solid #E7E5DF',
                      paddingTop: '0.5rem',
                      marginTop: '0.25rem',
                    }}
                  >
                    <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>Total Payable</span>
                    <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#1F5C46' }}>
                      ₹{grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button
                    type="button"
                    disabled={submitting || (servingLocation === 'table' && !selectedTableId)}
                    onClick={handlePayWithRazorpay}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#1F5C46',
                      color: '#FAF9F6',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      opacity: submitting || (servingLocation === 'table' && !selectedTableId) ? 0.6 : 1,
                    }}
                  >
                    <CreditCard size={16} />
                    <span>Pay with Razorpay (UPI, Cards, Netbanking)</span>
                  </button>

                  <button
                    type="button"
                    disabled={submitting || (servingLocation === 'table' && !selectedTableId)}
                    onClick={handleChargeToTab}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      border: '1px solid #1F5C46',
                      background: '#FFFFFF',
                      color: '#1F5C46',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      opacity: submitting || (servingLocation === 'table' && !selectedTableId) ? 0.6 : 1,
                    }}
                  >
                    <Wallet size={15} />
                    <span>Charge to Member Tab</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* ─── ORDER PLACED SUCCESS MODAL ─── */}
      {/* ═══════════════════════════════════════════════════ */}
      {completedOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(26, 26, 24, 0.6)',
            backdropFilter: 'blur(3px)',
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
              maxWidth: '400px',
              width: '100%',
              padding: '2rem 1.5rem',
              textAlign: 'center',
              boxShadow: '0 12px 36px rgba(0,0,0,0.2)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#EBFDF5',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <CheckCircle2 size={34} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.35rem', color: '#1A1A18' }}>
              Order Placed Successfully!
            </h3>
            <p style={{ color: '#6B6B66', fontSize: '0.85rem', margin: '0 0 1.25rem' }}>
              Your order <strong>#{completedOrder.orderNo}</strong> has been transmitted to the cafe kitchen.
            </p>

            <div style={{ background: '#FAF9F6', border: '1px solid #E7E5DF', borderRadius: '8px', padding: '0.85rem', marginBottom: '1.25rem', fontSize: '0.8rem', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: '#6B6B66' }}>Amount Paid:</span>
                <strong style={{ color: '#1F5C46' }}>₹{completedOrder.amount.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6B6B66' }}>Payment Method:</span>
                <span>{completedOrder.method || 'Razorpay Online'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => {
                  setCompletedOrder(null);
                  setActiveView('orders');
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#1F5C46',
                  color: '#FAF9F6',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                }}
              >
                <Activity size={16} />
                <span>Track Live Order Status →</span>
              </button>

              <button
                type="button"
                onClick={() => setCompletedOrder(null)}
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  borderRadius: '6px',
                  border: '1px solid #E7E5DF',
                  background: '#FFFFFF',
                  color: '#6B6B66',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
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
