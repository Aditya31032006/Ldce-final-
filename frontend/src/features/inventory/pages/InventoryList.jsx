import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import useAuth from '../../auth/hook/useAuth.js';
import inventoryApi from '../services/inventory.api.js';
import ordersApi from '../../orders/services/orders.api.js';
import { useToast } from '../../../shared/context/ToastContext.jsx';
import useDebounce from '../../../shared/hooks/useDebounce.js';
import { fileToBase64 } from '../../../shared/utils/image.util.js';
import { openRazorpayCheckout } from '../../../shared/utils/razorpay.util.js';
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Edit3, 
  Trash2, 
  Filter, 
  Image as ImageIcon,
  DollarSign, 
  Layers, 
  ArrowUpDown, 
  RefreshCw, 
  ShoppingBag, 
  ShoppingCart, 
  Truck, 
  User, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  X, 
  Eye, 
  LayoutGrid, 
  List, 
  Sparkles, 
  ShieldCheck,
  ArrowLeft,
  CreditCard,
  Lock
} from 'lucide-react';

export default function InventoryList() {
  const { user, role, clubId, clubs, changeClub } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const queryClubId = searchParams.get('clubId') || searchParams.get('club');
  const effectiveClubId = queryClubId || clubId;

  const userRole = (role || '').toLowerCase();
  const isStaff = ['owner', 'shop_staff', 'manager', 'admin'].includes(userRole);

  const activeClub = clubs?.find(c => (c.club_id === effectiveClubId || c.id === effectiveClubId)) || clubs?.[0];
  const clubName = activeClub?.name || 'Current Facility';

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [stockFilter, setStockFilter] = useState('ALL'); // 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  const [viewMode, setViewMode] = useState(isStaff ? 'table' : 'grid'); // 'grid' | 'table'

  // Staff Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Customer Buy / Checkout Modal States
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buyingProduct, setBuyingProduct] = useState(null);
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [buyFulfillment, setBuyFulfillment] = useState('delivery'); // 'delivery' | 'counter'
  const [buyAddress, setBuyAddress] = useState('');
  const [buyPhone, setBuyPhone] = useState(user?.phone || '');
  const [buyName, setBuyName] = useState(user?.full_name || '');
  const [buyPaymentMethod, setBuyPaymentMethod] = useState('razorpay'); // 'razorpay' | 'counter'
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  // Form State for Adding / Editing (Staff only)
  const initialForm = {
    name: '',
    category_name: 'Equipment',
    sku: '',
    barcode: '',
    price: '',
    mrp: '',
    cost_price: '',
    stock_qty: 10,
    reorder_level: 5,
    size: '',
    color: '',
    description: '',
    image_url: '',
    is_online: true,
  };
  const [formData, setFormData] = useState(initialForm);
  const fileInputRef = useRef(null);

  const loadInventory = useCallback(async () => {
    if (!effectiveClubId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        inventoryApi.getProducts({ 
          clubId: effectiveClubId, 
          search: debouncedSearch.trim() || undefined 
        }),
        inventoryApi.getCategories({ clubId: effectiveClubId }).catch(() => ({ categories: [] }))
      ]);
      setProducts(prodRes.products || []);
      setCategories(catRes.categories || []);
    } catch (err) {
      console.error('Failed to load inventory products:', err);
      toast.error('Failed to load products for this club');
    } finally {
      setLoading(false);
    }
  }, [effectiveClubId, debouncedSearch]);

  useEffect(() => {
    if (queryClubId && queryClubId !== clubId && changeClub) {
      changeClub(queryClubId);
    }
    loadInventory();
  }, [loadInventory, effectiveClubId, queryClubId]);

  // Image Upload Handler
  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImageMime = file.type && file.type.startsWith('image/');
    const isImageExt = /\.(jpe?g|png|webp|gif|svg|bmp|avif)$/i.test(file.name || '');
    if (!isImageMime && !isImageExt) {
      toast.error('Please choose a valid image file (PNG, JPG, WebP, etc.)');
      return;
    }

    try {
      const base64 = await fileToBase64(file, 800, 800, 0.85);
      setFormData(prev => ({ ...prev, image_url: base64 }));
      toast.success('Product photo loaded successfully');
    } catch (err) {
      toast.error('Failed to read image file');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  // Open Add Product Modal (Staff only)
  const handleOpenAdd = () => {
    setFormData({
      ...initialForm,
      sku: `SKU-${Date.now().toString(36).toUpperCase()}`,
    });
    setShowAddModal(true);
  };

  // Submit Add Product (Staff only)
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Product name is required');
      return;
    }
    if (!formData.price || Number(formData.price) <= 0) {
      toast.error('Please enter a valid selling price');
      return;
    }

    setSubmitting(true);
    try {
      await inventoryApi.createProduct(formData);
      toast.success('New product added to inventory successfully!');
      setShowAddModal(false);
      loadInventory();
    } catch (err) {
      toast.error(err.response?.data?.message || err.customMessage || 'Failed to add product');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Product Modal (Staff only)
  const handleOpenEdit = (p) => {
    setEditingProduct(p);
    const variant = p.variants?.[0] || {};
    setFormData({
      name: p.name || '',
      category_name: p.category_name || '',
      sku: variant.sku || p.sku || '',
      barcode: variant.barcode || '',
      price: variant.price || p.price || '',
      mrp: variant.mrp || p.mrp || '',
      cost_price: variant.cost_price || '',
      stock_qty: variant.stock_qty !== undefined ? variant.stock_qty : (p.stock_qty || 0),
      reorder_level: variant.reorder_level || 5,
      size: variant.size || '',
      color: variant.color || '',
      description: p.description || '',
      image_url: p.image_url || '',
      is_online: p.is_online !== undefined ? p.is_online : true,
    });
    setShowEditModal(true);
  };

  // Submit Edit Product (Staff only)
  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;

    setSubmitting(true);
    try {
      await inventoryApi.updateProduct(editingProduct.id, formData);
      toast.success('Product details updated successfully!');
      setShowEditModal(false);
      setEditingProduct(null);
      loadInventory();
    } catch (err) {
      toast.error(err.response?.data?.message || err.customMessage || 'Failed to update product');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Product (Staff only)
  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`Are you sure you want to delete "${product.name}" from inventory?`)) {
      return;
    }

    try {
      await inventoryApi.deleteProduct(product.id);
      toast.success('Product deleted successfully');
      loadInventory();
    } catch (err) {
      toast.error(err.response?.data?.message || err.customMessage || 'Failed to delete product');
    }
  };

  // Open Customer Buy / Order Modal
  const handleOpenBuy = (product) => {
    const qty = Number(product.stock_qty) || 0;
    if (qty <= 0) {
      toast.error('This product is currently out of stock');
      return;
    }
    setBuyingProduct(product);
    setBuyQuantity(1);
    setBuyFulfillment('delivery');
    setBuyAddress('');
    setBuyPhone(user?.phone || '');
    setBuyName(user?.full_name || '');
    setBuyPaymentMethod('razorpay');
    setOrderSuccess(null);
    setShowBuyModal(true);
  };

  // Customer Place Order
  const handlePlaceCustomerOrder = async (e) => {
    e.preventDefault();
    if (!buyingProduct) return;

    const variant = buyingProduct.variants?.[0];
    if (!variant || !variant.id) {
      toast.error('Product variant details are unavailable');
      return;
    }

    const availableStock = Number(buyingProduct.stock_qty) || 0;
    const requestedQty = Number(buyQuantity) || 1;
    if (requestedQty > availableStock) {
      toast.error(`Only ${availableStock} unit(s) available in stock`);
      return;
    }

    if (buyFulfillment === 'delivery' && !buyAddress.trim()) {
      toast.error('Please enter a delivery address');
      return;
    }

    const unitPrice = Number(buyingProduct.price || 0);
    const orderTotal = Math.round(unitPrice * requestedQty * 100) / 100;

    // Razorpay Online Payment Flow
    if (buyPaymentMethod === 'razorpay' && orderTotal > 0) {
      setOrderSubmitting(true);
      try {
        // 1. Create secure Razorpay Order from backend
        const rzpRes = await ordersApi.createRazorpayOrder(
          {
            amount: orderTotal,
            product_name: buyingProduct.name,
            items: [{ variant_id: variant.id, quantity: requestedQty }]
          },
          { clubId: effectiveClubId }
        );

        const rzpData = rzpRes?.data;
        if (!rzpData?.orderId) {
          throw new Error('Failed to create Razorpay checkout session');
        }

        // 2. Open Razorpay Gateway Popup
        await openRazorpayCheckout({
          orderId: rzpData.orderId,
          amount: rzpData.amount,
          currency: rzpData.currency || 'INR',
          name: activeClub?.name ? `${activeClub.name} - Pro Shop` : 'Club Pro Shop',
          description: `${buyingProduct.name} x ${requestedQty}`,
          prefill: {
            name: buyName.trim() || user?.full_name || '',
            email: user?.email || '',
            phone: buyPhone.trim() || user?.phone || '',
          },
          onSuccess: async (rzpResponse) => {
            setOrderSubmitting(true);
            try {
              const orderPayload = {
                guest_name: buyName.trim() || user?.full_name || 'Customer',
                guest_phone: buyPhone.trim() || null,
                fulfillment: buyFulfillment,
                delivery_address: buyFulfillment === 'delivery' ? buyAddress.trim() : null,
                payment_method: 'online',
                amount: orderTotal,
                razorpay_payment_id: rzpResponse.razorpay_payment_id,
                razorpay_order_id: rzpResponse.razorpay_order_id,
                razorpay_signature: rzpResponse.razorpay_signature,
                paymentDetails: {
                  method: 'online',
                  reference: rzpResponse.razorpay_payment_id,
                },
                items: [
                  {
                    variant_id: variant.id,
                    quantity: requestedQty,
                  }
                ]
              };

              const res = await ordersApi.createOrder(orderPayload, { clubId: effectiveClubId });
              toast.success('Payment verified & order confirmed successfully!');
              setOrderSuccess({
                ...(res.order || { order_no: 'Confirmed' }),
                payment_reference: rzpResponse.razorpay_payment_id,
                paid_online: true,
                total_paid: orderTotal,
                fulfillment: buyFulfillment,
                delivery_address: buyAddress.trim()
              });

              // Optimistically update products stock in UI immediately
              setProducts(prev => prev.map(p => {
                if (p.id === buyingProduct.id) {
                  const newQty = Math.max(0, (Number(p.stock_qty) || 0) - requestedQty);
                  return {
                    ...p,
                    stock_qty: newQty,
                    variants: p.variants?.map(v => v.id === variant.id ? { ...v, stock_qty: Math.max(0, (Number(v.stock_qty) || 0) - requestedQty) } : v)
                  };
                }
                return p;
              }));
              loadInventory();
              window.dispatchEvent(new CustomEvent('order-placed'));
            } catch (err) {
              toast.error(err.response?.data?.message || err.message || 'Payment received, but error recording order. Please contact club staff.');
            } finally {
              setOrderSubmitting(false);
            }
          },
          onDismiss: () => {
            setOrderSubmitting(false);
            toast.info('Payment was cancelled. You can complete your order anytime.');
          }
        });
      } catch (err) {
        toast.error(err.response?.data?.message || err.message || 'Failed to start payment gateway');
        setOrderSubmitting(false);
      }
      return;
    }

    // Counter / Pay-on-Delivery flow
    setOrderSubmitting(true);
    try {
      const orderPayload = {
        guest_name: buyName.trim() || user?.full_name || 'Customer',
        guest_phone: buyPhone.trim() || null,
        fulfillment: buyFulfillment,
        delivery_address: buyFulfillment === 'delivery' ? buyAddress.trim() : null,
        payment_method: 'counter',
        amount: orderTotal,
        items: [
          {
            variant_id: variant.id,
            quantity: requestedQty,
          }
        ]
      };

      const res = await ordersApi.createOrder(orderPayload, { clubId: effectiveClubId });
      toast.success('Order placed successfully! Pay upon delivery/pickup.');
      setOrderSuccess({
        ...(res.order || { order_no: 'Confirmed' }),
        paid_online: false,
        total_paid: orderTotal,
        fulfillment: buyFulfillment,
        delivery_address: buyAddress.trim()
      });
      // Optimistically update products stock in UI immediately
      setProducts(prev => prev.map(p => {
        if (p.id === buyingProduct.id) {
          const newQty = Math.max(0, (Number(p.stock_qty) || 0) - requestedQty);
          return {
            ...p,
            stock_qty: newQty,
            variants: p.variants?.map(v => v.id === variant.id ? { ...v, stock_qty: Math.max(0, (Number(v.stock_qty) || 0) - requestedQty) } : v)
          };
        }
        return p;
      }));
      loadInventory();
      window.dispatchEvent(new CustomEvent('order-placed'));
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to place order');
    } finally {
      setOrderSubmitting(false);
    }
  };

  // Compute Metrics
  const totalProducts = products.length;
  const totalUnits = products.reduce((acc, p) => acc + (Number(p.stock_qty) || 0), 0);
  const lowStockCount = products.filter(p => {
    const qty = Number(p.stock_qty) || 0;
    const reorder = p.variants?.[0]?.reorder_level || 5;
    return qty > 0 && qty <= reorder;
  }).length;
  const outOfStockCount = products.filter(p => (Number(p.stock_qty) || 0) === 0).length;

  // Filter Products (Search executed by backend fuzzy search)
  const filteredProducts = products.filter(p => {
    const matchesCategory = 
      selectedCategory === 'ALL' || 
      (p.category_name && p.category_name.toLowerCase() === selectedCategory.toLowerCase());

    const qty = Number(p.stock_qty) || 0;
    const reorder = p.variants?.[0]?.reorder_level || 5;
    let matchesStock = true;
    if (stockFilter === 'IN_STOCK') matchesStock = qty > reorder;
    if (stockFilter === 'LOW_STOCK') matchesStock = qty > 0 && qty <= reorder;
    if (stockFilter === 'OUT_OF_STOCK') matchesStock = qty === 0;

    return matchesCategory && matchesStock;
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
      padding: '2rem 1.5rem',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        
        {/* --- Header Card --- */}
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
                padding: '0.65rem',
                borderRadius: '0.65rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ShoppingBag size={24} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.025em' }}>
                  {isStaff ? 'Pro Shop Inventory Management' : 'Pro Shop & Equipment Store'}
                </h1>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.875rem', color: '#64748b' }}>
                  {isStaff 
                    ? `Live stock tracking, variant control, and catalog management for ${clubName}`
                    : `Browse and purchase genuine sports equipment, rackets, and gear available at ${clubName}`}
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
                {isStaff ? <ShieldCheck size={13} /> : <Sparkles size={13} />}
                {isStaff ? 'Staff Hub • Stock & Price Control' : 'Customer Store • Buy Online'}
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
                    color: '#2563eb',
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
            {/* View Mode Toggle */}
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.25rem', borderRadius: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Grid Store View"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem 0.75rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  background: viewMode === 'grid' ? '#ffffff' : 'transparent',
                  color: viewMode === 'grid' ? '#0f172a' : '#64748b',
                  fontWeight: viewMode === 'grid' ? 700 : 500,
                  boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                <LayoutGrid size={15} /> Store
              </button>
              {isStaff && (
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  title="Inventory Table View"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.45rem 0.75rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    background: viewMode === 'table' ? '#ffffff' : 'transparent',
                    color: viewMode === 'table' ? '#0f172a' : '#64748b',
                    fontWeight: viewMode === 'table' ? 700 : 500,
                    boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  <List size={15} /> Table
                </button>
              )}
            </div>

            <button
              onClick={loadInventory}
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
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>

            {/* ONLY SHOWN TO OWNER & SHOP STAFF: Add New Product Button */}
            {isStaff && (
              <button
                id="btn-add-product"
                onClick={handleOpenAdd}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.25rem',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Plus size={16} />
                Add New Product
              </button>
            )}
          </div>
        </div>

        {/* --- Metric Overview Cards --- */}
        {isStaff ? (
          // Staff Detailed Inventory Stats
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
            marginBottom: '2rem'
          }}>
            <div style={{ background: '#ffffff', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Unique Products</span>
                <div style={{ padding: '0.4rem', borderRadius: '0.4rem', background: '#f1f5f9', color: '#0f172a' }}>
                  <Package size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>{totalProducts}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Live club catalog</div>
            </div>

            <div style={{ background: '#ffffff', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Units In Stock</span>
                <div style={{ padding: '0.4rem', borderRadius: '0.4rem', background: '#ecfdf5', color: '#059669' }}>
                  <Layers size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#059669' }}>{totalUnits}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Across all variants</div>
            </div>

            <div style={{ background: '#ffffff', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Low Stock Alert</span>
                <div style={{ padding: '0.4rem', borderRadius: '0.4rem', background: '#fffbeb', color: '#d97706' }}>
                  <AlertTriangle size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#d97706' }}>{lowStockCount}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>At or below reorder level</div>
            </div>

            <div style={{ background: '#ffffff', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Out Of Stock</span>
                <div style={{ padding: '0.4rem', borderRadius: '0.4rem', background: '#fef2f2', color: '#ef4444' }}>
                  <XCircle size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ef4444' }}>{outOfStockCount}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Requires immediate reorder</div>
            </div>
          </div>
        ) : (
          // Customer Helpful Overview Banner
          <div style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            color: '#ffffff',
            borderRadius: '0.75rem',
            padding: '1.25rem 1.75rem',
            marginBottom: '2rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.75rem', borderRadius: '0.5rem' }}>
                <Sparkles size={24} style={{ color: '#38bdf8' }} />
              </div>
              <div>
                <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem', fontWeight: 700 }}>
                  Club Pro Equipment & Member Gear
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                  Select any item to order online with fast doorstep delivery or front-desk pickup.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.06)', padding: '0.5rem 1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8' }}>{totalProducts}</div>
                <div style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>Available Items</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.06)', padding: '0.5rem 1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399' }}>{categories.length || 1}</div>
                <div style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>Categories</div>
              </div>
            </div>
          </div>
        )}

        {/* --- Search & Filters Bar --- */}
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
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder={isStaff ? "Search by product name, SKU..." : "Search products by name or equipment type..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 2.2rem 0.6rem 2.25rem',
                border: '1px solid #cbd5e1',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                outline: 'none',
                background: '#f8fafc'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                  border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, color: '#94a3b8'
                }}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                padding: '0.6rem 0.85rem',
                borderRadius: '0.5rem',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                background: '#ffffff',
                color: '#334155',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id || c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Stock Filter (Staff only) */}
            {isStaff && (
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                style={{
                  padding: '0.6rem 0.85rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  background: '#ffffff',
                  color: '#334155',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">All Stock Levels</option>
                <option value="IN_STOCK">In Stock</option>
                <option value="LOW_STOCK">Low Stock Alert</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
              </select>
            )}
          </div>
        </div>

        {/* --- Product List Content --- */}
        {loading ? (
          <div style={{ background: '#ffffff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', padding: '4rem 2rem', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem', display: 'block', color: '#2563eb' }} />
            <p style={{ fontWeight: 500, margin: 0 }}>Loading club products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ background: '#ffffff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', padding: '4rem 2rem', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#94a3b8' }}>
              <Package size={28} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem' }}>
              No products found
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
              {isStaff 
                ? 'No inventory items match your current search or filters. Click "+ Add New Product" above to create one.'
                : 'There are currently no products available in the club store. Please check back later or contact the front desk.'}
            </p>
            {isStaff && (
              <button
                onClick={handleOpenAdd}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1.25rem',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Plus size={16} /> Add First Product
              </button>
            )}
          </div>
        ) : viewMode === 'grid' || !isStaff ? (
          // STORE GRID VIEW (Default for Customers & Toggleable for Staff)
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.5rem'
          }}>
            {filteredProducts.map((p) => {
              const qty = Number(p.stock_qty) || 0;
              const isAvailable = qty > 0;
              const price = Number(p.price || p.min_price || 0);
              const mrp = Number(p.mrp || 0);
              const discountPercent = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

              return (
                <div
                  key={p.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '0.75rem',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.04)';
                  }}
                >
                  {/* Product Image */}
                  <div style={{
                    width: '100%',
                    height: '190px',
                    background: '#f8fafc',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderBottom: '1px solid #f1f5f9'
                  }}>
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                        <Package size={48} style={{ opacity: 0.4, margin: '0 auto 0.5rem' }} />
                        <div style={{ fontSize: '0.75rem', fontWeight: 500 }}>Club Equipment</div>
                      </div>
                    )}

                    {/* Category Tag */}
                    <span style={{
                      position: 'absolute',
                      top: '0.75rem',
                      left: '0.75rem',
                      background: 'rgba(15, 23, 42, 0.85)',
                      color: '#ffffff',
                      backdropFilter: 'blur(4px)',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '0.35rem',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}>
                      {p.category_name || 'General'}
                    </span>

                    {/* Discount Badge */}
                    {discountPercent > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '0.75rem',
                        right: '0.75rem',
                        background: '#ef4444',
                        color: '#ffffff',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '0.35rem',
                        fontSize: '0.7rem',
                        fontWeight: 700
                      }}>
                        {discountPercent}% OFF
                      </span>
                    )}
                  </div>

                  {/* Product Details */}
                  <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.4rem', lineHeight: '1.3' }}>
                      {p.name}
                    </h3>
                    <p style={{
                      fontSize: '0.8rem',
                      color: '#64748b',
                      margin: '0 0 1rem',
                      lineHeight: '1.4',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      flex: 1
                    }}>
                      {p.description || 'Professional equipment ready for play and court practice.'}
                    </p>

                    {/* Stock Status Badge */}
                    <div style={{ marginBottom: '0.85rem' }}>
                      {isAvailable ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: '#059669',
                          background: '#ecfdf5',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '0.35rem'
                        }}>
                          <CheckCircle2 size={12} /> In Stock ({qty} left)
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: '#dc2626',
                          background: '#fef2f2',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '0.35rem'
                        }}>
                          <XCircle size={12} /> Out of Stock
                        </span>
                      )}
                    </div>

                    {/* Price and Action Section */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: '0.85rem'
                    }}>
                      <div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                          ₹{price.toFixed(2)}
                        </div>
                        {mrp > price && (
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                            ₹{mrp.toFixed(2)}
                          </div>
                        )}
                      </div>

                      {/* Customer Buy Button */}
                      {!isStaff ? (
                        <button
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => handleOpenBuy(p)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.55rem 1rem',
                            background: isAvailable ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : '#e2e8f0',
                            color: isAvailable ? '#ffffff' : '#94a3b8',
                            border: 'none',
                            borderRadius: '0.5rem',
                            fontSize: '0.825rem',
                            fontWeight: 700,
                            cursor: isAvailable ? 'pointer' : 'not-allowed',
                            boxShadow: isAvailable ? '0 2px 8px rgba(37, 99, 235, 0.2)' : 'none'
                          }}
                        >
                          <ShoppingCart size={14} />
                          Buy Now
                        </button>
                      ) : (
                        /* Staff Actions in Grid View */
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            title="Edit Product"
                            style={{
                              padding: '0.45rem',
                              borderRadius: '0.35rem',
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#334155',
                              cursor: 'pointer'
                            }}
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p)}
                            title="Delete Product"
                            style={{
                              padding: '0.45rem',
                              borderRadius: '0.35rem',
                              border: '1px solid #fecaca',
                              background: '#fff1f2',
                              color: '#ef4444',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            background: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
            overflow: 'hidden'
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '0.85rem 1.25rem', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Product</th>
                    <th style={{ padding: '0.85rem 1.25rem', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>SKU</th>
                    <th style={{ padding: '0.85rem 1.25rem', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Category</th>
                    <th style={{ padding: '0.85rem 1.25rem', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>Price</th>
                    <th style={{ padding: '0.85rem 1.25rem', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'center' }}>Stock Qty</th>
                    <th style={{ padding: '0.85rem 1.25rem', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '0.85rem 1.25rem', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => {
                    const variant = p.variants?.[0] || {};
                    const sku = variant.sku || p.sku || '—';
                    const qty = Number(p.stock_qty) || 0;
                    const reorder = variant.reorder_level || 5;

                    return (
                      <tr
                        key={p.id}
                        style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.12s ease' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {/* Product Photo & Name */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                            <div style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '0.4rem',
                              background: '#f1f5f9',
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {p.image_url ? (
                                <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <Package size={20} style={{ color: '#94a3b8' }} />
                              )}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{p.name}</div>
                              {p.description && (
                                <div style={{ fontSize: '0.75rem', color: '#64748b', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {p.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* SKU */}
                        <td style={{ padding: '1rem 1.25rem', fontFamily: 'monospace', color: '#334155', fontWeight: 600, fontSize: '0.825rem' }}>
                          {sku}
                        </td>

                        {/* Category */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span style={{
                            display: 'inline-block',
                            background: '#f1f5f9',
                            color: '#475569',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '0.35rem',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}>
                            {p.category_name || 'General'}
                          </span>
                        </td>

                        {/* Price */}
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                          ₹{Number(p.price || p.min_price || 0).toFixed(2)}
                        </td>

                        {/* Stock Qty */}
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: qty === 0 ? '#fef2f2' : qty <= reorder ? '#fffbeb' : '#ecfdf5',
                            color: qty === 0 ? '#dc2626' : qty <= reorder ? '#d97706' : '#059669',
                            border: `1px solid ${qty === 0 ? '#fecaca' : qty <= reorder ? '#fde68a' : '#a7f3d0'}`
                          }}>
                            {qty} units
                          </span>
                        </td>

                        {/* Online Status */}
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                          <span style={{
                            fontSize: '0.725rem',
                            fontWeight: 600,
                            color: p.is_online ? '#0284c7' : '#94a3b8',
                            background: p.is_online ? '#f0f9ff' : '#f1f5f9',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '0.35rem'
                          }}>
                            {p.is_online ? 'Sell Online' : 'POS Only'}
                          </span>
                        </td>

                        {/* Actions (Staff only) */}
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleOpenEdit(p)}
                              title="Edit product"
                              style={{
                                padding: '0.45rem',
                                borderRadius: '0.375rem',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                color: '#334155',
                                cursor: 'pointer'
                              }}
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p)}
                              title="Delete product"
                              style={{
                                padding: '0.45rem',
                                borderRadius: '0.375rem',
                                border: '1px solid #fecaca',
                                background: '#fff1f2',
                                color: '#ef4444',
                                cursor: 'pointer'
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* CUSTOMER CHECKOUT / BUY MODAL */}
      {showBuyModal && buyingProduct && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
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
            maxWidth: '520px',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingCart size={18} style={{ color: '#2563eb' }} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Order Equipment
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBuyModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.35rem' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            {orderSuccess ? (
              <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#ecfdf5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)'
                }}>
                  <CheckCircle2 size={36} />
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>
                  {orderSuccess.paid_online ? 'Payment Verified & Order Confirmed!' : 'Order Placed Successfully!'}
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: '1.5' }}>
                  Your order <strong>{orderSuccess.order_no}</strong> for <strong>{buyingProduct.name}</strong> has been received by {clubName}.
                </p>

                {/* Summary Card */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.65rem',
                  padding: '1rem',
                  textAlign: 'left',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  fontSize: '0.85rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>Payment Method:</span>
                    <span style={{ fontWeight: 700, color: orderSuccess.paid_online ? '#059669' : '#0f172a' }}>
                      {orderSuccess.paid_online ? 'Razorpay Online (Paid)' : 'Pay on Delivery / Counter'}
                    </span>
                  </div>
                  {orderSuccess.payment_reference && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>Payment Reference:</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>
                        {orderSuccess.payment_reference}
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>Amount:</span>
                    <span style={{ fontWeight: 800, color: '#0f172a' }}>
                      ₹{Number(orderSuccess.total_paid || orderSuccess.total || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>Fulfillment:</span>
                    <span style={{ fontWeight: 600, color: '#0f172a', textTransform: 'capitalize' }}>
                      {orderSuccess.fulfillment || buyFulfillment}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBuyModal(false);
                      navigate('/orders');
                    }}
                    style={{
                      padding: '0.7rem 1.35rem',
                      background: '#0f172a',
                      color: '#ffffff',
                      borderRadius: '0.5rem',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    View in My Orders
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBuyModal(false)}
                    style={{
                      padding: '0.7rem 1.35rem',
                      background: '#ffffff',
                      color: '#334155',
                      borderRadius: '0.5rem',
                      border: '1px solid #cbd5e1',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePlaceCustomerOrder} style={{ padding: '1.5rem' }}>
                {/* Product Summary */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.85rem',
                  background: '#f8fafc',
                  borderRadius: '0.5rem',
                  border: '1px solid #e2e8f0',
                  marginBottom: '1.25rem'
                }}>
                  <div style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '0.4rem',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {buyingProduct.image_url ? (
                      <img src={buyingProduct.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Package size={24} style={{ color: '#94a3b8' }} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                      {buyingProduct.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>
                      Unit Price: <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{Number(buyingProduct.price || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Quantity Selector */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                    Select Quantity
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input
                      type="number"
                      min="1"
                      max={Math.max(1, Number(buyingProduct.stock_qty) || 1)}
                      value={buyQuantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 1;
                        const maxAvail = Math.max(1, Number(buyingProduct.stock_qty) || 1);
                        setBuyQuantity(Math.max(1, Math.min(maxAvail, val)));
                      }}
                      style={{
                        width: '90px',
                        padding: '0.55rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '0.375rem',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        textAlign: 'center'
                      }}
                    />
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      (Max {buyingProduct.stock_qty || 0} available)
                    </span>
                  </div>
                </div>

                {/* Fulfillment Option */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                    Fulfillment Method
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => setBuyFulfillment('delivery')}
                      style={{
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: buyFulfillment === 'delivery' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: buyFulfillment === 'delivery' ? '#eff6ff' : '#ffffff',
                        color: buyFulfillment === 'delivery' ? '#1e40af' : '#475569',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer'
                      }}
                    >
                      <Truck size={16} /> Home Delivery
                    </button>
                    <button
                      type="button"
                      onClick={() => setBuyFulfillment('counter')}
                      style={{
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: buyFulfillment === 'counter' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: buyFulfillment === 'counter' ? '#eff6ff' : '#ffffff',
                        color: buyFulfillment === 'counter' ? '#1e40af' : '#475569',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer'
                      }}
                    >
                      <Package size={16} /> Counter Pickup
                    </button>
                  </div>
                </div>

                {/* Delivery Address */}
                {buyFulfillment === 'delivery' && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                      Delivery Address *
                    </label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Enter street, apartment, or doorstep delivery details..."
                      value={buyAddress}
                      onChange={(e) => setBuyAddress(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.6rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '0.375rem',
                        fontSize: '0.85rem',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>
                )}

                {/* Contact Phone & Name */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                      Recipient Name
                    </label>
                    <input
                      type="text"
                      value={buyName}
                      onChange={(e) => setBuyName(e.target.value)}
                      placeholder="Your full name"
                      style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      value={buyPhone}
                      onChange={(e) => setBuyPhone(e.target.value)}
                      placeholder="Mobile number"
                      style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                    Payment Method
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => setBuyPaymentMethod('razorpay')}
                      style={{
                        padding: '0.75rem 0.5rem',
                        borderRadius: '0.5rem',
                        border: buyPaymentMethod === 'razorpay' ? '2px solid #0984e3' : '1px solid #cbd5e1',
                        background: buyPaymentMethod === 'razorpay' ? '#f0f9ff' : '#ffffff',
                        color: buyPaymentMethod === 'razorpay' ? '#0369a1' : '#475569',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.3rem',
                        cursor: 'pointer',
                        textAlign: 'center',
                        position: 'relative',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                        <CreditCard size={16} style={{ color: '#0984e3' }} /> Pay via Razorpay
                      </div>
                      <span style={{ fontSize: '0.72rem', color: buyPaymentMethod === 'razorpay' ? '#0284c7' : '#64748b' }}>
                        UPI, Cards, NetBanking
                      </span>
                      {buyPaymentMethod === 'razorpay' && (
                        <span style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '8px',
                          background: '#0984e3',
                          color: '#ffffff',
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          padding: '0.1rem 0.4rem',
                          borderRadius: '999px',
                          letterSpacing: '0.02em'
                        }}>
                          RECOMMENDED
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBuyPaymentMethod('counter')}
                      style={{
                        padding: '0.75rem 0.5rem',
                        borderRadius: '0.5rem',
                        border: buyPaymentMethod === 'counter' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: buyPaymentMethod === 'counter' ? '#eff6ff' : '#ffffff',
                        color: buyPaymentMethod === 'counter' ? '#1e40af' : '#475569',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.3rem',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                        <Package size={16} /> Pay on Delivery
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        Cash / Counter payment
                      </span>
                    </button>
                  </div>
                </div>

                {/* Total Cost Breakdown */}
                <div style={{
                  background: '#f8fafc',
                  padding: '0.85rem 1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e2e8f0',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>
                    Order Total ({buyQuantity} item{buyQuantity > 1 ? 's' : ''}):
                  </span>
                  <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                    ₹{(Number(buyingProduct.price || 0) * buyQuantity).toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => setShowBuyModal(false)}
                      disabled={orderSubmitting}
                      style={{
                        padding: '0.65rem 1.25rem',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '0.5rem',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        color: '#475569',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={orderSubmitting}
                      style={{
                        padding: '0.75rem 1.6rem',
                        background: buyPaymentMethod === 'razorpay'
                          ? 'linear-gradient(135deg, #0984e3 0%, #0056b3 100%)'
                          : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        color: '#ffffff',
                        cursor: orderSubmitting ? 'not-allowed' : 'pointer',
                        boxShadow: buyPaymentMethod === 'razorpay'
                          ? '0 4px 14px rgba(9, 132, 227, 0.35)'
                          : '0 4px 12px rgba(37, 99, 235, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {orderSubmitting ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          {buyPaymentMethod === 'razorpay' ? 'Opening Razorpay Gateway...' : 'Placing Order...'}
                        </>
                      ) : buyPaymentMethod === 'razorpay' ? (
                        <>
                          <CreditCard size={17} />
                          Pay ₹{(Number(buyingProduct.price || 0) * buyQuantity).toLocaleString('en-IN')} via Razorpay
                        </>
                      ) : (
                        <>
                          Confirm & Place Order (Pay on Delivery)
                        </>
                      )}
                    </button>
                  </div>
                  {buyPaymentMethod === 'razorpay' && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      fontSize: '0.75rem',
                      color: '#64748b'
                    }}>
                      <Lock size={12} style={{ color: '#10b981' }} />
                      <span>Powered by Razorpay Secure • 256-bit SSL encrypted</span>
                    </div>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* STAFF ONLY: ADD NEW PRODUCT MODAL */}
      {showAddModal && isStaff && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
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
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Add New Product to Sell
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.35rem' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                {/* Product Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Wilson Pro Staff V14 Tennis Racket"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '0.85rem' }}
                  />
                </div>

                {/* Category & SKU */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                      Category *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rackets, Balls, Apparel"
                      value={formData.category_name}
                      onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                      SKU Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. RKT-001"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                {/* Price & MRP */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                      Selling Price (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                      MRP / List Price (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formData.mrp}
                      onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                {/* Stock Quantity & Reorder Level */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                      Initial Stock Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.stock_qty}
                      onChange={(e) => setFormData({ ...formData, stock_qty: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                      Reorder Threshold
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.reorder_level}
                      onChange={(e) => setFormData({ ...formData, reorder_level: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                {/* Photo Picker with Base64 */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Product Image (Stored in Base64)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '0.5rem',
                      background: '#f1f5f9',
                      border: '1px dashed #cbd5e1',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {formData.image_url ? (
                        <img src={formData.image_url} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <ImageIcon size={22} style={{ color: '#94a3b8' }} />
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.svg,.bmp,.avif"
                        ref={fileInputRef}
                        onChange={handleImageFileChange}
                        style={{ display: 'none' }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          padding: '0.5rem 0.85rem',
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          borderRadius: '0.375rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Choose Local Photo
                      </button>
                      <div style={{ fontSize: '0.725rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                        Supports JPG, PNG, WEBP (auto-converts to Base64)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Product Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Provide details about size, material, or court performance..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '0.85rem', fontFamily: 'inherit' }}
                  />
                </div>

                {/* Sell Online Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="is_online_check"
                    checked={formData.is_online}
                    onChange={(e) => setFormData({ ...formData, is_online: e.target.checked })}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <label htmlFor="is_online_check" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                    Make visible in Customer Online Store
                  </label>
                </div>
              </div>

              {/* Form Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '0.6rem 1.25rem',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.5rem',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '0.6rem 1.5rem',
                    background: '#2563eb',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    color: '#ffffff',
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting ? 'Saving...' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STAFF ONLY: EDIT PRODUCT MODAL */}
      {showEditModal && editingProduct && isStaff && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
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
            maxWidth: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Edit Product Details
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.35rem' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Product Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                      Price (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                      Stock Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.stock_qty}
                      onChange={(e) => setFormData({ ...formData, stock_qty: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="edit_is_online"
                    checked={formData.is_online}
                    onChange={(e) => setFormData({ ...formData, is_online: e.target.checked })}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <label htmlFor="edit_is_online" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                    Available for Online Customer Orders
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{
                    padding: '0.6rem 1.25rem',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.5rem',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '0.6rem 1.5rem',
                    background: '#2563eb',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    color: '#ffffff',
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
