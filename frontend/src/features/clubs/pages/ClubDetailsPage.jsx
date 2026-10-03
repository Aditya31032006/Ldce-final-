import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import useAuth from '../../auth/hook/useAuth.js';
import { useToast } from '../../../shared/context/ToastContext.jsx';
import { clubsApi } from '../services/clubs.api.js';
import api from '../../../shared/services/api.js';
import MemberCafe from '../../bar/pages/MemberCafe.jsx';
import { openRazorpayCheckout } from '../../../shared/utils/razorpay.util.js';
import {
  MapPin, Phone, Mail, Trophy, ShieldCheck,
  Calendar, Check, AlertCircle, ArrowLeft, ExternalLink,
  CreditCard, Sparkles, Clock, Copy, CheckCircle2, ChevronRight,
  UserCheck, ShoppingBag, Coffee, IdCard, Plus, Trash2, X, RefreshCw,
  Layers, Warehouse, Tag
} from 'lucide-react';

// Fallback high-res curated sports imagery for clubs with no uploaded gallery
const DEFAULT_SPORT_IMAGES = {
  tennis: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=1000&q=80',
  badminton: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1000&q=80',
  squash: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1000&q=80',
  padel: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1000&q=80',
  cricket: 'https://images.unsplash.com/photo-1531415074868-036b1c57e359?auto=format&fit=crop&w=1000&q=80',
  swimming: 'https://images.unsplash.com/photo-1519315901367-f34ff9154487?auto=format&fit=crop&w=1000&q=80',
  default: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80',
};

