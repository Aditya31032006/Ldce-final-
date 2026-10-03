import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  Coffee,
  Utensils,
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  ChevronRight,
  RefreshCw,
  Printer,
  Sparkles,
  ArrowRight,
  X,
  FileText,
  Percent,
  Receipt,
  Grid,
  ChefHat,
  Wallet,
  Calendar,
  Layers,
  ShoppingBag,
} from 'lucide-react';
import barApi from '../services/bar.api.js';
import membersApi from '../../members/services/members.api.js';
import { openRazorpayCheckout } from '../../../shared/utils/razorpay.util.js';

export default function BarPOS() {
  const { user } = useSelector((state) => state.auth);
  const activeClubId = localStorage.getItem('activeClubId') || user?.club_id;

  // Active view tab: 'terminal' | 'tables' | 'kds' | 'tabs' | 'closing'
  const [activeTab, setActiveTab] = useState('terminal');

  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Core Data
  const [tables, setTables] = useState([]);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [kdsItems, setKdsItems] = useState([]);
  const [memberTabs, setMemberTabs] = useState([]);
  const [dailyClosing, setDailyClosing] = useState(null);

  // Terminal / Order State
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [guestName, setGuestName] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState([]);
  const [searchingMember, setSearchingMember] = useState(false);

  // Cart: Array of { menuItem, quantity, notes }
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [vegOnly, setVegOnly] = useState(false);

  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutMethod, setCheckoutMethod] = useState('razorpay'); // 'razorpay' | 'cash' | 'card' | 'tab'
  const [cashTendered, setCashTendered] = useState('');
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);

  // Tab Settlement Modal
  const [settlingTab, setSettlingTab] = useState(null);
  const [tabPaymentMethod, setTabPaymentMethod] = useState('razorpay');

  // Active KDS filter station: null | 'kitchen' | 'bar'
  const [kdsStation, setKdsStation] = useState(null);

  // Toast / notification
  const [notification, setNotification] = useState(null);
  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Load Initial Data
  const loadPOSData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [tablesData, menuData, ordersData] = await Promise.all([
        barApi.getTables(activeClubId).catch(() => []),
        barApi.getMenu(activeClubId).catch(() => ({ categories: [], items: [] })),
        barApi.getOrders({ status: 'open', limit: 20 }, activeClubId).catch(() => []),
      ]);

      setTables(tablesData || []);
      setCategories(menuData.categories || []);
      setMenuItems(menuData.items || []);
      setOrders(ordersData || []);
    } catch (err) {
      console.error('Failed to load POS data:', err);
      showNotification('Error loading menu and tables', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeClubId]);

  useEffect(() => {
    loadPOSData();
  }, [loadPOSData]);

  // Load KDS data when KDS tab active
  const loadKdsData = useCallback(async () => {
    try {
      const items = await barApi.getKdsItems(kdsStation, activeClubId);
      setKdsItems(items || []);
    } catch (err) {
      console.error('Failed to load KDS items:', err);
    }
  }, [kdsStation, activeClubId]);

  useEffect(() => {
    if (activeTab === 'kds') {
      loadKdsData();
      const interval = setInterval(loadKdsData, 10000); // Polling every 10s for kitchen
      return () => clearInterval(interval);
    }
  }, [activeTab, loadKdsData]);

  // Load Member Tabs when tabs view active
  const loadTabsData = useCallback(async () => {
    try {
      const tabs = await barApi.getTabs('open', activeClubId);
      setMemberTabs(tabs || []);
    } catch (err) {
      console.error('Failed to load member tabs:', err);
    }
  }, [activeClubId]);

  useEffect(() => {
    if (activeTab === 'tabs') {
      loadTabsData();
    }
  }, [activeTab, loadTabsData]);

  // Load Daily Closing when active
  const loadDailyClosing = useCallback(async () => {
    try {
      const closing = await barApi.getDailyClosing(null, activeClubId);
      setDailyClosing(closing);
    } catch (err) {
      console.error('Failed to load daily closing:', err);
    }
  }, [activeClubId]);

  useEffect(() => {
    if (activeTab === 'closing') {
      loadDailyClosing();
    }
  }, [activeTab, loadDailyClosing]);

  // Search Members for Member Plan Discount
  useEffect(() => {
    const query = memberSearchQuery.trim();
    if (!query) {
      setMemberSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingMember(true);
      try {
        const res = await membersApi.searchMembers(query);
        setMemberSearchResults(res?.data || res || []);
      } catch (err) {
        console.error('Member search error:', err);
      } finally {
        setSearchingMember(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [memberSearchQuery]);

  // Filtered Menu Items
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory =
        activeCategory === 'all' || item.category_id === activeCategory;
      const matchesSearch =
        !itemSearchQuery.trim() ||
        item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
        (item.description &&
          item.description.toLowerCase().includes(itemSearchQuery.toLowerCase()));
      const matchesVeg = !vegOnly || item.is_veg === true;
      return matchesCategory && matchesSearch && matchesVeg && item.is_available;
    });
  }, [menuItems, activeCategory, itemSearchQuery, vegOnly]);

  // Calculate Order Totals
  const discountRate = useMemo(() => {
    // If selected member has active plan with bar discount
    if (selectedMember?.plan_bar_discount) {
      return Number(selectedMember.plan_bar_discount) / 100;
    }
    // Default tier heuristic if present: Gold Pro Pass = 15%, Standard = 10%
    if (selectedMember?.plan_name?.toLowerCase().includes('gold')) {
      return 0.15;
    }
    if (selectedMember?.plan_name?.toLowerCase().includes('standard')) {
      return 0.1;
    }
    return 0;
  }, [selectedMember]);

  const { subtotal, discountTotal, taxTotal, grandTotal } = useMemo(() => {
    let sub = 0;
    cart.forEach((item) => {
      sub += Number(item.menuItem.price || 0) * item.quantity;
    });
    const disc = sub * discountRate;
    const taxable = sub - disc;
    const tax = taxable * 0.05; // 5% GST
    const tot = taxable + tax;
    return {
      subtotal: sub,
      discountTotal: disc,
      taxTotal: tax,
      grandTotal: tot,
    };
  }, [cart, discountRate]);

  // Cart Actions
  const addToCart = (menuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItem.id === menuItem.id);
      if (existing) {
        return prev.map((i) =>
          i.menuItem.id === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { menuItem, quantity: 1, notes: '' }];
    });
  };

  const updateQuantity = (itemId, delta) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.menuItem.id === itemId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean)
    );
  };

  const updateItemNotes = (itemId, notes) => {
    setCart((prev) =>
      prev.map((i) => (i.menuItem.id === itemId ? { ...i, notes } : i))
    );
  };

  const removeFromCart = (itemId) => {
    setCart((prev) => prev.filter((i) => i.menuItem.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedTable(null);
    setSelectedMember(null);
    setGuestName('');
    setMemberSearchQuery('');
  };

  // Select Table from Floor Plan
  const handleSelectTable = (table) => {
    setSelectedTable(table);
    setActiveTab('terminal');
    if (table.active_order_id) {
      showNotification(`Table ${table.name} has an active order (₹${table.active_order_total})`, 'info');
    }
  };

  // Submit Order to Kitchen (KDS)
  const handleSendToKitchen = async () => {
    if (cart.length === 0) {
      showNotification('Please add items to cart before sending to kitchen', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const orderPayload = {
        table_id: selectedTable?.id || null,
        member_id: selectedMember?.id || null,
        guest_name: guestName || (selectedMember ? selectedMember.full_name : 'Counter Guest'),
        notes: `Terminal order ${selectedTable ? 'Table ' + selectedTable.name : 'Counter'}`,
        items: cart.map((i) => ({
          menu_item_id: i.menuItem.id,
          quantity: i.quantity,
          notes: i.notes || null,
        })),
      };

      const res = await barApi.createOrder(orderPayload, activeClubId);
      showNotification(`Order ${res.order_no || ''} sent to kitchen successfully!`, 'success');
      clearCart();
      loadPOSData();
    } catch (err) {
      console.error('Failed to send order to kitchen:', err);
      showNotification(err.customMessage || 'Failed to place order', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Pay Order via Razorpay or Cash/Card/Tab
  const handleExecutePayment = async () => {
    if (cart.length === 0) return;
    setActionLoading(true);

    try {
      // 1. Create order in DB first
      const orderPayload = {
        table_id: selectedTable?.id || null,
        member_id: selectedMember?.id || null,
        guest_name: guestName || (selectedMember ? selectedMember.full_name : 'Counter Guest'),
        charge_to_tab: checkoutMethod === 'tab',
        notes: `Terminal checkout: ${checkoutMethod.toUpperCase()}`,
        items: cart.map((i) => ({
          menu_item_id: i.menuItem.id,
          quantity: i.quantity,
          notes: i.notes || null,
        })),
      };

      const createdOrder = await barApi.createOrder(orderPayload, activeClubId);

      // If method is Razorpay:
      if (checkoutMethod === 'razorpay') {
        const rzpOrder = await barApi.createRazorpayOrder(
          { order_id: createdOrder.id, amount: grandTotal },
          activeClubId
        );

        setIsCheckoutOpen(false);

        // Open Razorpay Popup
        await openRazorpayCheckout({
          orderId: rzpOrder.orderId,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency,
          name: 'Sports Club Cafe & Bar',
          description: `Order ${createdOrder.order_no} - ₹${grandTotal.toFixed(2)}`,
          prefill: {
            name: selectedMember?.full_name || guestName || user?.full_name,
            email: selectedMember?.email || user?.email,
            phone: selectedMember?.phone || user?.phone,
          },
          onSuccess: async (rzpResponse) => {
            try {
              const verifyRes = await barApi.verifyRazorpayPayment(
                {
                  razorpay_order_id: rzpResponse.razorpay_order_id,
                  razorpay_payment_id: rzpResponse.razorpay_payment_id,
                  razorpay_signature: rzpResponse.razorpay_signature,
                  order_id: createdOrder.id,
                },
                activeClubId
              );
              setPaymentSuccessData({
                orderNo: createdOrder.order_no,
                amount: grandTotal,
                method: 'Razorpay Online',
                reference: rzpResponse.razorpay_payment_id,
              });
              clearCart();
              loadPOSData();
              showNotification('Razorpay payment verified & order completed!', 'success');
            } catch (vErr) {
              console.error('Signature verification error:', vErr);
              showNotification('Payment verification failed on server', 'error');
            }
          },
          onDismiss: () => {
            showNotification('Razorpay checkout window closed', 'info');
          },
        });
      } else if (checkoutMethod === 'cash') {
        const cashAmt = Number(cashTendered) || grandTotal;
        const change = cashAmt - grandTotal;
        await barApi.payOrder(
          createdOrder.id,
          {
            method: 'cash',
            notes: `Cash tendered: ₹${cashAmt.toFixed(2)}, Change given: ₹${Math.max(0, change).toFixed(2)}`,
          },
          activeClubId
        );

        setPaymentSuccessData({
          orderNo: createdOrder.order_no,
          amount: grandTotal,
          method: 'Cash Payment',
          change: Math.max(0, change),
        });
        setIsCheckoutOpen(false);
        clearCart();
        loadPOSData();
      } else if (checkoutMethod === 'card') {
        await barApi.payOrder(
          createdOrder.id,
          {
            method: 'card',
            notes: 'Card Swipe / Terminal POS',
          },
          activeClubId
        );

        setPaymentSuccessData({
          orderNo: createdOrder.order_no,
          amount: grandTotal,
          method: 'Card Payment',
        });
        setIsCheckoutOpen(false);
        clearCart();
        loadPOSData();
      } else if (checkoutMethod === 'tab') {
        // Charged to tab
        setPaymentSuccessData({
          orderNo: createdOrder.order_no,
          amount: grandTotal,
          method: 'Member Tab Account',
          member: selectedMember?.full_name || 'Member',
        });
        setIsCheckoutOpen(false);
        clearCart();
        loadPOSData();
        showNotification('Order charged to member tab successfully', 'success');
      }
    } catch (err) {
      console.error('Payment checkout failed:', err);
      showNotification(err.customMessage || 'Payment checkout failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // KDS Status Advancer (New -> Preparing -> Ready -> Served)
  const handleAdvanceKdsStatus = async (item) => {
    let nextStatus = 'preparing';
    if (item.kds_status === 'new') nextStatus = 'preparing';
    else if (item.kds_status === 'preparing') nextStatus = 'ready';
    else if (item.kds_status === 'ready') nextStatus = 'served';

    try {
      await barApi.updateKdsItemStatus(item.id, nextStatus, activeClubId);
      loadKdsData();
      showNotification(`Item marked as ${nextStatus}`, 'success');
    } catch (err) {
      console.error('KDS status update failed:', err);
      showNotification('Failed to update kitchen status', 'error');
    }
  };

  // Settle Member Tab
  const handleSettleTab = async () => {
    if (!settlingTab) return;
    setActionLoading(true);
    try {
      const balance = Number(settlingTab.balance || 0);

      if (tabPaymentMethod === 'razorpay') {
        const rzpOrder = await barApi.createRazorpayOrder(
          { amount: balance },
          activeClubId
        );

        await openRazorpayCheckout({
          orderId: rzpOrder.orderId,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency,
          name: 'Sports Club Tab Settlement',
          description: `Settle Tab for ${settlingTab.member_name} - ₹${balance.toFixed(2)}`,
          prefill: {
            name: settlingTab.member_name,
            phone: settlingTab.member_phone,
          },
          onSuccess: async (rzpResponse) => {
            await barApi.settleTab(
              settlingTab.id,
              {
                method: 'online',
                reference: rzpResponse.razorpay_payment_id,
              },
              activeClubId
            );
            setSettlingTab(null);
            loadTabsData();
            showNotification('Member tab settled via Razorpay!', 'success');
          },
        });
      } else {
        await barApi.settleTab(
          settlingTab.id,
          {
            method: tabPaymentMethod,
          },
          activeClubId
        );
        setSettlingTab(null);
        loadTabsData();
        showNotification(`Tab settled via ${tabPaymentMethod}!`, 'success');
      }
    } catch (err) {
      console.error('Tab settlement error:', err);
      showNotification(err.customMessage || 'Failed to settle tab', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FAF9F6', display: 'flex', flexDirection: 'column' }}>
      {/* ─── Top Brand Header ─── */}
      <header
        style={{
          background: '#1F5C46',
          color: '#FAF9F6',
          padding: '0.85rem 1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Coffee size={22} color="#FAF9F6" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
              Bar & Cafe POS
            </h1>
            <span style={{ fontSize: '0.75rem', opacity: 0.85, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981' }} />
              Live Terminal • Court & Ledger System
            </span>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(0, 0, 0, 0.22)',
            borderRadius: '8px',
            padding: '0.25rem',
            gap: '0.25rem',
          }}
        >
          {[
            { id: 'terminal', label: 'Order Terminal', icon: ShoppingBag },
            { id: 'tables', label: 'Floor Plan', icon: Grid },
            { id: 'kds', label: 'Kitchen KDS', icon: ChefHat },
            { id: 'tabs', label: 'Member Tabs', icon: Wallet },
            { id: 'closing', label: 'Daily Closing', icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: isActive ? '#FAF9F6' : 'transparent',
                  color: isActive ? '#1F5C46' : '#FAF9F6',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
                {tab.id === 'kds' && kdsItems.length > 0 && (
                  <span
                    style={{
                      background: isActive ? '#EF4444' : '#FFFFFF',
                      color: isActive ? '#FFFFFF' : '#1F5C46',
                      borderRadius: '10px',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      padding: '0.1rem 0.4rem',
                    }}
                  >
                    {kdsItems.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={loadPOSData}
            title="Refresh POS Data"
            disabled={refreshing}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '6px',
              padding: '0.5rem',
              color: '#FAF9F6',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <div style={{ textAlign: 'right', fontSize: '0.75rem', opacity: 0.9 }}>
            <div style={{ fontWeight: 600 }}>{user?.full_name || 'Staff User'}</div>
            <div style={{ opacity: 0.75 }}>{user?.role || 'Staff'}</div>
          </div>
        </div>
      </header>

      {/* Notification Toast */}
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
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          {notification.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* ─── TAB 1: ORDER TERMINAL ─── */}
      {activeTab === 'terminal' && (
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 390px',
            height: 'calc(100vh - 65px)',
            overflow: 'hidden',
          }}
        >
          {/* Menu Catalog (Left Column) */}
          <div
            style={{
              padding: '1.25rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            {/* Search and Filters Bar */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  background: '#FFFFFF',
                  border: '1px solid #E7E5DF',
                  borderRadius: '8px',
                  padding: '0.45rem 0.85rem',
                  gap: '0.5rem',
                }}
              >
                <Search size={16} color="#6B6B66" />
                <input
                  type="text"
                  placeholder="Search coffee, drinks, bowls, pizzas..."
                  value={itemSearchQuery}
                  onChange={(e) => setItemSearchQuery(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    width: '100%',
                    fontSize: '0.875rem',
                    background: 'transparent',
                    color: '#1A1A18',
                  }}
                />
                {itemSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setItemSearchQuery('')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B6B66' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Veg Only Switch */}
              <button
                type="button"
                onClick={() => setVegOnly(!vegOnly)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  border: vegOnly ? '1px solid #10B981' : '1px solid #E7E5DF',
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
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                overflowX: 'auto',
                paddingBottom: '0.25rem',
              }}
            >
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
                All Menu ({menuItems.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    padding: '0.45rem 1rem',
                    borderRadius: '20px',
                    border: '1px solid',
                    borderColor: activeCategory === cat.id ? '#1F5C46' : '#E7E5DF',
                    background: activeCategory === cat.id ? '#1F5C46' : '#FFFFFF',
                    color: activeCategory === cat.id ? '#FAF9F6' : '#1A1A18',
                    fontWeight: activeCategory === cat.id ? 700 : 500,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Menu Items Grid */}
            {filteredMenuItems.length === 0 ? (
              <div
                style={{
                  padding: '4rem 2rem',
                  textAlign: 'center',
                  background: '#FFFFFF',
                  border: '1px solid #E7E5DF',
                  borderRadius: '10px',
                  color: '#6B6B66',
                }}
              >
                <Utensils size={36} color="#A8A29E" style={{ margin: '0 auto 0.5rem' }} />
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>No menu items match your filter</div>
                <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Try clearing the search or category</div>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                  gap: '0.9rem',
                }}
              >
                {filteredMenuItems.map((item) => {
                  const cartItem = cart.find((c) => c.menuItem.id === item.id);
                  const isVeg = item.is_veg !== false;
                  return (
                    <div
                      key={item.id}
                      onClick={() => addToCart(item)}
                      style={{
                        background: '#FFFFFF',
                        border: cartItem ? '1.5px solid #1F5C46' : '1px solid #E7E5DF',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                        position: 'relative',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      {/* Image / Header Thumbnail */}
                      <div
                        style={{
                          height: '110px',
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
                          <div
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: isVeg ? '#10B981' : '#EF4444',
                            }}
                          />
                        </div>

                        {/* Prep time badge */}
                        <div
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: 'rgba(26,26,24,0.75)',
                            backdropFilter: 'blur(4px)',
                            color: '#FFFFFF',
                            borderRadius: '12px',
                            padding: '0.15rem 0.45rem',
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                          }}
                        >
                          <Clock size={10} />
                          <span>{item.prep_minutes || 5}m</span>
                        </div>

                        {/* Cart quantity badge */}
                        {cartItem && (
                          <div
                            style={{
                              position: 'absolute',
                              bottom: '8px',
                              right: '8px',
                              background: '#1F5C46',
                              color: '#FFFFFF',
                              borderRadius: '12px',
                              padding: '0.2rem 0.55rem',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                            }}
                          >
                            × {cartItem.quantity}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div
                        style={{
                          padding: '0.75rem 0.85rem',
                          display: 'flex',
                          flexDirection: 'column',
                          flex: 1,
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1A1A18', lineHeight: 1.25 }}>
                            {item.name}
                          </div>
                          {item.description && (
                            <div
                              style={{
                                fontSize: '0.72rem',
                                color: '#6B6B66',
                                marginTop: '0.25rem',
                                lineHeight: 1.3,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {item.description}
                            </div>
                          )}
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '0.75rem',
                            paddingTop: '0.5rem',
                            borderTop: '1px solid #F4F2EC',
                          }}
                        >
                          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1F5C46' }}>
                            ₹{Number(item.price).toLocaleString()}
                          </span>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: '#1F5C46',
                              background: '#EBF3F0',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '4px',
                            }}
                          >
                            + Add
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Order Ticket (Right Sidebar) */}
          <div
            style={{
              background: '#FFFFFF',
              borderLeft: '1px solid #E7E5DF',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
            }}
          >
            {/* Header: Table and Member assignment */}
            <div
              style={{
                padding: '1rem',
                borderBottom: '1px solid #E7E5DF',
                background: '#FAF9F6',
              }}
            >
              {/* Table Selector Pill */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: selectedTable ? '#1F5C46' : '#6B6B66',
                      background: selectedTable ? '#EBF3F0' : '#E7E5DF',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '4px',
                    }}
                  >
                    {selectedTable ? `Table ${selectedTable.name} (${selectedTable.zone || 'Dining'})` : 'Counter / Takeaway'}
                  </span>
                  {selectedTable && (
                    <button
                      type="button"
                      onClick={() => setSelectedTable(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B6B66' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('tables')}
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#1F5C46',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Choose Table →
                </button>
              </div>

              {/* Member Search / Identity Bar */}
              <div style={{ position: 'relative' }}>
                {selectedMember ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#EBF3F0',
                      border: '1px solid #B8D8CC',
                      borderRadius: '6px',
                      padding: '0.45rem 0.65rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Users size={15} color="#1F5C46" />
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1F5C46' }}>
                          {selectedMember.full_name} ({selectedMember.member_code})
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#047857' }}>
                          {discountRate > 0
                            ? `Tier Discount: ${(discountRate * 100).toFixed(0)}% OFF on Bar & Cafe`
                            : 'Member Account Connected'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedMember(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1F5C46' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: '#FFFFFF',
                        border: '1px solid #E7E5DF',
                        borderRadius: '6px',
                        padding: '0.4rem 0.6rem',
                        gap: '0.4rem',
                      }}
                    >
                      <Search size={14} color="#6B6B66" />
                      <input
                        type="text"
                        placeholder="Search member name or phone..."
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                        style={{
                          border: 'none',
                          outline: 'none',
                          width: '100%',
                          fontSize: '0.78rem',
                          color: '#1A1A18',
                        }}
                      />
                      {searchingMember && <span style={{ fontSize: '0.7rem', color: '#6B6B66' }}>Searching...</span>}
                    </div>

                    {/* Member Dropdown Results */}
                    {memberSearchResults.length > 0 && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          zIndex: 50,
                          background: '#FFFFFF',
                          border: '1px solid #E7E5DF',
                          borderRadius: '6px',
                          marginTop: '4px',
                          boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                          maxHeight: '180px',
                          overflowY: 'auto',
                        }}
                      >
                        {memberSearchResults.map((m) => (
                          <div
                            key={m.id}
                            onClick={() => {
                              setSelectedMember(m);
                              setMemberSearchQuery('');
                              setMemberSearchResults([]);
                            }}
                            style={{
                              padding: '0.5rem 0.75rem',
                              borderBottom: '1px solid #F4F2EC',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#FAF9F6')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
                          >
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1A1A18' }}>
                                {m.full_name}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#6B6B66' }}>
                                {m.member_code} • {m.phone || 'No phone'}
                              </div>
                            </div>
                            <span style={{ fontSize: '0.7rem', color: '#1F5C46', fontWeight: 700 }}>Select</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Cart Items List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
              {cart.length === 0 ? (
                <div
                  style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#A8A29E',
                    textAlign: 'center',
                    padding: '2rem',
                  }}
                >
                  <ShoppingBag size={40} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#6B6B66' }}>Order is empty</div>
                  <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    Tap items on the left to add to order ticket.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {cart.map((item) => {
                    const lineSub = Number(item.menuItem.price || 0) * item.quantity;
                    return (
                      <div
                        key={item.menuItem.id}
                        style={{
                          background: '#FAF9F6',
                          border: '1px solid #E7E5DF',
                          borderRadius: '8px',
                          padding: '0.65rem 0.75rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1A1A18' }}>
                              {item.menuItem.name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#6B6B66' }}>
                              ₹{Number(item.menuItem.price).toLocaleString()} each
                            </div>
                          </div>
                          <div style={{ fontWeight: 800, fontSize: '0.875rem', color: '#1A1A18' }}>
                            ₹{lineSub.toLocaleString()}
                          </div>
                        </div>

                        {/* Quantity Stepper & Notes */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: '0.5rem',
                            paddingTop: '0.45rem',
                            borderTop: '1px dashed #E7E5DF',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.menuItem.id, -1)}
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '4px',
                                border: '1px solid #E7E5DF',
                                background: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                            >
                              <Minus size={12} color="#1A1A18" />
                            </button>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, minWidth: '20px', textAlign: 'center' }}>
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.menuItem.id, 1)}
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '4px',
                                border: '1px solid #E7E5DF',
                                background: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                            >
                              <Plus size={12} color="#1A1A18" />
                            </button>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                              type="text"
                              placeholder="Notes (e.g. less ice)..."
                              value={item.notes}
                              onChange={(e) => updateItemNotes(item.menuItem.id, e.target.value)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                fontSize: '0.72rem',
                                color: '#6B6B66',
                                width: '130px',
                                outline: 'none',
                                borderBottom: '1px dotted #A8A29E',
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.menuItem.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#EF4444',
                                cursor: 'pointer',
                                padding: '2px',
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Financial Summary & Action Buttons */}
            {cart.length > 0 && (
              <div
                style={{
                  padding: '1rem',
                  borderTop: '1px solid #E7E5DF',
                  background: '#FFFFFF',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#6B6B66' }}>
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>

                  {discountTotal > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.8rem',
                        color: '#047857',
                        fontWeight: 600,
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Percent size={12} />
                        <span>Member Plan Discount ({(discountRate * 100).toFixed(0)}%)</span>
                      </span>
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
                      paddingTop: '0.5rem',
                      borderTop: '1px solid #E7E5DF',
                      marginTop: '0.25rem',
                    }}
                  >
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1A1A18' }}>Total Payable</span>
                    <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#1F5C46' }}>
                      ₹{grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Primary Actions */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={handleSendToKitchen}
                    disabled={actionLoading}
                    style={{
                      flex: 1,
                      padding: '0.65rem 0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #1F5C46',
                      background: '#FFFFFF',
                      color: '#1F5C46',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <ChefHat size={15} />
                    <span>Send to KDS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCheckoutOpen(true)}
                    disabled={actionLoading}
                    style={{
                      flex: 1.5,
                      padding: '0.65rem 0.5rem',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#1F5C46',
                      color: '#FAF9F6',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      boxShadow: '0 4px 12px rgba(31, 92, 70, 0.25)',
                    }}
                  >
                    <Receipt size={16} />
                    <span>Pay & Settle</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: FLOOR PLAN & TABLES ─── */}
      {activeTab === 'tables' && (
        <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A1A18', margin: 0 }}>
                Dining Tables & Zones
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#6B6B66' }}>
                Live visual map of all tables, seating capacity, and ongoing customer tickets.
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#10B981' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
                Available ({tables.filter((t) => t.status === 'available').length})
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#F59E0B' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B' }} />
                Occupied ({tables.filter((t) => t.status === 'occupied').length})
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#6366F1' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366F1' }} />
                Billed ({tables.filter((t) => t.status === 'billed').length})
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '1rem',
            }}
          >
            {tables.map((table) => {
              const isAvail = table.status === 'available';
              const isOccupied = table.status === 'occupied';
              const isBilled = table.status === 'billed';

              let statusColor = '#10B981';
              let statusBg = '#EBFDF5';
              if (isOccupied) {
                statusColor = '#F59E0B';
                statusBg = '#FEF3C7';
              } else if (isBilled) {
                statusColor = '#6366F1';
                statusBg = '#EEF2FF';
              }

              return (
                <div
                  key={table.id}
                  onClick={() => handleSelectTable(table)}
                  style={{
                    background: '#FFFFFF',
                    border: '1.5px solid',
                    borderColor: statusColor,
                    borderRadius: '10px',
                    padding: '1.25rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1A1A18' }}>
                        {table.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6B6B66', marginTop: '0.15rem' }}>
                        {table.zone || 'Main Dining'} • {table.capacity} Seats
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
                        textTransform: 'uppercase',
                      }}
                    >
                      {table.status}
                    </span>
                  </div>

                  {table.active_order_id ? (
                    <div
                      style={{
                        marginTop: '1rem',
                        padding: '0.65rem',
                        background: '#FAF9F6',
                        borderRadius: '6px',
                        border: '1px solid #E7E5DF',
                        fontSize: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6B6B66' }}>
                        <span>Order #{table.active_order_no}</span>
                        <span>{table.active_items_count} items</span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginTop: '0.35rem',
                          fontWeight: 700,
                          color: '#1A1A18',
                        }}
                      >
                        <span>{table.active_member_name || table.active_guest_name || 'Guest'}</span>
                        <span style={{ color: '#1F5C46', fontWeight: 800 }}>
                          ₹{Number(table.active_order_total || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        marginTop: '1.25rem',
                        fontSize: '0.75rem',
                        color: '#10B981',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <span>Ready for guests • Click to open order</span>
                      <ArrowRight size={13} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TAB 3: KITCHEN DISPLAY SCREEN (KDS) ─── */}
      {activeTab === 'kds' && (
        <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A1A18', margin: 0 }}>
                Kitchen Display Screen (KDS)
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#6B6B66' }}>
                Live cooking & drink orders for kitchen chefs and baristas.
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[
                { id: null, label: 'All Stations' },
                { id: 'kitchen', label: 'Kitchen Cook' },
                { id: 'bar', label: 'Bar & Shakes' },
              ].map((st) => (
                <button
                  key={String(st.id)}
                  type="button"
                  onClick={() => setKdsStation(st.id)}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: kdsStation === st.id ? '#1F5C46' : '#E7E5DF',
                    background: kdsStation === st.id ? '#1F5C46' : '#FFFFFF',
                    color: kdsStation === st.id ? '#FAF9F6' : '#1A1A18',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {kdsItems.length === 0 ? (
            <div
              style={{
                padding: '4rem 2rem',
                textAlign: 'center',
                background: '#FFFFFF',
                border: '1px solid #E7E5DF',
                borderRadius: '10px',
                color: '#6B6B66',
              }}
            >
              <CheckCircle2 size={40} color="#10B981" style={{ margin: '0 auto 0.5rem' }} />
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1A1A18' }}>All tickets cleared!</div>
              <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                No active food or beverage tickets pending preparation.
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                gap: '1rem',
              }}
            >
              {kdsItems.map((item) => {
                const elapsedMin = Math.floor(
                  (new Date() - new Date(item.created_at)) / (1000 * 60)
                );
                const isLate = elapsedMin >= 15;

                return (
                  <div
                    key={item.id}
                    style={{
                      background: '#FFFFFF',
                      border: isLate ? '2px solid #EF4444' : '1px solid #E7E5DF',
                      borderRadius: '10px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.5rem',
                        }}
                      >
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1F5C46' }}>
                          {item.order_no} • {item.table_name ? `Table ${item.table_name}` : 'Counter'}
                        </span>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            background: isLate ? '#FEF2F2' : '#F4F2EC',
                            color: isLate ? '#DC2626' : '#6B6B66',
                          }}
                        >
                          ⏱ {elapsedMin}m ago
                        </span>
                      </div>

                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1A1A18', marginTop: '0.4rem' }}>
                        {item.quantity} × {item.item_name}
                      </div>

                      {item.notes && (
                        <div
                          style={{
                            marginTop: '0.4rem',
                            fontSize: '0.78rem',
                            color: '#D97706',
                            background: '#FFFBEB',
                            padding: '0.35rem 0.6rem',
                            borderRadius: '4px',
                            fontWeight: 600,
                          }}
                        >
                          Note: {item.notes}
                        </div>
                      )}

                      <div style={{ fontSize: '0.72rem', color: '#6B6B66', marginTop: '0.5rem' }}>
                        Station: <strong style={{ textTransform: 'capitalize' }}>{item.station}</strong> • Guest:{' '}
                        {item.member_name || item.guest_name || 'Walk-in'}
                      </div>
                    </div>

                    <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #F4F2EC' }}>
                      <button
                        type="button"
                        onClick={() => handleAdvanceKdsStatus(item)}
                        style={{
                          width: '100%',
                          padding: '0.55rem',
                          borderRadius: '6px',
                          border: 'none',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          background:
                            item.kds_status === 'new'
                              ? '#F59E0B'
                              : item.kds_status === 'preparing'
                              ? '#1F5C46'
                              : '#10B981',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <CheckCircle2 size={15} />
                        <span>
                          {item.kds_status === 'new' && 'Start Preparing'}
                          {item.kds_status === 'preparing' && 'Mark Ready'}
                          {item.kds_status === 'ready' && 'Mark Served'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 4: MEMBER TABS ─── */}
      {activeTab === 'tabs' && (
        <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A1A18', margin: 0 }}>
              Member Bar & Cafe Tabs
            </h2>
            <span style={{ fontSize: '0.8rem', color: '#6B6B66' }}>
              Accumulated dining tabs settled before members exit the club.
            </span>
          </div>

          {memberTabs.length === 0 ? (
            <div
              style={{
                padding: '4rem 2rem',
                textAlign: 'center',
                background: '#FFFFFF',
                border: '1px solid #E7E5DF',
                borderRadius: '10px',
                color: '#6B6B66',
              }}
            >
              <Wallet size={40} color="#A8A29E" style={{ margin: '0 auto 0.5rem' }} />
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1A1A18' }}>No open member tabs</div>
              <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                All member tabs are settled or no orders are currently charged to tabs.
              </div>
            </div>
          ) : (
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E7E5DF',
                borderRadius: '10px',
                overflow: 'hidden',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#FAF9F6', borderBottom: '1px solid #E7E5DF', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem 1rem', color: '#6B6B66', fontWeight: 700 }}>Member</th>
                    <th style={{ padding: '0.75rem 1rem', color: '#6B6B66', fontWeight: 700 }}>Phone</th>
                    <th style={{ padding: '0.75rem 1rem', color: '#6B6B66', fontWeight: 700 }}>Orders Count</th>
                    <th style={{ padding: '0.75rem 1rem', color: '#6B6B66', fontWeight: 700 }}>Opened At</th>
                    <th style={{ padding: '0.75rem 1rem', color: '#6B6B66', fontWeight: 700 }}>Outstanding Balance</th>
                    <th style={{ padding: '0.75rem 1rem', color: '#6B6B66', fontWeight: 700, textAlign: 'right' }}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {memberTabs.map((tab) => (
                    <tr key={tab.id} style={{ borderBottom: '1px solid #F4F2EC' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#1A1A18' }}>
                        {tab.member_name || tab.guest_name || 'Guest'}
                        <span style={{ display: 'block', fontSize: '0.72rem', color: '#6B6B66', fontWeight: 500 }}>
                          Code: {tab.member_code || 'N/A'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#6B6B66' }}>{tab.member_phone || '—'}</td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{tab.orders_count}</td>
                      <td style={{ padding: '0.85rem 1rem', color: '#6B6B66' }}>
                        {new Date(tab.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 900, color: '#1F5C46', fontSize: '0.95rem' }}>
                        ₹{Number(tab.balance || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => setSettlingTab(tab)}
                          style={{
                            padding: '0.4rem 0.85rem',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#1F5C46',
                            color: '#FFFFFF',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Settle Tab
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 5: DAILY CLOSING REPORT ─── */}
      {activeTab === 'closing' && (
        <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A1A18', margin: 0 }}>
                End-of-Day Bar & Cafe Closing Report
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#6B6B66' }}>
                Financial reconciliation of today's sales, discounts, taxes, and payment gateways.
              </span>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.9rem',
                borderRadius: '6px',
                border: '1px solid #E7E5DF',
                background: '#FFFFFF',
                color: '#1A1A18',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              <Printer size={15} />
              <span>Print Closing Slip</span>
            </button>
          </div>

          {/* Metrics Overview Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            {[
              {
                label: 'Total Orders',
                val: dailyClosing?.summary?.orders || 0,
                color: '#1A1A18',
              },
              {
                label: 'Gross Sales',
                val: `₹${Number(dailyClosing?.summary?.gross || 0).toLocaleString()}`,
                color: '#1A1A18',
              },
              {
                label: 'Discounts Given',
                val: `₹${Number(dailyClosing?.summary?.discounts || 0).toLocaleString()}`,
                color: '#047857',
              },
              {
                label: 'Taxes Collected',
                val: `₹${Number(dailyClosing?.summary?.tax || 0).toLocaleString()}`,
                color: '#D97706',
              },
              {
                label: 'Net Bar Revenue',
                val: `₹${Number(dailyClosing?.summary?.net_total || 0).toLocaleString()}`,
                color: '#1F5C46',
                highlight: true,
              },
            ].map((m, idx) => (
              <div
                key={idx}
                style={{
                  background: m.highlight ? '#EBF3F0' : '#FFFFFF',
                  border: m.highlight ? '1.5px solid #1F5C46' : '1px solid #E7E5DF',
                  borderRadius: '10px',
                  padding: '1.25rem',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B6B66' }}>{m.label}</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: m.color, marginTop: '0.35rem' }}>
                  {m.val}
                </div>
              </div>
            ))}
          </div>

          {/* Payment Method Breakdown */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E7E5DF',
              borderRadius: '10px',
              padding: '1.25rem',
            }}
          >
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1A1A18', margin: '0 0 1rem' }}>
              Collection by Payment Method
            </h3>
            {dailyClosing?.payment_breakdown?.length === 0 ? (
              <div style={{ color: '#6B6B66', fontSize: '0.85rem' }}>No payments collected yet today.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {dailyClosing?.payment_breakdown?.map((p, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.65rem 0.85rem',
                      background: '#FAF9F6',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                    }}
                  >
                    <span style={{ fontWeight: 700, textTransform: 'uppercase', color: '#1A1A18' }}>
                      {p.method === 'online' ? 'Razorpay Online (UPI/Cards)' : p.method}
                    </span>
                    <div>
                      <span style={{ color: '#6B6B66', fontSize: '0.75rem', marginRight: '1rem' }}>
                        {p.count} transactions
                      </span>
                      <strong style={{ color: '#1F5C46' }}>₹{Number(p.total_amount).toLocaleString()}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── CHECKOUT / PAYMENT MODAL ─── */}
      {isCheckoutOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(26, 26, 24, 0.5)',
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
              maxWidth: '460px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                background: '#1F5C46',
                color: '#FAF9F6',
                padding: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>Settle Order Ticket</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>Total: ₹{grandTotal.toFixed(2)}</div>
              </div>
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                style={{ background: 'none', border: 'none', color: '#FAF9F6', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.25rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#6B6B66',
                  textTransform: 'uppercase',
                  marginBottom: '0.5rem',
                }}
              >
                Select Payment Mode
              </label>

              {/* Payment Methods Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                {[
                  {
                    id: 'razorpay',
                    label: 'Razorpay Online (UPI / QR / Cards / Netbanking)',
                    desc: 'Real test gateway integration with Razorpay modal',
                    icon: Sparkles,
                  },
                  {
                    id: 'cash',
                    label: 'Cash at Counter',
                    desc: 'Instant cash receipt with change calculation',
                    icon: Banknote,
                  },
                  {
                    id: 'card',
                    label: 'Card Machine / POS Terminal',
                    desc: 'Visa, Mastercard, RuPay swipe/dip',
                    icon: CreditCard,
                  },
                  {
                    id: 'tab',
                    label: 'Charge to Member Tab',
                    desc: selectedMember
                      ? `Accumulate to ${selectedMember.full_name}'s account tab`
                      : 'Requires member selection above',
                    icon: Wallet,
                    disabled: !selectedMember,
                  },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const isSel = checkoutMethod === opt.id;
                  return (
                    <label
                      key={opt.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: isSel ? '1.5px solid #1F5C46' : '1px solid #E7E5DF',
                        background: isSel ? '#EBF3F0' : '#FFFFFF',
                        cursor: opt.disabled ? 'not-allowed' : 'pointer',
                        opacity: opt.disabled ? 0.5 : 1,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="radio"
                        name="pos_method"
                        checked={isSel}
                        disabled={opt.disabled}
                        onChange={() => setCheckoutMethod(opt.id)}
                        style={{ accentColor: '#1F5C46' }}
                      />
                      <Icon size={18} color="#1F5C46" />
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1A1A18' }}>{opt.label}</div>
                        <div style={{ fontSize: '0.72rem', color: '#6B6B66' }}>{opt.desc}</div>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Cash Keypad helper if cash selected */}
              {checkoutMethod === 'cash' && (
                <div style={{ marginBottom: '1.25rem', padding: '0.75rem', background: '#FAF9F6', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B6B66', marginBottom: '0.4rem' }}>
                    Cash Received
                  </div>
                  <input
                    type="number"
                    placeholder={`Enter amount (e.g. ₹${Math.ceil(grandTotal)})`}
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #E7E5DF',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      outline: 'none',
                    }}
                  />
                  {Number(cashTendered) > grandTotal && (
                    <div style={{ marginTop: '0.45rem', fontSize: '0.8rem', color: '#047857', fontWeight: 700 }}>
                      Change to return: ₹{(Number(cashTendered) - grandTotal).toFixed(2)}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  disabled={actionLoading}
                  style={{
                    flex: 1,
                    padding: '0.65rem',
                    borderRadius: '6px',
                    border: '1px solid #E7E5DF',
                    background: '#FFFFFF',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleExecutePayment}
                  disabled={actionLoading}
                  style={{
                    flex: 1.5,
                    padding: '0.65rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#1F5C46',
                    color: '#FAF9F6',
                    fontWeight: 800,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                  }}
                >
                  {actionLoading ? 'Processing...' : `Confirm & Pay ₹${grandTotal.toFixed(2)}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── PAYMENT SUCCESS CONFIRMATION MODAL ─── */}
      {paymentSuccessData && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
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
              boxShadow: '0 16px 36px rgba(0,0,0,0.18)',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: '#EBFDF5',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <CheckCircle2 size={36} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1A1A18', margin: '0 0 0.25rem' }}>
              Order Completed!
            </h3>
            <p style={{ color: '#6B6B66', fontSize: '0.85rem', margin: '0 0 1.25rem' }}>
              Order <strong>#{paymentSuccessData.orderNo}</strong> settled successfully.
            </p>

            <div
              style={{
                background: '#FAF9F6',
                border: '1px solid #E7E5DF',
                borderRadius: '8px',
                padding: '0.85rem',
                fontSize: '0.8rem',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6B6B66' }}>Amount Paid:</span>
                <strong style={{ color: '#1F5C46' }}>₹{paymentSuccessData.amount.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6B6B66' }}>Payment Mode:</span>
                <strong style={{ color: '#1A1A18' }}>{paymentSuccessData.method}</strong>
              </div>
              {paymentSuccessData.reference && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6B6B66' }}>Gateway Ref:</span>
                  <code style={{ fontSize: '0.7rem' }}>{paymentSuccessData.reference}</code>
                </div>
              )}
              {paymentSuccessData.change > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#047857' }}>
                  <span>Cash Change:</span>
                  <strong>₹{paymentSuccessData.change.toFixed(2)}</strong>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setPaymentSuccessData(null)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '6px',
                border: 'none',
                background: '#1F5C46',
                color: '#FAF9F6',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Start Next Order
            </button>
          </div>
        </div>
      )}

      {/* ─── TAB SETTLEMENT MODAL ─── */}
      {settlingTab && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(26, 26, 24, 0.5)',
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
              maxWidth: '420px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#1A1A18' }}>
                Settle Member Tab
              </h3>
              <button
                type="button"
                onClick={() => setSettlingTab(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B6B66' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ background: '#FAF9F6', border: '1px solid #E7E5DF', borderRadius: '8px', padding: '0.85rem', marginBottom: '1rem', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: '#6B6B66' }}>Member:</span>
                <strong>{settlingTab.member_name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: '#6B6B66' }}>Orders Count:</span>
                <span>{settlingTab.orders_count}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.35rem', borderTop: '1px solid #E7E5DF', fontWeight: 800 }}>
                <span>Balance to Pay:</span>
                <span style={{ color: '#1F5C46', fontSize: '1.1rem' }}>₹{Number(settlingTab.balance).toLocaleString()}</span>
              </div>
            </div>

            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#6B6B66', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Settlement Method
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '1.25rem' }}>
              {[
                { id: 'razorpay', label: 'Razorpay Online (UPI / Cards)' },
                { id: 'cash', label: 'Cash Payment' },
                { id: 'card', label: 'Credit / Debit Card' },
              ].map(opt => (
                <label key={opt.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem',
                  border: tabPaymentMethod === opt.id ? '1.5px solid #1F5C46' : '1px solid #E7E5DF',
                  background: tabPaymentMethod === opt.id ? '#EBF3F0' : '#FFFFFF',
                  borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600
                }}>
                  <input
                    type="radio"
                    name="tabpaymethod"
                    checked={tabPaymentMethod === opt.id}
                    onChange={() => setTabPaymentMethod(opt.id)}
                    style={{ accentColor: '#1F5C46' }}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setSettlingTab(null)}
                style={{ flex: 1, padding: '0.65rem', border: '1px solid #E7E5DF', background: '#FFFFFF', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSettleTab}
                disabled={actionLoading}
                style={{ flex: 1.5, padding: '0.65rem', border: 'none', background: '#1F5C46', color: '#FFFFFF', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
              >
                {actionLoading ? 'Settling...' : 'Confirm Settlement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
