import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import useAuth from '../../auth/hook/useAuth.js';
import { useToast } from '../../../shared/context/ToastContext.jsx';
import { clubsApi } from '../services/clubs.api.js';
import {
  MapPin, Phone, Mail, Globe, Trophy, ShieldCheck,
  Calendar, Check, AlertCircle, ArrowLeft, ExternalLink,
  CreditCard, Sparkles, Clock, Copy, CheckCircle2, ChevronRight, UserCheck
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

// ─── Razorpay Simulation Modal ───────────────────────────────────────────────
function RazorpayModal({ club, plan, onClose, onSuccess }) {
  const [method, setMethod] = useState('upi');
  const [processing, setProcessing] = useState(false);
  const price = Number(plan?.price || 0);
  const joiningFee = Number(plan?.joining_fee || 0);
  const total = price + joiningFee;

  const handlePay = async () => {
    setProcessing(true);
    // Simulate brief payment processing delay
    await new Promise(r => setTimeout(r, 900));
    try {
      await onSuccess(plan.id);
    } finally {
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
        {/* Razorpay Top Banner */}
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

        {/* Order Details */}
        <div style={{ padding: '1.5rem' }}>
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

          {/* Payment Method Selector */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6B6B66', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              Select Payment Method
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { id: 'upi', label: 'UPI / Google Pay / PhonePe', desc: 'Fast, instant bank transfer' },
                { id: 'card', label: 'Credit or Debit Card', desc: 'Visa, Mastercard, RuPay' },
                { id: 'netbanking', label: 'Net Banking', desc: 'All Indian major banks' },
              ].map(opt => (
                <label key={opt.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
                  border: method === opt.id ? '1px solid #1F5C46' : '1px solid #E7E5DF',
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
                    <div style={{ fontSize: '0.75rem', color: '#6B6B66' }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
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
                <span>Processing Payment...</span>
              ) : (
                <>
                  <CreditCard size={16} />
                  <span>Pay ₹{total.toLocaleString()} via Razorpay</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Club Details Page ──────────────────────────────────────────────────
export default function ClubDetailsPage() {
  const { clubId, slug } = useParams();
  const identifier = clubId || slug;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAuthenticated, changeClub } = useAuth();

  const [club, setClub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState(null);
  const [joining, setJoining] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const loadClub = useCallback(async () => {
    if (!identifier) return;
    setLoading(true);
    setError(null);
    try {
      const data = await clubsApi.getClubDetails(identifier);
      if (!data) throw new Error('Club not found');
      setClub(data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load club details');
    } finally {
      setLoading(false);
    }
  }, [identifier]);

  useEffect(() => {
    loadClub();
  }, [loadClub]);

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

  const handleJoinSuccess = async (planId) => {
    setJoining(true);
    try {
      const res = await clubsApi.joinClub(club.id, planId);
      toast.success(res.message || 'Successfully joined club!');
      // Switch active context so user is immediately focused on this club
      changeClub(club.id, 'member');
      setSelectedPlanForCheckout(null);
      await loadClub();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete registration');
    } finally {
      setJoining(false);
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
        <span style={{ fontSize: '0.875rem' }}>Loading club information...</span>
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
  const isMember = membership?.is_member;
  const hasPlans = club.plans && club.plans.length > 0;

  // Fallback gallery images if club hasn't uploaded any
  const displayGallery = club.gallery?.length > 0 ? club.gallery : [
    { id: 'def-1', image_url: DEFAULT_SPORT_IMAGES[club.sports?.[0]?.name?.toLowerCase()] || DEFAULT_SPORT_IMAGES.default, caption: 'Main Championship Court' },
    { id: 'def-2', image_url: DEFAULT_SPORT_IMAGES.padel, caption: 'Indoor Training Complex' },
    { id: 'def-3', image_url: DEFAULT_SPORT_IMAGES.tennis, caption: 'Evening Lighting Setup' },
  ];

  return (
    <div style={{ background: '#FAF9F6', minHeight: '100vh', paddingBottom: '4rem' }}>
      {/* Razorpay Modal */}
      {selectedPlanForCheckout && (
        <RazorpayModal
          club={club}
          plan={selectedPlanForCheckout}
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

      {/* ─── Hero Cover & Branding ─── */}
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
              background: `linear-gradient(135deg, ${club.brand_color || '#1F5C46'} 0%, #004430 100%)`,
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
          boxShadow: 'none', marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
              {/* Logo Avatar */}
              {club.logo_url ? (
                <img src={club.logo_url} alt={club.name} style={{
                  width: '76px', height: '76px', borderRadius: '12px',
                  objectFit: 'cover', border: '2px solid #FFFFFF',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }} />
              ) : (
                <div style={{
                  width: '76px', height: '76px', borderRadius: '12px',
                  background: '#1F5C46', color: '#FFFFFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2rem', fontWeight: 800
                }}>
                  {club.name?.charAt(0).toUpperCase()}
                </div>
              )}

              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1A1A18', margin: '0 0 0.35rem' }}>{club.name}</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#6B6B66', fontSize: '0.875rem' }}>
                  <MapPin size={15} color="#1F5C46" />
                  <span>{club.city ? `${club.city}${club.state ? `, ${club.state}` : ''}` : 'Location details upon request'}</span>
                  {club.country && <span>• {club.country}</span>}
                </div>
              </div>
            </div>

            {/* Custom Domain Pill */}
            {club.slug && (
              <div style={{
                background: '#FAF9F6', border: '1px solid #E7E5DF', borderRadius: '8px',
                padding: '0.5rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
              }}>
                <Globe size={14} color="#1F5C46" />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1A1A18', fontFamily: 'monospace' }}>
                  {club.slug}.clubos.app
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyDomain(domainUrl)}
                  title="Copy Custom Club Link"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem',
                    color: copiedDomain ? '#15803D' : '#6B6B66'
                  }}
                >
                  {copiedDomain ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            )}
          </div>

          {club.tagline && (
            <p style={{ margin: 0, color: '#6B6B66', fontSize: '0.925rem', lineHeight: '1.45' }}>
              {club.tagline}
            </p>
          )}

          {/* Quick Specs Strip */}
          <div style={{
            display: 'flex', gap: '1.5rem', flexWrap: 'wrap',
            paddingTop: '1rem', borderTop: '1px solid #E7E5DF', fontSize: '0.85rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Trophy size={15} color="#1F5C46" />
              <strong style={{ color: '#1A1A18' }}>{club.total_courts}</strong>
              <span style={{ color: '#6B6B66' }}>{club.total_courts === 1 ? 'Court' : 'Courts'}</span>
            </div>
            {club.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Mail size={15} color="#6B6B66" />
                <span style={{ color: '#6B6B66' }}>{club.email}</span>
              </div>
            )}
            {club.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Phone size={15} color="#6B6B66" />
                <span style={{ color: '#6B6B66' }}>{club.phone}</span>
              </div>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{
                background: hasPlans ? '#F0FDF4' : '#FFFBEB',
                color: hasPlans ? '#15803D' : '#B45309',
                border: hasPlans ? '1px solid #DCFCE7' : '1px solid #FEF3C7',
                borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.6rem'
              }}>
                {hasPlans ? '● Accepting Members' : '● Admissions Paused'}
              </span>
            </div>
          </div>
        </div>

        {/* ─── Active Member Status Card (If Logged In User is Member) ─── */}
        {isMember && (
          <div style={{
            background: '#FFFFFF', border: '1px solid #1F5C46', borderRadius: '10px',
            padding: '1.5rem 1.75rem', marginBottom: '1.5rem',
            boxShadow: '0 2px 8px rgba(31, 92, 70, 0.06)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '8px',
                  background: '#EBF3F0', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <UserCheck size={22} color="#1F5C46" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1A1A18' }}>
                      You are an Active Member
                    </h3>
                    {membership.plan_name && (
                      <span style={{
                        background: `${membership.plan_color || '#1F5C46'}20`,
                        color: membership.plan_color || '#1F5C46',
                        fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px'
                      }}>
                        {membership.plan_name}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6B6B66', marginTop: '0.2rem' }}>
                    Member Code: <strong style={{ fontFamily: 'monospace' }}>{membership.member_code}</strong>
                  </div>
                </div>
              </div>

              {/* Renewal Days Indicator */}
              <div style={{
                background: membership.needs_renewal ? '#FEF2F2' : '#F0FDF4',
                border: membership.needs_renewal ? '1px solid #FEE2E2' : '1px solid #DCFCE7',
                borderRadius: '8px', padding: '0.6rem 1rem', textAlign: 'right'
              }}>
                <div style={{
                  fontSize: '0.85rem', fontWeight: 700,
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

            {/* Member Entitlements & Fast Actions */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #E7E5DF',
              flexWrap: 'wrap', gap: '1rem'
            }}>
              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: '#6B6B66' }}>
                <div>
                  <strong>Daily Limit:</strong> {membership.max_bookings_per_day ? `${membership.max_bookings_per_day} bookings / day` : 'Unlimited'}
                </div>
                <div>
                  <strong>Court Privilege:</strong> {membership.court_free ? '🆓 Free Court Play' : `${membership.court_discount_percent || 0}% discount`}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    changeClub(club.id, 'member');
                    navigate('/bookings/calendar');
                  }}
                  style={{
                    padding: '0.45rem 1rem', background: '#1F5C46', color: '#FFFFFF',
                    borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.35rem'
                  }}
                >
                  <Calendar size={14} />
                  <span>Book a Court</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    changeClub(club.id, 'member');
                    navigate('/courts');
                  }}
                  style={{
                    padding: '0.45rem 0.9rem', background: '#FFFFFF', color: '#1A1A18',
                    borderRadius: '6px', border: '1px solid #E7E5DF', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer'
                  }}
                >
                  View Courts & Availability
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Grid: Facilities + Gallery ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Sports & Amenities */}
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
                    <span style={{ fontSize: '1.5rem' }}>{s.icon || '🎾'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1A1A18' }}>{s.name}</div>
                      {s.description && <div style={{ fontSize: '0.75rem', color: '#6B6B66' }}>{s.description}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#6B6B66', fontSize: '0.85rem' }}>No specific sports listed yet.</p>
            )}

            {/* Courts list preview */}
            {club.courts?.length > 0 && (
              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #E7E5DF' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B6B66', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  Court List ({club.courts.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {club.courts.map(c => (
                    <span key={c.id} style={{
                      padding: '0.25rem 0.6rem', background: '#FAF9F6', border: '1px solid #E7E5DF',
                      borderRadius: '4px', fontSize: '0.75rem', color: '#1A1A18'
                    }}>
                      {c.name} {c.is_indoor ? '• Indoor' : '• Outdoor'} ({c.surface || 'Pro'})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Gallery Showcase */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E7E5DF', borderRadius: '10px', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1A1A18', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} color="#1F5C46" />
              <span>Facility Showcase & Atmosphere</span>
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
              {displayGallery.slice(0, 4).map((g, i) => (
                <div key={g.id || i} style={{
                  position: 'relative', height: '110px', borderRadius: '6px',
                  overflow: 'hidden', border: '1px solid #E7E5DF'
                }}>
                  <img src={g.image_url} alt={g.caption || 'Facility Photo'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {g.caption && (
                    <div style={{
                      position: 'absolute', bottom: 0, insetInline: 0,
                      background: 'rgba(0,0,0,0.6)', color: '#FFFFFF',
                      fontSize: '0.65rem', padding: '0.25rem 0.4rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                      {g.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {club.description && (
              <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid #E7E5DF' }}>
                <p style={{ color: '#6B6B66', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                  {club.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ─── Membership Plans & Pricing ─── */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E7E5DF', borderRadius: '10px', padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#1A1A18', margin: '0 0 0.35rem' }}>
                Membership Tiers & Passes
              </h2>
              <p style={{ color: '#6B6B66', fontSize: '0.875rem', margin: 0 }}>
                Select a pass to unlock court bookings, discounts, and member privileges
              </p>
            </div>
          </div>

          {!hasPlans ? (
            /* Not Accepting Members State */
            <div style={{
              background: '#FFFBEB', border: '1px solid #FEF3C7', borderRadius: '8px',
              padding: '2.5rem', textAlign: 'center', margin: '1rem 0'
            }}>
              <AlertCircle size={40} color="#B45309" style={{ margin: '0 auto 0.75rem' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#92400e', marginBottom: '0.35rem' }}>
                Currently Not Accepting Members
              </h3>
              <p style={{ color: '#78350f', fontSize: '0.875rem', maxWidth: '520px', margin: '0 auto 1.25rem', lineHeight: '1.45' }}>
                This club has not published any active membership plans at the moment. Admissions may be at full capacity or undergoing seasonal restructuring.
              </p>
              {club.phone && (
                <div style={{ fontSize: '0.85rem', color: '#92400e' }}>
                  Please call the front desk at <strong>{club.phone}</strong> for walk-in availability.
                </div>
              )}
            </div>
          ) : (
            /* Active Plans Cards */
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.25rem'
            }}>
              {club.plans.map(p => {
                const isCurrentPlan = isMember && membership.plan_id === p.id;
                return (
                  <div key={p.id} style={{
                    background: '#FFFFFF',
                    border: isCurrentPlan ? '2px solid #1F5C46' : '1px solid #E7E5DF',
                    borderRadius: '8px', padding: '1.5rem', display: 'flex', flexDirection: 'column',
                    position: 'relative', boxShadow: 'none'
                  }}>
                    {isCurrentPlan && (
                      <span style={{
                        position: 'absolute', top: '0.75rem', right: '0.75rem',
                        background: '#EBF3F0', color: '#1F5C46', fontSize: '0.7rem',
                        fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px'
                      }}>
                        CURRENT PLAN
                      </span>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: p.color || '#1F5C46' }} />
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1A1A18' }}>{p.name}</h3>
                    </div>

                    {/* Price Tag */}
                    <div style={{ marginBottom: '1rem' }}>
                      <span style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1A1A18', fontFamily: 'monospace' }}>
                        ₹{Number(p.price).toLocaleString()}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#6B6B66', marginLeft: '0.35rem' }}>
                        / {p.duration_days} days
                      </span>
                      {Number(p.joining_fee) > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#6B6B66', marginTop: '0.15rem' }}>
                          + ₹{Number(p.joining_fee).toLocaleString()} one-time joining fee
                        </div>
                      )}
                    </div>

                    {p.description && (
                      <p style={{ color: '#6B6B66', fontSize: '0.8rem', marginBottom: '1rem', minHeight: '36px' }}>
                        {p.description}
                      </p>
                    )}

                    {/* Perk Badges */}
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                      {p.court_free ? (
                        <span style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #DCFCE7', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.45rem' }}>
                          🆓 Free Courts
                        </span>
                      ) : p.court_discount_percent > 0 ? (
                        <span style={{ background: '#EBF3F0', color: '#1F5C46', border: '1px solid #B2F0D3', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.45rem' }}>
                          {p.court_discount_percent}% Court Discount
                        </span>
                      ) : null}

                      {p.shop_discount_percent > 0 && (
                        <span style={{ background: '#FFFBEB', color: '#B45309', border: '1px solid #FEF3C7', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.45rem' }}>
                          {p.shop_discount_percent}% Pro Shop Off
                        </span>
                      )}

                      {p.max_bookings_per_day && (
                        <span style={{ background: '#FAF9F6', color: '#1A1A18', border: '1px solid #E7E5DF', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.45rem' }}>
                          {p.max_bookings_per_day} Bookings/Day
                        </span>
                      )}
                    </div>

                    {/* Bullet Benefits */}
                    {p.benefits && p.benefits.length > 0 && (
                      <ul style={{ margin: '0 0 1.25rem', padding: 0, listStyle: 'none', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {p.benefits.map((b, idx) => (
                          <li key={b.id || idx} style={{ fontSize: '0.8rem', color: '#1A1A18', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Check size={14} color="#15803D" />
                            <span>{b.label}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Buy Action */}
                    <button
                      type="button"
                      disabled={joining}
                      onClick={() => handleSelectPlan(p)}
                      style={{
                        width: '100%', padding: '0.65rem',
                        background: isCurrentPlan ? '#EBF3F0' : '#1F5C46',
                        color: isCurrentPlan ? '#1F5C46' : '#FFFFFF',
                        border: isCurrentPlan ? '1px solid #B2F0D3' : '1px solid transparent',
                        borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem',
                        cursor: 'pointer', transition: 'all 0.15s ease'
                      }}
                    >
                      {isCurrentPlan ? 'Renew Membership' : 'Choose Plan & Pay'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
