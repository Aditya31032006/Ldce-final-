import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  Coffee,
  Utensils,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  RefreshCw,
  Sparkles,
  X,
  FileText,
  Grid,
  ChefHat,
  Wallet,
  Calendar,
  Layers,
  Edit2,
  Sliders,
  DollarSign,
  Tag,
  Check,
  Save,
  ArrowRight,
  Receipt,
  Percent,
  Trash2,
} from 'lucide-react';
import barApi from '../services/bar.api.js';
import { openRazorpayCheckout } from '../../../shared/utils/razorpay.util.js';

export default function BarPOS() {
  const { user } = useSelector((state) => state.auth);
  const activeClubId = localStorage.getItem('activeClubId') || user?.club_id;

  // Active view tab: 'menu' | 'tables' | 'kds' | 'tabs' | 'closing' (No order terminal for admin!)
  const [activeTab, setActiveTab] = useState('menu');

  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Core Data
  const [tables, setTables] = useState([]);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [kdsItems, setKdsItems] = useState([]);
  const [memberTabs, setMemberTabs] = useState([]);
  const [dailyClosing, setDailyClosing] = useState(null);

  // Filter & Search states
  const [activeCategory, setActiveCategory] = useState('all');
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [selectedZone, setSelectedZone] = useState('all');
  const [kdsStation, setKdsStation] = useState(null);

  // Modals for Menu & Pricing Design
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', station: 'kitchen', sort_order: 0 });

  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    category_id: '',
    price: '',
    description: '',
    station: 'kitchen',
    is_veg: true,
    prep_minutes: 10,
    image_url: '',
  });

  const [editingItem, setEditingItem] = useState(null);

  // Modals for Table & Capacity Design
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);
  const [newTable, setNewTable] = useState({
    name: '',
    zone: 'Main Dining',
    capacity: 4,
  });

  const [editingTable, setEditingTable] = useState(null);

  // Tab Settlement Modal
  const [settlingTab, setSettlingTab] = useState(null);
  const [tabPaymentMethod, setTabPaymentMethod] = useState('razorpay');

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
      const [tablesData, menuData] = await Promise.all([
        barApi.getTables(activeClubId).catch(() => []),
        barApi.getMenu(activeClubId).catch(() => ({ categories: [], items: [] })),
      ]);

      setTables(tablesData || []);
      setCategories(menuData.categories || []);
      setMenuItems(menuData.items || []);
    } catch (err) {
      console.error('Failed to load bar/cafe operations data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeClubId]);

  const loadKdsData = useCallback(async () => {
    try {
      const items = await barApi.getKdsItems(kdsStation, activeClubId);
      setKdsItems(items || []);
    } catch (err) {
      console.error('Failed to load KDS data:', err);
    }
  }, [activeClubId, kdsStation]);

  const loadTabsData = useCallback(async () => {
    try {
      const tabs = await barApi.getTabs('open', activeClubId);
      setMemberTabs(tabs || []);
    } catch (err) {
      console.error('Failed to load member tabs:', err);
    }
  }, [activeClubId]);

  const loadDailyClosing = useCallback(async () => {
    try {
      const closing = await barApi.getDailyClosing(null, activeClubId);
      setDailyClosing(closing);
    } catch (err) {
      console.error('Failed to load closing:', err);
    }
  }, [activeClubId]);

  useEffect(() => {
    loadPOSData();
    const handleTablesUpdated = () => loadPOSData();
    window.addEventListener('tables-updated', handleTablesUpdated);
    const handleStorage = (e) => {
      if (e.key === 'ldce_tables_updated') loadPOSData();
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('tables-updated', handleTablesUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, [loadPOSData]);

  // Tab change effects
  useEffect(() => {
    if (activeTab === 'kds') {
      loadKdsData();
      const interval = setInterval(loadKdsData, 8000);
      return () => clearInterval(interval);
    }
    if (activeTab === 'tabs') {
      loadTabsData();
    }
    if (activeTab === 'closing') {
      loadDailyClosing();
    }
  }, [activeTab, loadKdsData, loadTabsData, loadDailyClosing]);

  // Filtered Menu Items
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (item.is_active === false) return false;
      const matchesCategory =
        activeCategory === 'all' || item.category_id === activeCategory;
      const matchesSearch =
        !itemSearchQuery.trim() ||
        item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
        (item.description &&
          item.description.toLowerCase().includes(itemSearchQuery.toLowerCase()));
      const matchesVeg = !vegOnly || item.is_veg === true;
      return matchesCategory && matchesSearch && matchesVeg;
    });
  }, [menuItems, activeCategory, itemSearchQuery, vegOnly]);

  // Distinct Zones
  const zones = useMemo(() => {
    const list = tables.map((t) => t.zone || 'Main Dining');
    return ['all', ...Array.from(new Set(list))];
  }, [tables]);

  // Filtered Tables
  const filteredTables = useMemo(() => {
    if (selectedZone === 'all') return tables;
    return tables.filter((t) => (t.zone || 'Main Dining') === selectedZone);
  }, [tables, selectedZone]);

  // Table Statistics
  const tableStats = useMemo(() => {
    const total = tables.length;
    const totalSeats = tables.reduce((acc, t) => acc + (Number(t.capacity) || 0), 0);
    const available = tables.filter((t) => t.status === 'available').length;
    const occupied = tables.filter((t) => t.status === 'occupied').length;
    const billed = tables.filter((t) => t.status === 'billed').length;
    const reserved = tables.filter((t) => t.status === 'reserved').length;
    return { total, totalSeats, available, occupied, billed, reserved };
  }, [tables]);

  // ─── Menu Item & Category Actions ───
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.name.trim()) {
      showNotification('Please enter a category name', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await barApi.createMenuCategory(
        {
          name: newCategory.name.trim(),
          station: newCategory.station,
          sort_order: Number(newCategory.sort_order) || 0,
        },
        activeClubId
      );
      showNotification(`Category "${newCategory.name}" created!`);
      setNewCategory({ name: '', station: 'kitchen', sort_order: 0 });
      setIsAddCategoryOpen(false);
      loadPOSData();
    } catch (err) {
      console.error(err);
      showNotification(err.customMessage || 'Failed to create category', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateMenuItem = async (e) => {
    e.preventDefault();
    if (!newItem.name.trim() || !newItem.category_id || newItem.price === '') {
      showNotification('Name, category, and price are required', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await barApi.createMenuItem(
        {
          name: newItem.name.trim(),
          category_id: newItem.category_id,
          price: Number(newItem.price),
          description: newItem.description || null,
          station: newItem.station,
          is_veg: newItem.is_veg,
          prep_minutes: Number(newItem.prep_minutes) || 10,
          image_url: newItem.image_url || null,
        },
        activeClubId
      );
      showNotification(`Item "${newItem.name}" added to menu!`);
      setNewItem({
        name: '',
        category_id: categories[0]?.id || '',
        price: '',
        description: '',
        station: 'kitchen',
        is_veg: true,
        prep_minutes: 10,
        image_url: '',
      });
      setIsAddItemOpen(false);
      loadPOSData();
    } catch (err) {
      console.error(err);
      showNotification(err.customMessage || 'Failed to create menu item', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateMenuItem = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    setActionLoading(true);
    try {
      await barApi.updateMenuItem(
        editingItem.id,
        {
          name: editingItem.name,
          price: Number(editingItem.price),
          category_id: editingItem.category_id,
          description: editingItem.description,
          is_veg: editingItem.is_veg,
          station: editingItem.station,
          prep_minutes: Number(editingItem.prep_minutes),
          image_url: editingItem.image_url,
          is_available: editingItem.is_available,
          is_active: editingItem.is_active,
        },
        activeClubId
      );
      showNotification(`"${editingItem.name}" updated successfully!`);
      setEditingItem(null);
      loadPOSData();
    } catch (err) {
      console.error(err);
      showNotification(err.customMessage || 'Failed to update menu item', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Quick toggle availability (In stock / Out of stock)
  const handleToggleItemAvailability = async (item, e) => {
    e.stopPropagation();
    try {
      const nextStatus = !item.is_available;
      await barApi.updateMenuItem(item.id, { is_available: nextStatus }, activeClubId);
      setMenuItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_available: nextStatus } : i))
      );
      showNotification(
        `${item.name} is now ${nextStatus ? 'Available' : 'Marked Out of Stock'}`
      );
    } catch (err) {
      showNotification('Failed to toggle availability', 'error');
    }
  };

  // Remove / Delete item from catalog
  const handleDeleteItem = async (item, e) => {
    if (e) e.stopPropagation();
    if (!item?.id) return;
    const confirmDelete = window.confirm(`Are you sure you want to remove "${item.name}" from the active catalog?`);
    if (!confirmDelete) return;

    setActionLoading(true);
    try {
      await barApi.deleteMenuItem(item.id, activeClubId);
      setMenuItems((prev) => prev.filter((i) => i.id !== item.id));
      if (editingItem?.id === item.id) {
        setEditingItem(null);
      }
      showNotification(`"${item.name}" removed from catalog!`);
    } catch (err) {
      console.error(err);
      showNotification(err.customMessage || 'Failed to remove menu item', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Table & Capacity Actions ───
  const handleCreateTable = async (e) => {
    e.preventDefault();
    if (!newTable.name.trim()) {
      showNotification('Table name is required', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await barApi.createTable(
        {
          name: newTable.name.trim(),
          zone: newTable.zone.trim() || 'Main Dining',
          capacity: Number(newTable.capacity) || 4,
        },
        activeClubId
      );
      showNotification(`Table "${newTable.name}" created with ${newTable.capacity} seats!`);
      setNewTable({ name: '', zone: 'Main Dining', capacity: 4 });
      setIsAddTableOpen(false);
      loadPOSData();
      window.dispatchEvent(new CustomEvent('tables-updated'));
      localStorage.setItem('ldce_tables_updated', Date.now().toString());
    } catch (err) {
      console.error(err);
      showNotification(err.customMessage || 'Failed to create table', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateTable = async (e) => {
    e.preventDefault();
    if (!editingTable) return;
    setActionLoading(true);
    try {
      await barApi.updateTable(
        editingTable.id,
        {
          name: editingTable.name,
          zone: editingTable.zone,
          capacity: Number(editingTable.capacity),
          status: editingTable.status,
          is_active: editingTable.is_active,
        },
        activeClubId
      );
      showNotification(`Table "${editingTable.name}" updated successfully!`);
      setEditingTable(null);
      loadPOSData();
      window.dispatchEvent(new CustomEvent('tables-updated'));
      localStorage.setItem('ldce_tables_updated', Date.now().toString());
    } catch (err) {
      console.error(err);
      showNotification(err.customMessage || 'Failed to update table', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Quick change table status back to available or occupied
  const handleToggleTableStatus = async (table, targetStatus = null) => {
    const nextStatus = targetStatus || (table.status === 'available' ? 'occupied' : 'available');
    setActionLoading(true);
    try {
      await barApi.updateTableStatus(table.id, nextStatus, activeClubId);
      setTables((prev) =>
        prev.map((t) =>
          t.id === table.id
            ? { ...t, status: nextStatus, active_order_id: nextStatus === 'available' ? null : t.active_order_id }
            : t
        )
      );
      showNotification(`Table "${table.name}" is now ${nextStatus === 'available' ? 'Available' : 'Occupied'}!`);
      window.dispatchEvent(new CustomEvent('tables-updated'));
      localStorage.setItem('ldce_tables_updated', Date.now().toString());
      loadPOSData();
    } catch (err) {
      console.error(err);
      showNotification(err.customMessage || 'Failed to update table status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── KDS Status Advancer ───
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

  // ─── Settle Member Tab ───
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
            loadPOSData(); // Refresh table occupancy after tab settlement
            window.dispatchEvent(new CustomEvent('tables-updated'));
            localStorage.setItem('ldce_tables_updated', Date.now().toString());
            showNotification('Member tab settled via Razorpay! Table freed.', 'success');
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
        loadPOSData(); // Refresh table occupancy after tab settlement
        window.dispatchEvent(new CustomEvent('tables-updated'));
        localStorage.setItem('ldce_tables_updated', Date.now().toString());
        showNotification(`Tab settled via ${tabPaymentMethod}! Table freed.`, 'success');
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
            <Sliders size={22} color="#FAF9F6" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
              Cafe & Bar Management
            </h1>
            <span style={{ fontSize: '0.75rem', opacity: 0.85, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981' }} />
              Menu Design • Table Capacity • Kitchen Access
            </span>
          </div>
        </div>

        {/* View Switcher Tabs (Strictly Admin / Staff: Menu, Tables, KDS, Tabs, Closing) */}
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
            { id: 'menu', label: 'Menu & Pricing', icon: Utensils },
            { id: 'tables', label: 'Tables & Capacity', icon: Grid },
            { id: 'kds', label: 'Kitchen & Bar (KDS)', icon: ChefHat },
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
            title="Refresh Data"
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
            <div style={{ fontWeight: 600 }}>{user?.full_name || 'Admin'}</div>
            <div style={{ opacity: 0.75 }}>Manager / Admin View</div>
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

      {/* ─── TAB 1: MENU & PRICING DESIGNER ─── */}
      {activeTab === 'menu' && (
        <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
          {/* Top Bar with Stats & Action Buttons */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1.25rem',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1A1A18', margin: 0 }}>
                Menu & Pricing Designer
              </h2>
              <span style={{ fontSize: '0.82rem', color: '#6B6B66' }}>
                Create categories, add menu items, adjust prices, and toggle in-stock availability.
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={() => setIsAddCategoryOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid #1F5C46',
                  background: '#FFFFFF',
                  color: '#1F5C46',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                <Plus size={16} />
                <span>Add Category</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setNewItem({
                    name: '',
                    category_id: categories[0]?.id || '',
                    price: '',
                    description: '',
                    station: 'kitchen',
                    is_veg: true,
                    prep_minutes: 10,
                    image_url: '',
                  });
                  setIsAddItemOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem 1.15rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#1F5C46',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(31, 92, 70, 0.2)',
                }}
              >
                <Plus size={16} />
                <span>Add Menu Item</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
              marginBottom: '1.25rem',
            }}
          >
            {[
              { label: 'Total Menu Items', val: menuItems.filter((i) => i.is_active !== false).length, color: '#1F5C46' },
              {
                label: 'Active Categories',
                val: categories.filter((cat) =>
                  menuItems.some((i) => i.category_id === cat.id && i.is_active !== false)
                ).length,
                color: '#2563EB',
              },
              {
                label: 'Vegetarian Items',
                val: menuItems.filter((i) => i.is_veg && i.is_active !== false).length,
                color: '#10B981',
              },
              {
                label: 'In Stock / Live',
                val: menuItems.filter((i) => i.is_available && i.is_active !== false).length,
                color: '#059669',
              },
            ].map((st, idx) => (
              <div
                key={idx}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E7E5DF',
                  borderRadius: '8px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                }}
              >
                <span style={{ fontSize: '0.75rem', color: '#6B6B66', fontWeight: 600 }}>{st.label}</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: st.color }}>{st.val}</span>
              </div>
            ))}
          </div>

          {/* Search, Pure Veg & Category Filters */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E7E5DF',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div
                style={{
                  flex: 1,
                  minWidth: '220px',
                  display: 'flex',
                  alignItems: 'center',
                  background: '#FAF9F6',
                  border: '1px solid #E7E5DF',
                  borderRadius: '6px',
                  padding: '0.45rem 0.75rem',
                  gap: '0.5rem',
                }}
              >
                <Search size={16} color="#6B6B66" />
                <input
                  type="text"
                  placeholder="Search item name, price or ingredients..."
                  value={itemSearchQuery}
                  onChange={(e) => setItemSearchQuery(e.target.value)}
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

              <button
                type="button"
                onClick={() => setVegOnly(!vegOnly)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '6px',
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
                  padding: '0.4rem 0.9rem',
                  borderRadius: '20px',
                  border: '1px solid',
                  borderColor: activeCategory === 'all' ? '#1F5C46' : '#E7E5DF',
                  background: activeCategory === 'all' ? '#1F5C46' : '#FFFFFF',
                  color: activeCategory === 'all' ? '#FAF9F6' : '#1A1A18',
                  fontWeight: activeCategory === 'all' ? 700 : 500,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                All Menu ({menuItems.filter((i) => i.is_active !== false).length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    padding: '0.4rem 0.9rem',
                    borderRadius: '20px',
                    border: '1px solid',
                    borderColor: activeCategory === cat.id ? '#1F5C46' : '#E7E5DF',
                    background: activeCategory === cat.id ? '#1F5C46' : '#FFFFFF',
                    color: activeCategory === cat.id ? '#FAF9F6' : '#1A1A18',
                    fontWeight: activeCategory === cat.id ? 700 : 500,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cat.name} ({menuItems.filter((i) => i.category_id === cat.id && i.is_active !== false).length})
                </button>
              ))}
            </div>
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
              <Utensils size={40} color="#A8A29E" style={{ margin: '0 auto 0.5rem' }} />
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1A1A18' }}>No menu items found</div>
              <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                Add your first item using the "+ Add Menu Item" button above.
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1rem',
              }}
            >
              {filteredMenuItems.map((item) => {
                const isVeg = item.is_veg !== false;
                const catName = categories.find((c) => c.id === item.category_id)?.name || 'General';

                return (
                  <div
                    key={item.id}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E7E5DF',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      opacity: item.is_active === false ? 0.6 : 1,
                    }}
                  >
                    <div>
                      {/* Image / Header bar */}
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
                            top: '10px',
                            left: '10px',
                            width: '18px',
                            height: '18px',
                            background: '#FFFFFF',
                            borderRadius: '4px',
                            border: `1.5px solid ${isVeg ? '#10B981' : '#EF4444'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: isVeg ? '#10B981' : '#EF4444',
                            }}
                          />
                        </div>

                        {/* Station badge */}
                        <div
                          style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '12px',
                            background: 'rgba(0, 0, 0, 0.65)',
                            color: '#FFFFFF',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {item.station || 'kitchen'}
                        </div>

                        {/* In-Stock status overlay if out of stock */}
                        {!item.is_available && (
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'rgba(0, 0, 0, 0.5)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#FFFFFF',
                              fontWeight: 800,
                              fontSize: '0.85rem',
                              letterSpacing: '0.05em',
                            }}
                          >
                            OUT OF STOCK
                          </div>
                        )}
                      </div>

                      {/* Item Details */}
                      <div style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <div>
                            <div style={{ fontSize: '0.72rem', color: '#6B6B66', fontWeight: 600, textTransform: 'uppercase' }}>
                              {catName}
                            </div>
                            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1A1A18', margin: '0.15rem 0' }}>
                              {item.name}
                            </h3>
                          </div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1F5C46' }}>
                            ₹{Number(item.price).toLocaleString()}
                          </div>
                        </div>

                        {item.description && (
                          <p style={{ fontSize: '0.78rem', color: '#6B6B66', margin: '0.35rem 0 0.5rem', lineHeight: 1.4 }}>
                            {item.description}
                          </p>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', fontSize: '0.72rem', color: '#6B6B66' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Clock size={13} />
                            <span>{item.prep_minutes || 10} mins prep</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Footer: Availability Toggle & Edit Button */}
                    <div
                      style={{
                        padding: '0.75rem 1rem',
                        background: '#FAF9F6',
                        borderTop: '1px solid #E7E5DF',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <button
                        type="button"
                        onClick={(e) => handleToggleItemAvailability(item, e)}
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.3rem 0.65rem',
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer',
                          background: item.is_available ? '#EBFDF5' : '#FEF2F2',
                          color: item.is_available ? '#047857' : '#DC2626',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: item.is_available ? '#10B981' : '#EF4444',
                          }}
                        />
                        <span>{item.is_available ? 'In Stock' : 'Out of Stock'}</span>
                      </button>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={() => setEditingItem({ ...item })}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#1F5C46',
                            background: '#FFFFFF',
                            border: '1px solid #B8D8CC',
                            padding: '0.35rem 0.65rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                          }}
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteItem(item, e)}
                          title="Remove item from catalog"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#DC2626',
                            background: '#FEF2F2',
                            border: '1px solid #FECACA',
                            padding: '0.35rem 0.65rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <Trash2 size={13} />
                          <span>Remove Item</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: TABLES & CAPACITY DESIGNER ─── */}
      {activeTab === 'tables' && (
        <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
          {/* Header & Add Button */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1.25rem',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1A1A18', margin: 0 }}>
                Dining Tables & Capacity Manager
              </h2>
              <span style={{ fontSize: '0.82rem', color: '#6B6B66' }}>
                Design table layout, seating capacity per table, zones, and monitor live occupancy.
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setNewTable({ name: '', zone: 'Main Dining', capacity: 4 });
                setIsAddTableOpen(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 1.15rem',
                borderRadius: '6px',
                border: 'none',
                background: '#1F5C46',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(31, 92, 70, 0.2)',
              }}
            >
              <Plus size={16} />
              <span>Add Dining Table</span>
            </button>
          </div>

          {/* Tables Capacity & Occupancy Stats */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
              marginBottom: '1.25rem',
            }}
          >
            {[
              { label: 'Total Tables', val: tableStats.total, color: '#1A1A18' },
              { label: 'Total Seating Capacity', val: `${tableStats.totalSeats} Seats`, color: '#1F5C46' },
              { label: 'Available Tables', val: tableStats.available, color: '#10B981' },
              { label: 'Occupied Tables', val: tableStats.occupied, color: '#F59E0B' },
              { label: 'Billed / Reserved', val: tableStats.billed + tableStats.reserved, color: '#6366F1' },
            ].map((st, idx) => (
              <div
                key={idx}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E7E5DF',
                  borderRadius: '8px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                }}
              >
                <span style={{ fontSize: '0.75rem', color: '#6B6B66', fontWeight: 600 }}>{st.label}</span>
                <span style={{ fontSize: '1.35rem', fontWeight: 800, color: st.color }}>{st.val}</span>
              </div>
            ))}
          </div>

          {/* Zone Filter Bar */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E7E5DF',
              borderRadius: '8px',
              padding: '0.65rem 1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              gap: '0.5rem',
              overflowX: 'auto',
            }}
          >
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
                {z === 'all' ? 'All Zones' : z} ({z === 'all' ? tables.length : tables.filter((t) => (t.zone || 'Main Dining') === z).length})
              </button>
            ))}
          </div>

          {/* Tables Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1rem',
            }}
          >
            {filteredTables.map((table) => {
              const isAvail = table.status === 'available';
              const isOccupied = table.status === 'occupied';
              const isBilled = table.status === 'billed';
              const isReserved = table.status === 'reserved';

              let statusColor = '#10B981';
              let statusBg = '#EBFDF5';
              let statusLabel = 'Available';
              if (isOccupied) {
                statusColor = '#F59E0B';
                statusBg = '#FEF3C7';
                statusLabel = 'Occupied';
              } else if (isBilled) {
                statusColor = '#6366F1';
                statusBg = '#EEF2FF';
                statusLabel = 'Billed';
              } else if (isReserved) {
                statusColor = '#2563EB';
                statusBg = '#EFF6FF';
                statusLabel = 'Reserved';
              }

              return (
                <div
                  key={table.id}
                  style={{
                    background: '#FFFFFF',
                    border: '1.5px solid',
                    borderColor: statusColor,
                    borderRadius: '10px',
                    padding: '1.25rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A1A18' }}>
                          {table.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#6B6B66', marginTop: '0.15rem' }}>
                          Zone: <strong>{table.zone || 'Main Dining'}</strong>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: statusColor,
                          background: statusBg,
                          padding: '0.25rem 0.6rem',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                        }}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    {/* Capacity Indicator */}
                    <div
                      style={{
                        marginTop: '0.85rem',
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
                        Seating Capacity: <strong>{table.capacity} Persons</strong>
                      </span>
                    </div>

                    {/* Active Order Details if Occupied */}
                    {table.active_order_id && (
                      <div
                        style={{
                          marginTop: '0.85rem',
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
                    )}
                  </div>

                  {/* Table Actions: Change status & Edit */}
                  <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #F4F2EC', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {table.status !== 'available' ? (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleToggleTableStatus(table, 'available')}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          borderRadius: '6px',
                          border: 'none',
                          background: '#059669',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          boxShadow: '0 2px 6px rgba(5,150,105,0.2)',
                        }}
                      >
                        <CheckCircle2 size={14} />
                        <span>Mark Available / Clear Table</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleToggleTableStatus(table, 'occupied')}
                        style={{
                          width: '100%',
                          padding: '0.45rem',
                          borderRadius: '6px',
                          border: '1px solid #F59E0B',
                          background: '#FEF3C7',
                          color: '#B45309',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <Users size={13} />
                        <span>Mark Occupied</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setEditingTable({ ...table })}
                      style={{
                        width: '100%',
                        padding: '0.45rem',
                        borderRadius: '6px',
                        border: '1px solid #E7E5DF',
                        background: '#FAF9F6',
                        color: '#6B6B66',
                        fontWeight: 600,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <Edit2 size={13} />
                      <span>Edit Capacity & Zone</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TAB 3: KITCHEN ACCESS & KDS ─── */}
      {activeTab === 'kds' && (
        <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1A1A18', margin: 0 }}>
                Kitchen Display Screen (KDS)
              </h2>
              <span style={{ fontSize: '0.82rem', color: '#6B6B66' }}>
                Live cooking & drink orders for kitchen chefs and bar staff.
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
                          {item.order_no} • {item.table_name ? `Table ${item.table_name}` : 'Takeaway'}
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
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1A1A18', margin: 0 }}>
              Member Bar & Cafe Tabs
            </h2>
            <span style={{ fontSize: '0.82rem', color: '#6B6B66' }}>
              Active credit accounts for club members. Settle balances via Razorpay or Cash/Card.
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
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1A1A18' }}>No Open Member Tabs</div>
              <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                All member tabs are settled or currently empty.
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '1rem',
              }}
            >
              {memberTabs.map((tab) => (
                <div
                  key={tab.id}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E7E5DF',
                    borderRadius: '10px',
                    padding: '1.25rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1A1A18' }}>
                          {tab.member_name || tab.guest_name || 'Counter Tab'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6B6B66' }}>
                          {tab.member_code ? `Code: ${tab.member_code}` : 'Guest Tab'} • {tab.orders_count || 0} Orders
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: '#047857',
                          background: '#EBFDF5',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                        }}
                      >
                        OPEN TAB
                      </span>
                    </div>

                    <div style={{ marginTop: '1.25rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#6B6B66' }}>Outstanding Balance</span>
                      <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1F5C46' }}>
                        ₹{Number(tab.balance || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #F4F2EC' }}>
                    <button
                      type="button"
                      onClick={() => setSettlingTab(tab)}
                      style={{
                        width: '100%',
                        padding: '0.6rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: '#1F5C46',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      Settle Tab (Razorpay / Cash)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 5: DAILY CLOSING ─── */}
      {activeTab === 'closing' && (
        <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1A1A18', margin: 0 }}>
              Daily Closing & Register Report
            </h2>
            <span style={{ fontSize: '0.82rem', color: '#6B6B66' }}>
              Financial reconciliation for today's cafe and bar sales.
            </span>
          </div>

          {dailyClosing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                }}
              >
                <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '8px', border: '1px solid #E7E5DF' }}>
                  <span style={{ fontSize: '0.75rem', color: '#6B6B66' }}>Total Orders Settled</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1A1A18', marginTop: '0.25rem' }}>
                    {dailyClosing.orders_count || 0}
                  </div>
                </div>

                <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '8px', border: '1px solid #E7E5DF' }}>
                  <span style={{ fontSize: '0.75rem', color: '#6B6B66' }}>Total Revenue</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1F5C46', marginTop: '0.25rem' }}>
                    ₹{Number(dailyClosing.total_sales || 0).toFixed(2)}
                  </div>
                </div>

                <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '8px', border: '1px solid #E7E5DF' }}>
                  <span style={{ fontSize: '0.75rem', color: '#6B6B66' }}>GST Collected</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2563EB', marginTop: '0.25rem' }}>
                    ₹{Number(dailyClosing.total_tax || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              {dailyClosing.by_payment_method && dailyClosing.by_payment_method.length > 0 && (
                <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '8px', border: '1px solid #E7E5DF' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 1rem', color: '#1A1A18' }}>
                    Collections by Payment Method
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {dailyClosing.by_payment_method.map((pm, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '0.65rem 0',
                          borderBottom: '1px solid #F4F2EC',
                          fontSize: '0.85rem',
                        }}
                      >
                        <span style={{ textTransform: 'capitalize', fontWeight: 600, color: '#1A1A18' }}>
                          {pm.method === 'online' ? 'Razorpay Online' : pm.method}
                        </span>
                        <span style={{ fontWeight: 800, color: '#1F5C46' }}>
                          ₹{Number(pm.total || 0).toFixed(2)} ({pm.count} txns)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL: ADD CATEGORY ─── */}
      {isAddCategoryOpen && (
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
              maxWidth: '420px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 12px 36px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#1A1A18' }}>
                Add Menu Category
              </h3>
              <button
                type="button"
                onClick={() => setIsAddCategoryOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B6B66' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1A1A18', display: 'block', marginBottom: '0.35rem' }}>
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Beverages, Snacks, Main Course, Shakes"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
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
                  Station / Preparation Area
                </label>
                <select
                  value={newCategory.station}
                  onChange={(e) => setNewCategory({ ...newCategory, station: e.target.value })}
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
                  <option value="kitchen">Kitchen Cook</option>
                  <option value="bar">Bar & Drinks</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1A1A18', display: 'block', marginBottom: '0.35rem' }}>
                  Sort Order
                </label>
                <input
                  type="number"
                  value={newCategory.sort_order}
                  onChange={(e) => setNewCategory({ ...newCategory, sort_order: e.target.value })}
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

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddCategoryOpen(false)}
                  style={{
                    flex: 1,
                    padding: '0.6rem',
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
                    padding: '0.6rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#1F5C46',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {actionLoading ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: ADD MENU ITEM & PRICE ─── */}
      {isAddItemOpen && (
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
              maxWidth: '480px',
              width: '100%',
              padding: '1.75rem',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 12px 36px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#1A1A18' }}>
                Add New Menu Item & Price
              </h3>
              <button
                type="button"
                onClick={() => setIsAddItemOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B6B66' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateMenuItem} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1A1A18', display: 'block', marginBottom: '0.35rem' }}>
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Avocado Toast, Cold Brew, Paneer Tikka"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1A1A18', display: 'block', marginBottom: '0.35rem' }}>
                    Category *
                  </label>
                  <select
                    required
                    value={newItem.category_id}
                    onChange={(e) => setNewItem({ ...newItem, category_id: e.target.value })}
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
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1A1A18', display: 'block', marginBottom: '0.35rem' }}>
                    Price (₹ INR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="e.g. 150"
                    value={newItem.price}
                    onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
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
                  Description / Ingredients
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief description of the item..."
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1A1A18', display: 'block', marginBottom: '0.35rem' }}>
                    Station
                  </label>
                  <select
                    value={newItem.station}
                    onChange={(e) => setNewItem({ ...newItem, station: e.target.value })}
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
                    <option value="kitchen">Kitchen Cook</option>
                    <option value="bar">Bar & Drinks</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1A1A18', display: 'block', marginBottom: '0.35rem' }}>
                    Prep Time (Minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newItem.prep_minutes}
                    onChange={(e) => setNewItem({ ...newItem, prep_minutes: e.target.value })}
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
                  Image URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={newItem.image_url}
                  onChange={(e) => setNewItem({ ...newItem, image_url: e.target.value })}
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

              {/* Pure Veg Checkbox */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#1A1A18',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={newItem.is_veg}
                  onChange={(e) => setNewItem({ ...newItem, is_veg: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: '#10B981' }}
                />
                <span>Pure Vegetarian</span>
              </label>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddItemOpen(false)}
                  style={{
                    flex: 1,
                    padding: '0.6rem',
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
                    padding: '0.6rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#1F5C46',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {actionLoading ? 'Saving...' : 'Add Menu Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: EDIT MENU ITEM & PRICE ─── */}
      {editingItem && (
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
              maxWidth: '480px',
              width: '100%',
              padding: '1.75rem',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 12px 36px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#1A1A18' }}>
                  Edit Item & Pricing
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#6B6B66' }}>Adjust pricing and item specifications</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B6B66' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateMenuItem} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1A1A18', display: 'block', marginBottom: '0.35rem' }}>
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1A1A18', display: 'block', marginBottom: '0.35rem' }}>
                    Category
                  </label>
                  <select
                    value={editingItem.category_id}
                    onChange={(e) => setEditingItem({ ...editingItem, category_id: e.target.value })}
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
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1A1A18', display: 'block', marginBottom: '0.35rem' }}>
                    Price (₹ INR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editingItem.price}
                    onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      border: '2px solid #1F5C46',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: '#1F5C46',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1A1A18', display: 'block', marginBottom: '0.35rem' }}>
                  Description / Ingredients
                </label>
                <textarea
                  rows={2}
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1A1A18', display: 'block', marginBottom: '0.35rem' }}>
                    Station
                  </label>
                  <select
                    value={editingItem.station || 'kitchen'}
                    onChange={(e) => setEditingItem({ ...editingItem, station: e.target.value })}
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
                    <option value="kitchen">Kitchen Cook</option>
                    <option value="bar">Bar & Drinks</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1A1A18', display: 'block', marginBottom: '0.35rem' }}>
                    Prep Minutes
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editingItem.prep_minutes || 10}
                    onChange={(e) => setEditingItem({ ...editingItem, prep_minutes: e.target.value })}
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
                  Image URL
                </label>
                <input
                  type="url"
                  value={editingItem.image_url || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, image_url: e.target.value })}
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

              {/* Toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#FAF9F6', padding: '0.75rem', borderRadius: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', fontWeight: 600, color: '#1A1A18', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editingItem.is_veg !== false}
                    onChange={(e) => setEditingItem({ ...editingItem, is_veg: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: '#10B981' }}
                  />
                  <span>Pure Vegetarian</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', fontWeight: 600, color: '#1A1A18', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editingItem.is_available !== false}
                    onChange={(e) => setEditingItem({ ...editingItem, is_available: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: '#1F5C46' }}
                  />
                  <span>In Stock / Available for Ordering</span>
                </label>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#FEF2F2',
                  border: '1px solid #FEE2E2',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '6px',
                  marginTop: '0.25rem',
                }}>
                  <div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#991B1B' }}>Catalog Presence</span>
                    <p style={{ margin: 0, fontSize: '0.74rem', color: '#B91C1C' }}>Remove this item from active catalog & update category count</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteItem(editingItem, e)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.45rem 0.85rem',
                      background: '#DC2626',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={13} />
                    <span>Remove Item</span>
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  style={{
                    flex: 1,
                    padding: '0.6rem',
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
                    padding: '0.6rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#1F5C46',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {actionLoading ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: ADD DINING TABLE & CAPACITY ─── */}
      {isAddTableOpen && (
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
              maxWidth: '420px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 12px 36px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#1A1A18' }}>
                Add Dining Table
              </h3>
              <button
                type="button"
                onClick={() => setIsAddTableOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B6B66' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTable} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1A1A18', display: 'block', marginBottom: '0.35rem' }}>
                  Table Name / Identifier *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Table 1, T12, Terrace A3, Lounge Bar 1"
                  value={newTable.name}
                  onChange={(e) => setNewTable({ ...newTable, name: e.target.value })}
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
                  Zone / Section
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Dining, Terrace, Poolside, Sports Bar, Lounge"
                  value={newTable.zone}
                  onChange={(e) => setNewTable({ ...newTable, zone: e.target.value })}
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
                  Seating Capacity (Guests) *
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  {[2, 4, 6, 8, 10].map((cap) => (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => setNewTable({ ...newTable, capacity: cap })}
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: '4px',
                        border: '1px solid',
                        borderColor: newTable.capacity === cap ? '#1F5C46' : '#E7E5DF',
                        background: newTable.capacity === cap ? '#EBF3F0' : '#FFFFFF',
                        color: newTable.capacity === cap ? '#1F5C46' : '#1A1A18',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      {cap} Seats
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={newTable.capacity}
                  onChange={(e) => setNewTable({ ...newTable, capacity: e.target.value })}
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

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddTableOpen(false)}
                  style={{
                    flex: 1,
                    padding: '0.6rem',
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
                    padding: '0.6rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#1F5C46',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {actionLoading ? 'Creating...' : 'Create Table'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: EDIT TABLE & CAPACITY ─── */}
      {editingTable && (
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
              maxWidth: '420px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 12px 36px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#1A1A18' }}>
                  Edit Table & Capacity
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#6B6B66' }}>Modify seating capacity, zone and status</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingTable(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B6B66' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateTable} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1A1A18', display: 'block', marginBottom: '0.35rem' }}>
                  Table Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingTable.name}
                  onChange={(e) => setEditingTable({ ...editingTable, name: e.target.value })}
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
                  Zone / Section
                </label>
                <input
                  type="text"
                  value={editingTable.zone || 'Main Dining'}
                  onChange={(e) => setEditingTable({ ...editingTable, zone: e.target.value })}
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
                  Seating Capacity (Guests) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={editingTable.capacity}
                  onChange={(e) => setEditingTable({ ...editingTable, capacity: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '6px',
                    border: '2px solid #1F5C46',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    color: '#1F5C46',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1A1A18', display: 'block', marginBottom: '0.35rem' }}>
                  Table Occupancy Status
                </label>
                <select
                  value={editingTable.status}
                  onChange={(e) => setEditingTable({ ...editingTable, status: e.target.value })}
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
                  <option value="available">Available (Free)</option>
                  <option value="occupied">Occupied (Dining)</option>
                  <option value="billed">Billed (Awaiting Payment)</option>
                  <option value="reserved">Reserved</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingTable(null)}
                  style={{
                    flex: 1,
                    padding: '0.6rem',
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
                    padding: '0.6rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#1F5C46',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {actionLoading ? 'Saving...' : 'Save Table'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: SETTLE TAB ─── */}
      {settlingTab && (
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
              maxWidth: '420px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 12px 36px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#1A1A18' }}>
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

            <div style={{ background: '#FAF9F6', border: '1px solid #E7E5DF', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1A1A18' }}>
                {settlingTab.member_name || settlingTab.guest_name || 'Member'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6B6B66', marginTop: '0.2rem' }}>
                Total Outstanding Balance:
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1F5C46', marginTop: '0.25rem' }}>
                ₹{Number(settlingTab.balance || 0).toFixed(2)}
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1A1A18', display: 'block', marginBottom: '0.5rem' }}>
                Payment Method
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {[
                  { id: 'razorpay', label: 'Razorpay' },
                  { id: 'cash', label: 'Cash' },
                  { id: 'card', label: 'Card' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setTabPaymentMethod(m.id)}
                    style={{
                      padding: '0.55rem',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: tabPaymentMethod === m.id ? '#1F5C46' : '#E7E5DF',
                      background: tabPaymentMethod === m.id ? '#EBF3F0' : '#FFFFFF',
                      color: tabPaymentMethod === m.id ? '#1F5C46' : '#1A1A18',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setSettlingTab(null)}
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
                type="button"
                disabled={actionLoading}
                onClick={handleSettleTab}
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
                {actionLoading ? 'Processing...' : 'Settle Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