// ─── Razorpay Simulation & Gateway Modal (For Non-Members) ─────────────────────────────
// ─── Razorpay Official Gateway Modal ─────────────────────────────
function RazorpayModal({ club, plan, user, onClose, onSuccess }) {
  const [method, setMethod] = useState('razorpay');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const price = Number(plan?.price || 0);
  const joiningFee = Number(plan?.joining_fee || 0);
  const total = price + joiningFee;

  const handlePay = async () => {
    setProcessing(true);
    setErrorMsg(null);
    try {
      if (total > 0) {
        // Create order via backend
        let rzpOrder;
        try {
          const res = await api.post(`/clubs/${club.id}/payments/razorpay/create-order`, {
            amount: total,
            plan_id: plan.id,
          }, { headers: { 'x-club-id': club.id } });
          rzpOrder = res.data?.data;
        } catch {
          // Fallback to bar razorpay order endpoint if needed
          const res = await api.post('/bar/payments/razorpay/create-order', {
            amount: total,
          }, { headers: { 'x-club-id': club.id } });
          rzpOrder = res.data?.data;
        }

        if (!rzpOrder?.orderId) {
          throw new Error('Failed to generate secure Razorpay order token');
        }

        await openRazorpayCheckout({
          orderId: rzpOrder.orderId,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency || 'INR',
          name: club.name,
          description: `Membership: ${plan.name} (${plan.duration_days} days)`,
          prefill: {
            name: user?.full_name || user?.name || '',
            email: user?.email || '',
            phone: user?.phone || '',
          },
          onSuccess: async (rzpResponse) => {
            await onSuccess(plan.id, {
              method: 'online',
              reference: rzpResponse.razorpay_payment_id,
              notes: `Razorpay Payment ID: ${rzpResponse.razorpay_payment_id} (Order: ${rzpResponse.razorpay_order_id})`,
            });
          },
          onDismiss: () => {
            setProcessing(false);
          },
        });
        return;
      }

      // Free plan tier (₹0)
      await onSuccess(plan.id, {
        method: 'other',
        reference: 'Complimentary Tier Enrollment',
      });
    } catch (err) {
      console.error('Membership payment error:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Payment initiation failed. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(26, 26, 24, 0.45)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }}>
      <div style={{
        background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E7E5DF',
        maxWidth: '460px', width: '100%', overflow: 'hidden',
        boxShadow: '0 12px 32px rgba(26, 26, 24, 0.12)'
      }}>
        <div style={{
          background: '#0c2340', color: '#FFFFFF', padding: '1.25rem 1.5rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em', color: '#528ff0' }}>Razorpay</span>
              <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.15)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>TEST MODE</span>
            </div>
            <div style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: '0.2rem' }}>{club.name}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'monospace' }}>₹{total.toLocaleString()}</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.75 }}>Inclusive of taxes</div>
          </div>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {errorMsg && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '6px',
              padding: '0.75rem', marginBottom: '1rem', color: '#DC2626', fontSize: '0.8rem'
            }}>
              {errorMsg}
            </div>
          )}

          <div style={{
            background: '#FAF9F6', border: '1px solid #E7E5DF', borderRadius: '8px',
            padding: '1rem', marginBottom: '1.25rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
              <span style={{ color: '#6B6B66' }}>Plan Name:</span>
              <strong style={{ color: '#1A1A18' }}>{plan.name} ({plan.duration_days} days)</strong>
            </div>
            {joiningFee > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                <span style={{ color: '#6B6B66' }}>Joining Fee:</span>
                <span style={{ color: '#1A1A18' }}>₹{joiningFee.toLocaleString()}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: '#6B6B66' }}>Membership Fee:</span>
              <span style={{ color: '#1A1A18' }}>₹{price.toLocaleString()}</span>
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6B6B66', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              Select Gateway Payment Option
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { id: 'razorpay', label: 'Razorpay Instant UPI & Cards', desc: 'GPay, PhonePe, Paytm, Visa, Mastercard, RuPay, QR' },
                { id: 'upi', label: 'UPI / QR Code', desc: 'Scan & Pay via any UPI application' },
                { id: 'card', label: 'Credit or Debit Card', desc: 'Instant 3D Secure verification' },
                { id: 'netbanking', label: 'Net Banking', desc: 'All 50+ major Indian banks supported' },
              ].map(opt => (
                <label key={opt.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
                  border: method === opt.id ? '1.5px solid #1F5C46' : '1px solid #E7E5DF',
                  background: method === opt.id ? '#EBF3F0' : '#FFFFFF',
                  borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s ease'
                }}>
                  <input
                    type="radio"
                    name="paymethod"
                    checked={method === opt.id}
                    onChange={() => setMethod(opt.id)}
                    style={{ accentColor: '#1F5C46' }}
                  />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1A1A18' }}>{opt.label}</div>
                    <div style={{ fontSize: '0.72rem', color: '#6B6B66' }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={processing}
              style={{
                flex: 1, padding: '0.65rem 1rem', background: '#FFFFFF',
                border: '1px solid #E7E5DF', borderRadius: '6px',
                fontWeight: 600, fontSize: '0.875rem', color: '#1A1A18', cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePay}
              disabled={processing}
              style={{
                flex: 2, padding: '0.65rem 1rem', background: '#1F5C46',
                border: '1px solid transparent', borderRadius: '6px',
                fontWeight: 600, fontSize: '0.875rem', color: '#FFFFFF', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
              }}
            >
              {processing ? (
                <span>Opening Gateway...</span>
              ) : (
                <>
                  <CreditCard size={16} />
                  <span>{total > 0 ? `Pay ₹${total.toLocaleString()} via Razorpay` : 'Confirm Free Subscription'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Court Slot Booking Modal (Inside Scoped Club) ───────────────────────────
function CourtBookingModal({ club, court, memberId, user, onClose, onBookingComplete }) {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedHour, setSelectedHour] = useState('09:00');
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const [resolvedPrice, setResolvedPrice] = useState(null);
  const [basePrice, setBasePrice] = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(false);

  const isFree = Boolean(club.membership?.court_free);
  const discountPct = Number(club.membership?.court_discount_percent || 0);
  const effectiveBaseRate = basePrice !== null ? basePrice : Number(court.hourly_rate || 400);
  const slotPrice = isFree
    ? 0
    : resolvedPrice !== null
    ? resolvedPrice
    : Math.max(0, Math.round(effectiveBaseRate * (1 - discountPct / 100)));

  // All 1-hour session start slots every 30 minutes from 06:00 to 22:00
  const timeSlots = [
    '06:00', '06:30', '07:00', '07:30', '08:00', '08:30',
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
    '21:00', '21:30', '22:00'
  ];

  // Fetch dynamic price based on court pricing rules
  const fetchPrice = useCallback(async () => {
    if (!court?.id || !selectedDate || !selectedHour) return;
    try {
      setLoadingPrice(true);
      const startAt = `${selectedDate}T${selectedHour}:00Z`;
      const res = await api.get('/bookings/price', {
        params: {
          court_id: court.id,
          plan_id: club.membership?.plan_id || undefined,
          start_at: startAt,
        },
        headers: { 'x-club-id': club.id },
      });
      if (res.data?.success) {
        setResolvedPrice(Number(res.data.price));
        setBasePrice(Number(res.data.base_price || res.data.price));
      }
    } catch (err) {
      console.warn('Could not resolve dynamic court rate:', err);
    } finally {
      setLoadingPrice(false);
    }
  }, [court?.id, selectedDate, selectedHour, club.membership?.plan_id, club.id]);

  useEffect(() => {
    fetchPrice();
  }, [fetchPrice]);

  // Listen for real-time pricing rules updates from Courts Management
  useEffect(() => {
    const handleRatesUpdated = () => fetchPrice();
    window.addEventListener('court-rates-updated', handleRatesUpdated);
    const handleStorage = (e) => {
      if (e.key === 'ldce_court_rates_updated') fetchPrice();
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('court-rates-updated', handleRatesUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, [fetchPrice]);
  const getSlotTimestamps = (dateStr, timeStr) => {
    const [h, m] = timeStr.split(':').map(v => v.padStart(2, '0'));
    const startIso = `${dateStr}T${h}:${m}:00+05:30`;
    const totalMinutes = Number(h) * 60 + Number(m) + 60;
    const eh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const em = String(totalMinutes % 60).padStart(2, '0');
    const endIso = `${dateStr}T${eh}:${em}:00+05:30`;
    return {
      startAt: startIso,
      endAt: endIso,
      endHourStr: `${eh}:${em}`,
      displayRange: `${timeStr} – ${eh}:${em}`,
    };
  };

  // Fetch real-time booked slots for this court and date
  const fetchAvailability = useCallback(async () => {
    if (!court?.id || !selectedDate) return;
    try {
      setLoadingSlots(true);
      const res = await api.get('/bookings/availability', {
        params: { court_id: court.id, date: selectedDate },
        headers: { 'x-club-id': club.id }
      });
      const slots = res.data?.data?.bookedSlots || [];
      setBookedSlots(slots);
      // Auto-switch selected hour if it happens to be booked
      setSelectedHour(prev => (slots.includes(prev) ? timeSlots.find(t => !slots.includes(t)) || prev : prev));
    } catch (err) {
      console.warn('Could not fetch court availability:', err);
    } finally {
      setLoadingSlots(false);
    }
  }, [court?.id, selectedDate, club.id]);

  useEffect(() => {
    fetchAvailability();
    const handleUpdate = () => fetchAvailability();
    const handleStorage = (e) => {
      if (e.key === 'ldce_booking_updated') {
        fetchAvailability();
      }
    };
    window.addEventListener('booking-updated', handleUpdate);
    window.addEventListener('court-booked', handleUpdate);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('booking-updated', handleUpdate);
      window.removeEventListener('court-booked', handleUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [fetchAvailability]);

  const handleBook = async () => {
    if (bookedSlots.includes(selectedHour)) {
      toast.error('This 1-hour session overlaps with an existing reservation and is unavailable. Please select another time slot.');
      return;
    }
    setSubmitting(true);
    try {
      const { startAt, endAt, displayRange } = getSlotTimestamps(selectedDate, selectedHour);

      if (slotPrice > 0) {
        // 1. Create Razorpay order
        let rzpOrder;
        try {
          const res = await api.post('/bookings/payments/razorpay/create-order', {
            amount: slotPrice,
            court_id: court.id,
            date: selectedDate,
            time: selectedHour,
          }, { headers: { 'x-club-id': club.id } });
          rzpOrder = res.data?.data;
        } catch {
          const res = await api.post('/bar/payments/razorpay/create-order', {
            amount: slotPrice,
          }, { headers: { 'x-club-id': club.id } });
          rzpOrder = res.data?.data;
        }

        if (!rzpOrder?.orderId) {
          throw new Error('Could not create Razorpay order for court slot');
        }

        // 2. Open Razorpay checkout
        setSubmitting(false);
        await openRazorpayCheckout({
          orderId: rzpOrder.orderId,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency || 'INR',
          name: `${club.name} - Court Booking`,
          description: `${court.name} (${selectedDate} at ${selectedHour})`,
          prefill: {
            name: user?.full_name || user?.name || '',
            email: user?.email || '',
            phone: user?.phone || '',
          },
          onSuccess: async (rzpResponse) => {
            setSubmitting(true);
            try {
              await api.post('/bookings', {
                court_id: court.id,
                start_at: startAt,
                end_at: endAt,
                member_id: memberId || undefined,
                guest_name: user?.full_name || user?.name || user?.email || 'Valued Athlete',
                channel: 'online',
                status: 'confirmed',
                amount: slotPrice,
                razorpay_payment_id: rzpResponse.razorpay_payment_id,
                paymentDetails: {
                  method: 'online',
                  reference: rzpResponse.razorpay_payment_id,
                },
              }, {
                headers: { 'x-club-id': club.id }
              });

              toast.success(`Court reserved! ${displayRange} confirmed.`);
              window.dispatchEvent(new CustomEvent('booking-updated'));
              window.dispatchEvent(new CustomEvent('court-booked'));
              localStorage.setItem('ldce_booking_updated', Date.now().toString());
              if (onBookingComplete) {
                onBookingComplete();
              }
              if (onClose) {
                onClose();
              }
            } catch (err) {
              console.error('Failed to create booking after payment:', err);
              toast.error(err.response?.data?.message || err.message || 'Payment received but failed to reserve court slot. Contact front desk.');
            } finally {
              setSubmitting(false);
            }
          },
          onDismiss: () => {
            setSubmitting(false);
          },
        });
        return;
      }

      // Free quota booking
      await api.post('/bookings', {
        court_id: court.id,
        start_at: startAt,
        end_at: endAt,
        member_id: memberId || undefined,
        guest_name: user?.full_name || user?.name || user?.email || 'Valued Athlete',
        channel: 'online',
        status: 'confirmed',
      }, {
        headers: { 'x-club-id': club.id }
      });

      toast.success(`Court slot booked! ${displayRange} confirmed under member quota.`);
      window.dispatchEvent(new CustomEvent('booking-updated'));
      window.dispatchEvent(new CustomEvent('court-booked'));
      localStorage.setItem('ldce_booking_updated', Date.now().toString());
      setSubmitting(false);
      if (onBookingComplete) onBookingComplete();
      if (onClose) onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to book slot');
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(26, 26, 24, 0.45)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }}>
      <div style={{
        background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E7E5DF',
        maxWidth: '520px', width: '100%', overflow: 'hidden',
        boxShadow: '0 12px 32px rgba(26, 26, 24, 0.12)'
      }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E7E5DF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1A1A18' }}>Book {court.name}</h3>
            <span style={{ fontSize: '0.8rem', color: '#6B6B66' }}>{court.sport_name || 'Sport Court'} • {court.surface || 'Standard'} • 1-Hour Session</span>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B6B66' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1A1A18' }}>
                Select Date
              </label>
              {loadingSlots && <span style={{ fontSize: '0.72rem', color: '#1F5C46', fontWeight: 600 }}>Checking real-time availability...</span>}
            </div>
            <input
              type="date"
              value={selectedDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px',
                border: '1px solid #E7E5DF', fontSize: '0.875rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1A1A18' }}>
                Select 1-Hour Session (Starts every 30 mins)
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.7rem' }}>
                <span style={{ color: '#10B981', fontWeight: 600 }}>● Available</span>
                <span style={{ color: '#EF4444', fontWeight: 600 }}>● Booked / Overlaps</span>
              </div>
            </div>

            {selectedHour && (
              <div style={{
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '6px',
                padding: '0.4rem 0.75rem',
                marginBottom: '0.6rem',
                fontSize: '0.75rem',
                color: '#166534',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontWeight: 600,
              }}>
                <span>Session Time: <strong>{getSlotTimestamps(selectedDate, selectedHour).displayRange}</strong></span>
                <span style={{ color: bookedSlots.includes(selectedHour) ? '#DC2626' : '#15803D' }}>
                  {bookedSlots.includes(selectedHour) ? '⚠️ Currently Booked' : '✓ Slot Available'}
                </span>
              </div>
            )}

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '0.45rem',
              maxHeight: '210px',
              overflowY: 'auto',
              paddingRight: '0.25rem'
            }}>
              {timeSlots.map(time => {
                const isBooked = bookedSlots.includes(time);
                const isSelected = selectedHour === time;
                const slotInfo = getSlotTimestamps(selectedDate, time);

                return (
                  <button
                    key={time}
                    type="button"
                    disabled={isBooked || submitting}
                    onClick={() => setSelectedHour(time)}
                    title={isBooked ? `Session ${slotInfo.displayRange} is already reserved or overlapping` : `Book 1-hour session: ${slotInfo.displayRange}`}
                    style={{
                      padding: '0.45rem 0.3rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      position: 'relative',
                      border: isSelected && !isBooked ? '1.5px solid #1F5C46' : isBooked ? '1px dashed #CBD5E1' : '1px solid #E7E5DF',
                      background: isSelected && !isBooked ? '#1F5C46' : isBooked ? '#F8FAFC' : '#FFFFFF',
                      color: isSelected && !isBooked ? '#FFFFFF' : isBooked ? '#94A3B8' : '#1A1A18',
                      cursor: isBooked ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.1rem',
                    }}
                  >
                    <span style={{ textDecoration: isBooked ? 'line-through' : 'none' }}>{time}</span>
                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      color: isBooked ? '#DC2626' : isSelected ? '#A7F3D0' : '#10B981',
                      textTransform: 'uppercase'
                    }}>
                      {isBooked ? 'Booked' : 'Open'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {slotPrice > 0 ? (
            <div style={{
              background: '#FAF9F6', border: '1px solid #E7E5DF', borderRadius: '8px',
              padding: '0.85rem 1rem', marginBottom: '1.25rem', fontSize: '0.85rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ color: '#6B6B66' }}>Standard Hourly Rate:</span>
                <span>₹{effectiveBaseRate}</span>
              </div>
              {effectiveBaseRate > slotPrice && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', color: '#15803D' }}>
                  <span>Member Plan Privilege ({discountPct > 0 ? `${discountPct}% Off` : 'Special Rate'}):</span>
                  <span>-₹{Math.max(0, effectiveBaseRate - slotPrice)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.35rem', borderTop: '1px solid #E7E5DF', fontWeight: 700 }}>
                <span>Payable Amount:</span>
                <span style={{ color: '#1F5C46', fontSize: '1rem' }}>
                  {loadingPrice ? 'Calculating...' : `₹${slotPrice} via Razorpay`}
                </span>
              </div>
            </div>
          ) : (
            <div style={{
              background: '#F0FDF4', border: '1px solid #DCFCE7', borderRadius: '6px',
              padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: '#15803D'
            }}>
              ✓ Active Member Quota Applied — 100% Free Court Reservation.
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                flex: 1, padding: '0.65rem 1rem', background: '#FFFFFF',
                border: '1px solid #E7E5DF', borderRadius: '6px',
                fontWeight: 600, fontSize: '0.875rem', color: '#1A1A18', cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBook}
              disabled={submitting}
              style={{
                flex: 2, padding: '0.65rem 1rem', background: '#1F5C46',
                border: 'none', borderRadius: '6px',
                fontWeight: 600, fontSize: '0.875rem', color: '#FFFFFF', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
              }}
            >
              {submitting ? 'Reserving...' : slotPrice > 0 ? (
                <>
                  <CreditCard size={15} />
                  <span>Pay ₹{slotPrice} with Razorpay</span>
                </>
              ) : 'Confirm Free Reservation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Club Page (Member Portal vs Non-Member Showcase) ───────────────────
export default function ClubDetailsPage() {
  const { clubId, slug, tab } = useParams();
  const identifier = clubId || slug;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAuthenticated, changeClub } = useAuth();

  const [club, setClub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState(null);
  const [bookingCourt, setBookingCourt] = useState(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  // Tab State: overview, courts, bookings, pos, shop, orders, membership
  const activeTab = tab || 'overview';

  // Bookings list state for member
  const [memberBookings, setMemberBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  const loadClub = useCallback(async () => {
    if (!identifier) return;
    setLoading(true);
    setError(null);
    try {
      const data = await clubsApi.getClubDetails(identifier);
      if (!data) throw new Error('Club not found');
      setClub(data);
      if (changeClub) {
        changeClub(data.id, data.membership?.is_member ? 'member' : 'public');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load club details');
    } finally {
      setLoading(false);
    }
  }, [identifier, changeClub]);

  useEffect(() => {
    loadClub();
  }, [loadClub]);

  const loadMemberBookings = useCallback(async () => {
    if (!club?.id) return;
    setLoadingBookings(true);
    try {
      const res = await api.get('/bookings', { headers: { 'x-club-id': club.id } });
      setMemberBookings(res.data?.bookings || []);
    } catch (e) {
      console.warn('Could not load member bookings:', e.message);
    } finally {
      setLoadingBookings(false);
    }
  }, [club?.id]);

  useEffect(() => {
    if (activeTab === 'bookings' && club?.membership?.is_member) {
      loadMemberBookings();
    }
  }, [activeTab, club?.membership?.is_member, loadMemberBookings]);

  const handleTabChange = (targetTab) => {
    const clubIdentifier = club?.slug || club?.id;
    if (targetTab === 'shop') {
      if (club?.id && changeClub) {
        changeClub(club.id, club.membership?.is_member ? 'member' : 'public');
      }
      navigate(`/inventory?clubId=${club?.id || clubIdentifier}`);
      return;
    }
    if (targetTab === 'orders') {
      if (club?.id && changeClub) {
        changeClub(club.id, club.membership?.is_member ? 'member' : 'public');
      }
      navigate(`/orders?clubId=${club?.id || clubIdentifier}`);
      return;
    }
    if (targetTab === 'overview') {
      navigate(`/club/${clubIdentifier}`);
    } else {
      navigate(`/club/${clubIdentifier}/${targetTab}`);
    }
  };

  useEffect(() => {
    if (activeTab === 'shop' && club?.id) {
      if (changeClub) {
        changeClub(club.id, club.membership?.is_member ? 'member' : 'public');
      }
      navigate(`/inventory?clubId=${club.id}`, { replace: true });
    } else if (activeTab === 'orders' && club?.id) {
      if (changeClub) {
        changeClub(club.id, club.membership?.is_member ? 'member' : 'public');
      }
      navigate(`/orders?clubId=${club.id}`, { replace: true });
    }
  }, [activeTab, club?.id, changeClub, navigate]);

  const handleCopyDomain = (domainStr) => {
    navigator.clipboard.writeText(domainStr);
    setCopiedDomain(true);
    toast.success('Custom club domain copied to clipboard!');
    setTimeout(() => setCopiedDomain(false), 2500);
  };

  const handleSelectPlan = (plan) => {
    if (!isAuthenticated) {
      toast.info('Please sign in or create an account to join this club');
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    setSelectedPlanForCheckout(plan);
  };

  const handleJoinSuccess = async (planId, paymentDetails = null) => {
    try {
      const res = await clubsApi.joinClub(club.id, planId, paymentDetails);
      toast.success(res.message || 'Successfully joined club!');
      changeClub(club.id, 'member');
      setSelectedPlanForCheckout(null);
      await loadClub();
      navigate(`/club/${club.slug || club.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete registration');
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await api.put(`/bookings/${bookingId}/cancel`, {}, { headers: { 'x-club-id': club.id } });
      toast.success('Booking cancelled successfully');
      loadMemberBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel booking');
    }
  };

  const domainUrl = useMemo(() => {
    if (!club?.slug) return '';
    return `https://${club.slug}.clubos.app`;
  }, [club]);

  if (loading) {
    return (
      <div style={{
        minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '1rem', color: '#6B6B66', background: '#FAF9F6'
      }}>
        <div style={{
          width: '32px', height: '32px', border: '3px solid rgba(31, 92, 70, 0.2)',
          borderTopColor: '#1F5C46', borderRadius: '50%', animation: 'df-spin 0.8s linear infinite'
        }} />
        <span style={{ fontSize: '0.875rem' }}>Loading club portal...</span>
      </div>
    );
  }

  if (error || !club) {
    return (
      <div style={{ padding: '3rem 1.5rem', maxWidth: '640px', margin: '0 auto', textAlign: 'center', background: '#FAF9F6' }}>
        <AlertCircle size={44} color="#DC2626" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1A1A18', marginBottom: '0.5rem' }}>Club Not Found</h2>
        <p style={{ color: '#6B6B66', marginBottom: '1.5rem' }}>{error || "The club you requested could not be found or has been deactivated."}</p>
        <Link to="/user/dashboard" style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.5rem 1.25rem', background: '#1F5C46', color: '#FFFFFF',
          borderRadius: '6px', textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem'
        }}>
          <ArrowLeft size={16} />
          <span>Back to Clubs Directory</span>
        </Link>
      </div>
    );
  }

  const membership = club.membership;
  const isMember = Boolean(membership?.is_member);
  const hasPlans = club.plans && club.plans.length > 0;

  // Fallback gallery images
  const displayGallery = club.gallery?.length > 0 ? club.gallery : [
    { id: 'def-1', image_url: DEFAULT_SPORT_IMAGES[club.sports?.[0]?.name?.toLowerCase()] || DEFAULT_SPORT_IMAGES.default, caption: 'Main Championship Court' },
    { id: 'def-2', image_url: DEFAULT_SPORT_IMAGES.padel, caption: 'Indoor Training Arena' },
    { id: 'def-3', image_url: DEFAULT_SPORT_IMAGES.tennis, caption: 'Floodlit Match Play' },
  ];

  // ═════════════════════════════════════════════════════════════════════════════
  // VIEW 1: MEMBER ACTIVE CLUB PORTAL (When User IS a Member)
  // ═════════════════════════════════════════════════════════════════════════════
  if (isMember) {
    return (
      <div style={{ background: '#FAF9F6', minHeight: '100vh', paddingBottom: '4rem' }}>
        {/* In-Club Court Booking Modal */}
        {bookingCourt && (
          <CourtBookingModal
            club={club}
            court={bookingCourt}
            memberId={membership?.member_id}
            user={user}
            onClose={() => setBookingCourt(null)}
            onBookingComplete={() => {
              setBookingCourt(null);
              fetchBookings();
              handleTabChange('bookings');
            }}
          />
        )}

        {/* Member Plan Renewal / Upgrade Modal via Razorpay */}
        {selectedPlanForCheckout && (
          <RazorpayModal
            club={club}
            plan={selectedPlanForCheckout}
            user={user}
            onClose={() => setSelectedPlanForCheckout(null)}
            onSuccess={handleJoinSuccess}
          />
        )}

        {/* Top Breadcrumb Nav */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem 1.5rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/user/dashboard" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            color: '#6B6B66', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500
          }}>
            <ArrowLeft size={14} />
            <span>All Clubs Directory</span>
          </Link>

          <span style={{
            fontSize: '0.75rem', fontWeight: 600, color: '#15803D',
            background: '#F0FDF4', border: '1px solid #DCFCE7', padding: '0.2rem 0.6rem', borderRadius: '4px'
          }}>
            ✓ Active Member • {membership.member_code}
          </span>
        </div>

        {/* ─── Club Member Workspace Header ─── */}
        <div style={{ maxWidth: '1200px', margin: '1rem auto 0', padding: '0 1.5rem' }}>
          <div style={{
            background: '#FFFFFF', border: '1px solid #E7E5DF', borderRadius: '12px',
            padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                {club.logo_url ? (
                  <img src={club.logo_url} alt={club.name} style={{
                    width: '64px', height: '64px', borderRadius: '12px',
                    objectFit: 'cover', border: '2px solid #FFFFFF',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                  }} />
                ) : (
                  <div style={{
                    width: '64px', height: '64px', borderRadius: '12px',
                    background: '#1F5C46', color: '#FFFFFF', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', fontWeight: 800
                  }}>
                    {club.name?.charAt(0) || 'C'}
                  </div>
                )}

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1A1A18', margin: 0 }}>
                      {club.name}
                    </h1>
                    <span style={{
                      fontSize: '0.75rem', fontWeight: 700, color: '#1F5C46',
                      background: '#EBF3F0', padding: '0.15rem 0.5rem', borderRadius: '4px'
                    }}>
                      {membership.plan_name || 'Active Member'}
                    </span>
                  </div>

                  {domainUrl && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <span style={{ fontSize: '0.8rem', color: '#6B6B66', fontFamily: 'monospace' }}>
                        {domainUrl}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyDomain(domainUrl)}
                        title="Copy Domain"
                        style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: copiedDomain ? '#15803D' : '#6B6B66' }}
                      >
                        {copiedDomain ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Renewal Status Pill */}
              <div style={{
                background: membership.needs_renewal ? '#FEF2F2' : '#F0FDF4',
                border: membership.needs_renewal ? '1px solid #FEE2E2' : '1px solid #DCFCE7',
                borderRadius: '8px', padding: '0.5rem 1rem', textAlign: 'right'
              }}>
                <div style={{
                  fontSize: '0.85rem', fontWeight: 800,
                  color: membership.needs_renewal ? '#DC2626' : '#15803D'
                }}>
                  {membership.days_remaining != null ? (
                    membership.days_remaining <= 0 ? 'Membership Expired' :
                    membership.days_remaining === 1 ? 'Renews Tomorrow' :
                    `Renews in ${membership.days_remaining} days`
                  ) : 'Active Plan'}
                </div>
                <div style={{ fontSize: '0.725rem', color: '#6B6B66' }}>
                  Pass ID: <strong style={{ fontFamily: 'monospace' }}>{membership.member_code}</strong>
                </div>
                {club.plans?.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSelectPlan(club.plans[0])}
                    style={{
                      marginTop: '0.45rem', padding: '0.3rem 0.75rem',
                      background: '#1F5C46', color: '#FFFFFF', border: 'none',
                      borderRadius: '5px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: '0.35rem'
                    }}
                  >
                    <CreditCard size={12} />
                    <span>Renew / Extend with Razorpay</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Privileges Strip */}
            <div style={{
              display: 'flex', gap: '1.5rem', flexWrap: 'wrap',
              paddingTop: '0.85rem', borderTop: '1px solid #E7E5DF', fontSize: '0.825rem', color: '#6B6B66'
            }}>
              <div>
                <strong>Court Privilege:</strong> {membership.court_free ? '🆓 100% Free Bookings' : `${membership.court_discount_percent || 0}% Discount`}
              </div>
              <div>
                <strong>Daily Quota:</strong> {membership.max_bookings_per_day ? `${membership.max_bookings_per_day} slots/day` : 'Unlimited'}
              </div>
              <div>
                <strong>Pro Shop & Cafe:</strong> {membership.shop_discount_percent || 0}% Off Shop • {membership.bar_discount_percent || 0}% Off Bar
              </div>
            </div>
          </div>

          {/* ─── TAB 1: OVERVIEW & DASHBOARD ─── */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Quick Launch Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                {[
                  { id: 'courts', title: 'Courts & Availability', desc: `${club.courts?.length || 0} courts ready for play`, icon: Trophy, btn: 'Book Slot' },
                  { id: 'bookings', title: 'My Bookings', desc: 'View and manage your reservations', icon: Calendar, btn: 'View Schedule' },
                  { id: 'pos', title: 'POS', desc: 'Club counter & bar point-of-sale', icon: Coffee, btn: 'Open POS' },
                  { id: 'shop', title: 'Shop', desc: 'Merchandise & athletic equipment', icon: ShoppingBag, btn: 'Open Shop' },
                  { id: 'orders', title: 'Orders', desc: 'My receipts and order history', icon: Warehouse, btn: 'View Orders' },
                  { id: 'membership', title: 'My Membership', desc: 'Digital pass & membership perks', icon: IdCard, btn: 'View Pass' },
                ].map(card => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.id}
                      onClick={() => handleTabChange(card.id)}
                      style={{
                        background: '#FFFFFF', border: '1px solid #E7E5DF', borderRadius: '10px',
                        padding: '1.25rem', cursor: 'pointer', transition: 'all 0.15s ease',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{
                          width: '38px', height: '38px', borderRadius: '8px',
                          background: '#EBF3F0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          marginBottom: '0.75rem'
                        }}>
                          <Icon size={20} color="#1F5C46" />
                        </div>
                        <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 700, color: '#1A1A18' }}>
                          {card.title}
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#6B6B66' }}>
                          {card.desc}
                        </p>
                      </div>

                      <div style={{
                        marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.35rem',
                        fontSize: '0.8rem', fontWeight: 600, color: '#1F5C46'
                      }}>
                        <span>{card.btn}</span>
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Courts Quick Overview */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E7E5DF', borderRadius: '10px', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1A1A18' }}>
                    Courts at {club.name}
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleTabChange('courts')}
                    style={{
                      background: 'none', border: 'none', color: '#1F5C46',
                      fontWeight: 600, fontSize: '0.825rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem'
                    }}
                  >
                    <span>View all courts</span>
                    <ChevronRight size={14} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                  {club.courts?.map(c => (
                    <div key={c.id} style={{
                      padding: '1rem', background: '#FAF9F6', borderRadius: '8px', border: '1px solid #E7E5DF',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1A1A18' }}>{c.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6B6B66' }}>{c.surface || 'Standard'} • {c.sport_name || 'Racquet'}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBookingCourt(c)}
                        style={{
                          padding: '0.4rem 0.8rem', background: '#1F5C46', color: '#FFFFFF',
                          border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer'
                        }}
                      >
                        Book
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 2: COURTS ─── */}
          {activeTab === 'courts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1A1A18', margin: 0 }}>
                  Courts & Slots
                </h2>
                <span style={{ fontSize: '0.85rem', color: '#6B6B66' }}>
                  Book your match slots on any of {club.name}'s courts
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                {club.courts?.map(c => (
                  <div key={c.id} style={{
                    background: '#FFFFFF', border: '1px solid #E7E5DF', borderRadius: '10px',
                    padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1A1A18' }}>{c.name}</h3>
                        <span style={{
                          fontSize: '0.75rem', fontWeight: 600, color: '#1F5C46',
                          background: '#EBF3F0', padding: '0.15rem 0.5rem', borderRadius: '4px'
                        }}>
                          {c.sport_name || 'Racquet'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.8rem', color: '#6B6B66', margin: '0.75rem 0 1.25rem' }}>
                        <span>Surface: <strong style={{ color: '#1A1A18' }}>{c.surface || 'Standard'}</strong></span>
                        <span>•</span>
                        <span>{c.is_indoor ? 'Indoor' : 'Outdoor'}</span>
                        <span>•</span>
                        <span>Max {c.max_players || 4} Players</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setBookingCourt(c)}
                      style={{
                        width: '100%', padding: '0.65rem', background: '#1F5C46', color: '#FFFFFF',
                        border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                      }}
                    >
                      <Calendar size={14} />
                      <span>Book Slot on This Court</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── TAB 3: BOOKINGS ─── */}
          {activeTab === 'bookings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1A1A18', margin: 0 }}>
                    My Bookings at {club.name}
                  </h2>
                  <span style={{ fontSize: '0.85rem', color: '#6B6B66' }}>
                    View upcoming slots and manage your play reservations
                  </span>
                </div>
                <button
                  type="button"
                  onClick={loadMemberBookings}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                    padding: '0.4rem 0.8rem', background: '#FFFFFF', border: '1px solid #E7E5DF',
                    borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', color: '#6B6B66'
                  }}
                >
                  <RefreshCw size={13} /> Refresh
                </button>
              </div>

              {loadingBookings ? (
                <div style={{ background: '#FFFFFF', padding: '2rem', textAlign: 'center', borderRadius: '10px', color: '#6B6B66' }}>
                  Loading reservations...
                </div>
              ) : memberBookings.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {memberBookings.map(b => (
                    <div key={b.id} style={{
                      background: '#FFFFFF', border: '1px solid #E7E5DF', borderRadius: '10px',
                      padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      flexWrap: 'wrap', gap: '1rem'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1A1A18' }}>
                            {b.court_name || 'Court'}
                          </h4>
                          <span style={{
                            fontSize: '0.75rem', fontWeight: 600,
                            background: b.status === 'confirmed' ? '#F0FDF4' : (b.status === 'cancelled' ? '#FEF2F2' : '#FEF3C7'),
                            color: b.status === 'confirmed' ? '#15803D' : (b.status === 'cancelled' ? '#DC2626' : '#B45309'),
                            padding: '0.15rem 0.5rem', borderRadius: '4px'
                          }}>
                            {b.status?.toUpperCase() || 'CONFIRMED'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.825rem', color: '#6B6B66', marginTop: '0.35rem' }}>
                          {new Date(b.start_at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} • {' '}
                          {new Date(b.start_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} - {' '}
                          {new Date(b.end_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      {b.status !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={() => handleCancelBooking(b.id)}
                          style={{
                            padding: '0.4rem 0.85rem', background: '#FFFFFF', border: '1px solid #FCA5A5',
                            color: '#DC2626', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'
                          }}
                        >
                          Cancel Slot
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background: '#FFFFFF', border: '1px solid #E7E5DF', borderRadius: '10px', padding: '3rem', textAlign: 'center', color: '#6B6B66' }}>
                  <p style={{ margin: '0 0 1rem' }}>You have no reservations at {club.name} yet.</p>
                  <button
                    type="button"
                    onClick={() => handleTabChange('courts')}
                    style={{
                      padding: '0.55rem 1.25rem', background: '#1F5C46', color: '#FFFFFF',
                      borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
                    }}
                  >
                    Book a Court Now
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ─── TAB 4: POS (Point of Sale Module Placeholder) ─── */}
          {/* ─── TAB 4: POS & CLUB CAFE ─── */}
          {activeTab === 'pos' && (
            <MemberCafe club={club} membership={club?.membership} />
          )}

          {/* ─── TAB 5: SHOP (Pro Shop Module Placeholder) ─── */}
          {activeTab === 'shop' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1A1A18', margin: 0 }}>
                    Shop
                  </h2>
                  <span style={{ fontSize: '0.85rem', color: '#6B6B66' }}>
                    Pro Shop, Equipment & Merchandise Module
                  </span>
                </div>
                <span style={{
                  fontSize: '0.75rem', fontWeight: 600, color: '#1F5C46',
                  background: '#EBF3F0', padding: '0.25rem 0.6rem', borderRadius: '4px'
                }}>
                  Shop Module Scoped to {club.name}
                </span>
              </div>

              <div style={{
                background: '#FFFFFF', border: '1px solid #E7E5DF', borderRadius: '10px',
                padding: '3rem 2rem', textAlign: 'center'
              }}>
                <ShoppingBag size={44} color="#1F5C46" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ margin: '0 0 0.5rem', color: '#1A1A18', fontSize: '1.2rem', fontWeight: 700 }}>
                  Club Shop & Merchandise
                </h3>
                <p style={{ color: '#6B6B66', fontSize: '0.875rem', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
                  Browse available sports equipment, rackets, club apparel, and accessories for {club.name}.
                </p>
                <button
                  type="button"
                  onClick={() => navigate(`/inventory?clubId=${club.id}`)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.65rem 1.25rem', background: '#1F5C46', color: '#FFFFFF',
                    borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
                  }}
                >
                  <ShoppingBag size={16} />
                  <span>Open Pro Shop Inventory</span>
                </button>
              </div>
            </div>
          )}

          {/* ─── TAB 6: ORDERS ─── */}
          {activeTab === 'orders' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1A1A18', margin: 0 }}>
                  Orders
                </h2>
                <span style={{ fontSize: '0.85rem', color: '#6B6B66' }}>
                  Your club purchases and receipts history
                </span>
              </div>

              <div style={{
                background: '#FFFFFF', border: '1px solid #E7E5DF', borderRadius: '10px',
                padding: '3rem 2rem', textAlign: 'center'
              }}>
                <Warehouse size={44} color="#1F5C46" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ margin: '0 0 0.5rem', color: '#1A1A18', fontSize: '1.2rem', fontWeight: 700 }}>
                  Club Orders & Receipts
                </h3>
                <p style={{ color: '#6B6B66', fontSize: '0.875rem', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
                  View your complete order receipts, order statuses, and fulfillment tracking for {club.name}.
                </p>
                <button
                  type="button"
                  onClick={() => navigate(`/orders?clubId=${club.id}`)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.65rem 1.25rem', background: '#1F5C46', color: '#FFFFFF',
                    borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
                  }}
                >
                  <Warehouse size={16} />
                  <span>View All Orders & Receipts</span>
                </button>
              </div>
            </div>
          )}

          {/* ─── TAB 7: MEMBERSHIP ("Things of Mine") ─── */}
          {activeTab === 'membership' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1A1A18', margin: 0 }}>
                  My Membership & Privileges
                </h2>
                <span style={{ fontSize: '0.85rem', color: '#6B6B66' }}>
                  Your verified club pass, quota limits, and member benefits
                </span>
              </div>

              <div style={{
                background: '#FFFFFF', border: '1px solid #1F5C46', borderRadius: '12px',
                padding: '2rem', boxShadow: '0 4px 16px rgba(31, 92, 70, 0.08)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{
                      width: '60px', height: '60px', borderRadius: '12px',
                      background: '#EBF3F0', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <IdCard size={32} color="#1F5C46" />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B6B66', fontWeight: 600 }}>
                        Official Member Pass
                      </span>
                      <h2 style={{ margin: '0.15rem 0', fontSize: '1.35rem', fontWeight: 800, color: '#1A1A18' }}>
                        {user?.name || 'Club Member'}
                      </h2>
                      <div style={{ fontSize: '0.9rem', color: '#1F5C46', fontFamily: 'monospace', fontWeight: 700 }}>
                        PASS ID: {membership.member_code}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    background: membership.needs_renewal ? '#FEF2F2' : '#F0FDF4',
                    border: membership.needs_renewal ? '1px solid #FEE2E2' : '1px solid #DCFCE7',
                    borderRadius: '8px', padding: '0.75rem 1.25rem', textAlign: 'right'
                  }}>
                    <div style={{
                      fontSize: '0.95rem', fontWeight: 800,
                      color: membership.needs_renewal ? '#DC2626' : '#15803D'
                    }}>
                      {membership.days_remaining != null ? (
                        membership.days_remaining <= 0 ? 'Membership Expired' :
                        membership.days_remaining === 1 ? 'Renews Tomorrow' :
                        `Renews in ${membership.days_remaining} days`
                      ) : 'Active Plan'}
                    </div>
                    {membership.end_date && (
                      <div style={{ fontSize: '0.75rem', color: '#6B6B66' }}>
                        Valid until {new Date(membership.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem',
                  marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #E7E5DF'
                }}>
                  <div style={{ background: '#FAF9F6', padding: '1rem', borderRadius: '8px', border: '1px solid #E7E5DF' }}>
                    <span style={{ fontSize: '0.75rem', color: '#6B6B66', display: 'block', marginBottom: '0.2rem' }}>Subscribed Tier</span>
                    <strong style={{ color: '#1A1A18', fontSize: '1rem' }}>{membership.plan_name || 'Standard Tier'}</strong>
                  </div>
                  <div style={{ background: '#FAF9F6', padding: '1rem', borderRadius: '8px', border: '1px solid #E7E5DF' }}>
                    <span style={{ fontSize: '0.75rem', color: '#6B6B66', display: 'block', marginBottom: '0.2rem' }}>Daily Booking Limit</span>
                    <strong style={{ color: '#1A1A18', fontSize: '1rem' }}>
                      {membership.max_bookings_per_day ? `${membership.max_bookings_per_day} reservations / day` : 'Unlimited'}
                    </strong>
                  </div>
                  <div style={{ background: '#FAF9F6', padding: '1rem', borderRadius: '8px', border: '1px solid #E7E5DF' }}>
                    <span style={{ fontSize: '0.75rem', color: '#6B6B66', display: 'block', marginBottom: '0.2rem' }}>Court Play Privilege</span>
                    <strong style={{ color: '#15803D', fontSize: '1rem' }}>
                      {membership.court_free ? '🆓 100% Free Court Play' : `${membership.court_discount_percent || 0}% Off Standard Rate`}
                    </strong>
                  </div>
                  <div style={{ background: '#FAF9F6', padding: '1rem', borderRadius: '8px', border: '1px solid #E7E5DF' }}>
                    <span style={{ fontSize: '0.75rem', color: '#6B6B66', display: 'block', marginBottom: '0.2rem' }}>Commercial Discounts</span>
                    <strong style={{ color: '#1A1A18', fontSize: '1rem' }}>
                      {membership.shop_discount_percent || 0}% Off Shop • {membership.bar_discount_percent || 0}% Off Bar
                    </strong>
                  </div>
                </div>

                {/* Renewal Plans Grid if Membership Expiring or Member Wishes to Extend */}
                {club.plans?.length > 0 && (
                  <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #E7E5DF' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1A1A18' }}>
                          Extend or Upgrade Membership
                        </h3>
                        <span style={{ fontSize: '0.8rem', color: '#6B6B66' }}>
                          Instant renewal via Razorpay test gateway
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', background: '#EBF3F0', color: '#1F5C46', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                        ⚡ Instant Gateway Activation
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                      {club.plans.map(p => (
                        <div key={p.id} style={{
                          background: '#FAF9F6', border: '1px solid #E7E5DF', borderRadius: '8px', padding: '1.25rem',
                          display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                        }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                              <strong style={{ fontSize: '0.95rem', color: '#1A1A18' }}>{p.name}</strong>
                              <span style={{ fontSize: '0.75rem', color: '#6B6B66' }}>{p.duration_days} days</span>
                            </div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1F5C46', marginBottom: '0.75rem' }}>
                              ₹{Number(p.price || 0).toLocaleString()}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#6B6B66', marginBottom: '1rem' }}>
                              {p.court_free ? '✓ Free court booking' : `✓ ${p.court_discount_percent || 0}% court discount`}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSelectPlan(p)}
                            style={{
                              width: '100%', padding: '0.55rem', background: '#1F5C46', color: '#FFFFFF',
                              border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                            }}
                          >
                            <CreditCard size={14} />
                            <span>Renew with Razorpay</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // VIEW 2: PUBLIC SALES & DETAIL PAGE (When User is NOT a Member)
  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ background: '#FAF9F6', minHeight: '100vh', paddingBottom: '4rem' }}>
      {/* Razorpay Modal */}
      {selectedPlanForCheckout && (
        <RazorpayModal
          club={club}
          plan={selectedPlanForCheckout}
          user={user}
          onClose={() => setSelectedPlanForCheckout(null)}
          onSuccess={handleJoinSuccess}
        />
      )}

      {/* Top Breadcrumb Nav */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem 1.5rem 0' }}>
        <Link to="/user/dashboard" style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          color: '#6B6B66', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500
        }}>
          <ArrowLeft size={14} />
          <span>All Clubs Directory</span>
        </Link>
      </div>

      {/* Hero Cover & Branding */}
      <div style={{ maxWidth: '1200px', margin: '1rem auto 0', padding: '0 1.5rem' }}>
        <div style={{
          position: 'relative', height: '260px', borderRadius: '12px 12px 0 0',
          overflow: 'hidden', background: club.brand_color || '#1F5C46',
          border: '1px solid #E7E5DF', borderBottom: 'none'
        }}>
          {club.cover_url ? (
            <img src={club.cover_url} alt={club.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: `linear-gradient(135deg, ${club.brand_color || '#1F5C46'} 0%, #003624 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Trophy size={64} color="rgba(255,255,255,0.15)" />
            </div>
          )}
        </div>

        {/* Club Meta Header Box */}
        <div style={{
          background: '#FFFFFF', border: '1px solid #E7E5DF', borderRadius: '0 0 12px 12px',
          padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
              {club.logo_url ? (
                <img src={club.logo_url} alt={club.name} style={{
                  width: '76px', height: '76px', borderRadius: '12px',
                  objectFit: 'cover', border: '2px solid #FFFFFF',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }} />
              ) : (
                <div style={{
                  width: '76px', height: '76px', borderRadius: '12px',
                  background: '#1F5C46', color: '#FFFFFF', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', fontWeight: 800
                }}>
                  {club.name?.charAt(0) || 'C'}
                </div>
              )}

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1A1A18', margin: 0 }}>
                    {club.name}
                  </h1>
                  {club.city && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                      fontSize: '0.8rem', color: '#6B6B66', background: '#FAF9F6',
                      padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #E7E5DF'
                    }}>
                      <MapPin size={12} />
                      {club.city}{club.state ? `, ${club.state}` : ''}
                    </span>
                  )}
                </div>

                {domainUrl && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#1F5C46', fontFamily: 'monospace', fontWeight: 600 }}>
                      {domainUrl}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyDomain(domainUrl)}
                      title="Copy Custom Domain"
                      style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: copiedDomain ? '#15803D' : '#6B6B66' }}
                    >
                      {copiedDomain ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                background: hasPlans ? '#F0FDF4' : '#FFFBEB',
                color: hasPlans ? '#15803D' : '#B45309',
                border: hasPlans ? '1px solid #DCFCE7' : '1px solid #FEF3C7',
                borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, padding: '0.35rem 0.75rem'
              }}>
                {hasPlans ? '● Accepting New Members' : '● Admissions Paused'}
              </span>
            </div>
          </div>

          {club.tagline && (
            <p style={{ margin: 0, color: '#6B6B66', fontSize: '0.925rem', lineHeight: '1.45' }}>
              {club.tagline}
            </p>
          )}
        </div>

        {/* Admissions closed alert if no plans */}
        {!hasPlans && (
          <div style={{
            background: '#FFFBEB', border: '1px solid #FEF3C7', borderRadius: '8px',
            padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center'
          }}>
            <AlertCircle size={20} color="#D97706" />
            <div>
              <strong style={{ color: '#92400E', fontSize: '0.9rem', display: 'block' }}>
                Admissions Currently Closed
              </strong>
              <span style={{ color: '#B45309', fontSize: '0.825rem' }}>
                This club does not currently have any active membership tiers open for public subscription.
              </span>
            </div>
          </div>
        )}

        {/* Facilities + Gallery Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E7E5DF', borderRadius: '10px', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1A1A18', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Trophy size={18} color="#1F5C46" />
              <span>Available Sports & Facilities</span>
            </h2>

            {club.sports?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {club.sports.map(s => (
                  <div key={s.id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem', background: '#FAF9F6', borderRadius: '6px',
                    border: '1px solid #E7E5DF'
                  }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '6px',
                      background: '#EBF3F0', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Trophy size={16} color="#1F5C46" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1A1A18' }}>{s.name}</div>
                      {s.description && <div style={{ fontSize: '0.75rem', color: '#6B6B66' }}>{s.description}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#6B6B66', fontSize: '0.85rem' }}>Multiple racquet and court sports supported.</p>
            )}

            {club.courts?.length > 0 && (
              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #E7E5DF' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6B6B66', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Registered Courts ({club.courts.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {club.courts.map(c => (
                    <span key={c.id} style={{
                      fontSize: '0.75rem', background: '#FFFFFF', border: '1px solid #E7E5DF',
                      padding: '0.25rem 0.6rem', borderRadius: '4px', color: '#1A1A18'
                    }}>
                      {c.name} {c.surface ? `(${c.surface})` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid #E7E5DF', borderRadius: '10px', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1A1A18', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} color="#1F5C46" />
              <span>Facility Showcase</span>
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
              {displayGallery.slice(0, 6).map((img, idx) => (
                <div
                  key={img.id || idx}
                  style={{
                    height: '110px', borderRadius: '6px', overflow: 'hidden',
                    position: 'relative', border: '1px solid #E7E5DF', background: '#FAF9F6'
                  }}
                >
                  <img
                    src={img.image_url}
                    alt={img.caption || `Facility ${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {img.caption && (
                    <div style={{
                      position: 'absolute', bottom: 0, insetInline: 0,
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
                      color: '#FFFFFF', fontSize: '0.65rem', padding: '0.2rem 0.4rem',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                      {img.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Public Plans Pricing Table */}
        <div style={{
          background: '#FFFFFF', border: '1px solid #E7E5DF', borderRadius: '10px',
          padding: '1.75rem', marginBottom: '1.5rem'
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1A1A18', margin: '0 0 0.25rem' }}>
              Join Club & Choose Your Plan
            </h2>
            <p style={{ margin: 0, color: '#6B6B66', fontSize: '0.875rem' }}>
              Select an active membership tier to unlock instant access to court bookings and club privileges.
            </p>
          </div>

          {hasPlans ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {club.plans.map(p => {
                const price = Number(p.price || 0);
                return (
                  <div
                    key={p.id}
                    style={{
                      border: '1px solid #E7E5DF', borderRadius: '8px', padding: '1.25rem',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                      background: '#FFFFFF', transition: 'all 0.15s ease'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1A1A18' }}>{p.name}</h3>
                        <span style={{ fontSize: '0.75rem', color: '#6B6B66' }}>{p.duration_days} days</span>
                      </div>

                      <div style={{ margin: '0.75rem 0', display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1F5C46', fontFamily: 'monospace' }}>
                          ₹{price.toLocaleString()}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#6B6B66' }}>/ billing period</span>
                      </div>

                      {p.description && (
                        <p style={{ fontSize: '0.8rem', color: '#6B6B66', margin: '0 0 1rem', lineHeight: '1.4' }}>
                          {p.description}
                        </p>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#1A1A18' }}>
                          <Check size={14} color="#1F5C46" />
                          <span>{p.court_free ? 'Free court reservations' : `${p.court_discount_percent || 0}% court booking discount`}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#1A1A18' }}>
                          <Check size={14} color="#1F5C46" />
                          <span>{p.max_bookings_per_day ? `${p.max_bookings_per_day} bookings / day limit` : 'Unlimited bookings'}</span>
                        </div>
                        {p.benefits?.map((b, i) => (
                          <div key={b.id || i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#1A1A18' }}>
                            <Check size={14} color="#1F5C46" />
                            <span>{b.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectPlan(p)}
                      style={{
                        width: '100%', padding: '0.65rem 1rem', background: '#1F5C46',
                        color: '#FFFFFF', border: 'none', borderRadius: '6px',
                        fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
                      }}
                    >
                      Join with This Plan
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#6B6B66' }}>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>
                No membership tiers currently open for enrollment. Check back soon.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
