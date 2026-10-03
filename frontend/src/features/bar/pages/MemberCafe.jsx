import React, { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import barApi from '../services/bar.api.js';
import { openRazorpayCheckout } from '../../../shared/utils/razorpay.util.js';

export default function MemberCafe({ club, membership }) {
  const { user } = useSelector((state) => state.auth);
  const clubId = club?.id;

  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [vegOnly, setVegOnly] = useState(false);

  // Cart
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

  // Determine member discount rate from membership plan
  const memberDiscountRate = useMemo(() => {
    if (membership?.plan?.bar_discount_percent) {
      return Number(membership.plan.bar_discount_percent) / 100;
    }
    const planName = membership?.plan?.name?.toLowerCase() || '';
    if (planName.includes('gold')) return 0.15;
    if (planName.includes('standard')) return 0.10;
    return 0;
  }, [membership]);

  useEffect(() => {
    if (!clubId) return;
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        const [menuData, tablesData] = await Promise.all([
          barApi.getMenu(clubId, null, true), // only available
          barApi.getTables(clubId, true),
        ]);
        if (isMounted) {
          setCategories(menuData.categories || []);
          setMenuItems(menuData.items || []);
          setTables(tablesData || []);
        }
      } catch (err) {
        console.error('Failed to load cafe menu:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [clubId]);

  // Filtered Items
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

  // Checkout with Razorpay
  const handlePayWithRazorpay = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const orderPayload = {
        table_id: servingLocation === 'table' ? selectedTableId || null : null,
        member_id: membership?.member_id || null,
        guest_name: user?.full_name || 'Member',
        notes: `Member app order (${servingLocation}) ${deliveryNote ? '- ' + deliveryNote : ''}`,
        items: cart.map((i) => ({
          menu_item_id: i.item.id,
          quantity: i.quantity,
          notes: i.notes || null,
        })),
      };

      const createdOrder = await barApi.createOrder(orderPayload, clubId);

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
            orderNo: createdOrder.order_no,
            amount: grandTotal,
            reference: rzpResponse.razorpay_payment_id,
          });
          setCart([]);
          setIsCartOpen(false);
          showToast('Payment successful! Your order has been sent to the cafe.', 'success');
        },
      });
    } catch (err) {
      console.error('Member cafe checkout error:', err);
      showToast(err.customMessage || 'Order failed. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Charge to Member Tab
  const handleChargeToTab = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const orderPayload = {
        table_id: servingLocation === 'table' ? selectedTableId || null : null,
        member_id: membership?.member_id || null,
        guest_name: user?.full_name || 'Member',
        charge_to_tab: true,
        notes: `Member app charge to tab (${servingLocation}) ${deliveryNote ? '- ' + deliveryNote : ''}`,
        items: cart.map((i) => ({
          menu_item_id: i.item.id,
          quantity: i.quantity,
          notes: i.notes || null,
        })),
      };

      const createdOrder = await barApi.createOrder(orderPayload, clubId);
      setCompletedOrder({
        orderNo: createdOrder.order_no,
        amount: grandTotal,
        method: 'Charged to Club Tab',
      });
      setCart([]);
      setIsCartOpen(false);
      showToast('Order placed & charged to your club account tab!', 'success');
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
              {club.name} Cafe & Bar
            </h2>
          </div>
          <p style={{ margin: '0.35rem 0 0', opacity: 0.85, fontSize: '0.85rem' }}>
            Artisanal single-origin brews, post-match protein meals, gourmet wraps, and craft mocktails.
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
                Applied automatically at checkout for {membership?.plan?.name || 'Club Member'}
              </div>
            </div>
          </div>
        )}
      </div>

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
            maxWidth: '400px',
            gap: '0.5rem',
          }}
        >
          <Search size={16} color="#6B6B66" />
          <input
            type="text"
            placeholder="Search smoothies, bowls, sandwiches..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.85rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setVegOnly(!vegOnly)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.9rem',
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

          {cart.length > 0 && (
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: '#1F5C46',
                color: '#FAF9F6',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(31,92,70,0.2)',
              }}
            >
              <ShoppingBag size={15} />
              <span>Cart ({cart.reduce((a, b) => a + b.quantity, 0)})</span>
              <span style={{ background: '#FAF9F6', color: '#1F5C46', borderRadius: '4px', padding: '0.1rem 0.35rem', fontSize: '0.75rem', fontWeight: 800 }}>
                ₹{grandTotal.toFixed(0)}
              </span>
            </button>
          )}
        </div>
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

      {/* Menu Grid */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#6B6B66' }}>
          Loading club cafe menu...
        </div>
      ) : filteredItems.length === 0 ? (
        <div
          style={{
            padding: '3rem 1.5rem',
            textAlign: 'center',
            background: '#FFFFFF',
            border: '1px solid #E7E5DF',
            borderRadius: '10px',
            color: '#6B6B66',
          }}
        >
          <Utensils size={36} color="#A8A29E" style={{ margin: '0 auto 0.5rem' }} />
          <div style={{ fontWeight: 700 }}>No items match your query</div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
            gap: '1rem',
          }}
        >
          {filteredItems.map((item) => {
            const inCart = cart.find((c) => c.item.id === item.id);
            const isVeg = item.is_veg !== false;
            return (
              <div
                key={item.id}
                style={{
                  background: '#FFFFFF',
                  border: inCart ? '1.5px solid #1F5C46' : '1px solid #E7E5DF',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <div>
                  <div
                    style={{
                      height: '130px',
                      background: item.image_url
                        ? `url(${item.image_url}) center/cover no-repeat`
                        : '#F4F2EC',
                      position: 'relative',
                    }}
                  >
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
                    <div
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'rgba(26,26,24,0.75)',
                        backdropFilter: 'blur(3px)',
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
                      <span>{item.prep_minutes || 5} min</span>
                    </div>
                  </div>

                  <div style={{ padding: '0.85rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1A1A18', lineHeight: 1.25 }}>
                      {item.name}
                    </div>
                    {item.description && (
                      <p
                        style={{
                          fontSize: '0.75rem',
                          color: '#6B6B66',
                          margin: '0.35rem 0 0',
                          lineHeight: 1.35,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    padding: '0.85rem',
                    paddingTop: 0,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 900, color: '#1F5C46' }}>
                      ₹{Number(item.price).toLocaleString()}
                    </div>
                    {memberDiscountRate > 0 && (
                      <div style={{ fontSize: '0.68rem', color: '#047857', fontWeight: 600 }}>
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
                        }}
                      >
                        -
                      </button>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800 }}>{inCart.quantity}</span>
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
                        padding: '0.35rem 0.75rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: '#1F5C46',
                        color: '#FAF9F6',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      + Add
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cart Drawer Modal */}
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
                  Your Cafe Order
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

            {/* Serving location selection */}
            <div style={{ padding: '1rem', borderBottom: '1px solid #E7E5DF', background: '#FFFFFF' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#6B6B66', marginBottom: '0.45rem', textTransform: 'uppercase' }}>
                Delivery / Serving Mode
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {[
                  { id: 'takeaway', label: 'Takeaway / Counter' },
                  { id: 'table', label: 'Serve to Table' },
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
                <div style={{ marginBottom: '0.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#6B6B66', marginBottom: '0.25rem' }}>
                    Select Table / Lounge
                  </label>
                  <select
                    value={selectedTableId}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.45rem',
                      borderRadius: '6px',
                      border: '1px solid #E7E5DF',
                      fontSize: '0.82rem',
                    }}
                  >
                    <option value="">Select table number...</option>
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.zone || 'Dining Area'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <input
                type="text"
                placeholder="Special notes or instructions (optional)..."
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.6rem',
                  border: '1px solid #E7E5DF',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  outline: 'none',
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
                        padding: '0.65rem',
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
                            width: '22px',
                            height: '22px',
                            borderRadius: '4px',
                            border: '1px solid #E7E5DF',
                            background: '#FFFFFF',
                            cursor: 'pointer',
                          }}
                        >
                          -
                        </button>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>{i.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(i.item.id, 1)}
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '4px',
                            border: '1px solid #E7E5DF',
                            background: '#FFFFFF',
                            cursor: 'pointer',
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Checkout Actions */}
            {cart.length > 0 && (
              <div style={{ padding: '1rem', borderTop: '1px solid #E7E5DF', background: '#FFFFFF' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.85rem', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6B6B66' }}>
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  {discountTotal > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#047857', fontWeight: 600 }}>
                      <span>Member Plan Discount ({(memberDiscountRate * 100).toFixed(0)}%)</span>
                      <span>-₹{discountTotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6B6B66' }}>
                    <span>GST (5%)</span>
                    <span>₹{taxTotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.4rem', borderTop: '1px solid #E7E5DF', fontWeight: 800 }}>
                    <span style={{ fontSize: '0.95rem' }}>Total</span>
                    <span style={{ fontSize: '1.25rem', color: '#1F5C46' }}>₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={handlePayWithRazorpay}
                    disabled={submitting}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#1F5C46',
                      color: '#FAF9F6',
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      boxShadow: '0 4px 12px rgba(31,92,70,0.2)',
                    }}
                  >
                    <Sparkles size={16} color="#FDE047" />
                    <span>Pay with Razorpay (₹{grandTotal.toFixed(2)})</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleChargeToTab}
                    disabled={submitting}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '6px',
                      border: '1px solid #1F5C46',
                      background: '#FFFFFF',
                      color: '#1F5C46',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <Wallet size={15} />
                    <span>Charge to My Club Tab</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Completed Order Confirmation Modal */}
      {completedOrder && (
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
              maxWidth: '380px',
              width: '100%',
              padding: '2rem 1.5rem',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: '#EBFDF5',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <CheckCircle2 size={32} />
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.35rem' }}>
              Order Placed!
            </h3>
            <p style={{ color: '#6B6B66', fontSize: '0.85rem', margin: '0 0 1rem' }}>
              Your order <strong>#{completedOrder.orderNo}</strong> has been sent to the kitchen.
            </p>

            <div style={{ background: '#FAF9F6', border: '1px solid #E7E5DF', borderRadius: '8px', padding: '0.85rem', marginBottom: '1.25rem', fontSize: '0.8rem', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: '#6B6B66' }}>Amount Paid:</span>
                <strong style={{ color: '#1F5C46' }}>₹{completedOrder.amount.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6B6B66' }}>Payment Mode:</span>
                <span>{completedOrder.method || 'Razorpay Online'}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCompletedOrder(null)}
              style={{
                width: '100%',
                padding: '0.65rem',
                borderRadius: '6px',
                border: 'none',
                background: '#1F5C46',
                color: '#FAF9F6',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
