import React, { useState } from 'react';
import { Link } from 'react-router';
import useAuth from '../../auth/hook/useAuth.js';
import {
  ArrowRight,
  CheckCircle2,
  Calendar,
  ShoppingBag,
  Coffee,
  Wine,
  Users,
  CircleDollarSign,
  Layers,
  ChevronRight,
  TrendingUp,
  Menu,
  X,
  Clock,
  Sparkles,
  ShieldCheck,
  Building2,
  Check,
  ExternalLink,
} from 'lucide-react';
import '../styles/landing.scss';

export default function LandingPage() {
  const { isAuthenticated, role } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTimelineStep, setActiveTimelineStep] = useState(3); // 18:00 default
  const dashboardLink = (role || '').toLowerCase() === 'member' || (role || '').toLowerCase() === 'public' ? '/user/dashboard' : '/dashboard';

  const timelineEvents = [
    {
      time: '08:00',
      tag: 'Morning Session',
      title: 'Members Arrive & Check In',
      desc: 'Front desk scans QR codes or looks up members in 1 click. Attendance and court guest quotas update in real-time without bottlenecks.',
      module: 'Check-in & Membership',
      metric: '34 check-ins logged',
      image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80',
    },
    {
      time: '10:00',
      tag: 'Court Operations',
      title: 'Courts Fill to 92% Capacity',
      desc: 'Automatic 30-minute interval schedules eliminate double bookings. Member quotas and guest fees are enforced with zero phone tag.',
      module: 'Scheduling Engine',
      metric: '10 courts active',
      image: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=800&q=80',
    },
    {
      time: '13:00',
      tag: 'Retail Commerce',
      title: 'Pro Shop Racket & Apparel Sales',
      desc: 'Shared inventory automatically deducts items whether bought at counter touch-POS or ordered for court-side pickup.',
      module: 'Pro Shop & POS',
      metric: '₹14,200 retail volume',
      image: 'https://images.unsplash.com/photo-1617083934555-ac7d4fedc6b4?auto=format&fit=crop&w=800&q=80',
    },
    {
      time: '18:00',
      tag: 'Prime Time Rush',
      title: 'Peak Evening Bookings & Tournaments',
      desc: 'Synthetic, clay courts and padel enclosures host club championships and open ladders. Court lights and waitlists synchronize dynamically.',
      module: 'Court Booking & Tournaments',
      metric: '16 players in evening slots',
      image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
    },
    {
      time: '20:00',
      tag: 'Hospitality & Bar',
      title: 'Clubhouse Cafeteria & Running Tabs',
      desc: 'Kitchen display systems (KDS) receive table and lounge orders instantly. Gold members get automated hospitality perks on their tabs.',
      module: 'Bar POS & Kitchen KDS',
      metric: '18 tabs active, 0 paper slips',
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
    },
    {
      time: '22:00',
      tag: 'Financial Close',
      title: 'Owner Reviews Reconciled Revenue',
      desc: 'Courts, pro shop, food tabs, coaching payroll, and new member subscriptions settle into one unified financial ledger and GST statement.',
      module: 'Finance & Analytics',
      metric: '₹1,42,850 net daily revenue',
      image: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80',
    },
  ];

  const clubTypes = [
    {
      type: 'Tennis Club',
      badge: 'Racquet Sports',
      courts: 'Acrylic Hard & Clay Courts',
      modules: 'Court Slots · Pro Shop · Member Tiers · Coaching Shifts',
      image: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=600&q=80',
    },
    {
      type: 'Padel Club',
      badge: 'Fast Growing',
      courts: 'Panoramic Glass Enclosures',
      modules: 'Doubles Booking · Tournaments · Racket Rental · Bar Tabs',
      image: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=600&q=80',
    },
    {
      type: 'Badminton Academy',
      badge: 'High Density',
      courts: 'BWF Teak Wood Courts',
      modules: 'Junior Squad Plans · Bulk Shuttles Inventory · Coach Payroll',
      image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=600&q=80',
    },
    {
      type: 'Multi-Sport Facility',
      badge: 'Enterprise',
      courts: 'Tennis, Padel, Squash & Gym',
      modules: 'Multi-Sport Passes · Corporate Clients · KDS Cafeteria · GST',
      image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=600&q=80',
    },
  ];

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="club-landing">
      {/* ─────────────────────────────────────────────────────────────
         1. STICKY EDITORIAL NAVBAR
      ───────────────────────────────────────────────────────────── */}
      <header className="club-nav">
        <div className="nav-inner">
          {/* Brand Logo matching photo */}
          <Link to="/" className="nav-brand">
            <span className="brand-dot" />
            <span className="brand-name">Clubhouse</span>
            <span className="brand-badge">v2.4 LIVE</span>
          </Link>

          {/* Center Navigation Links */}
          <nav className="nav-links">
            <a href="#system" onClick={(e) => { e.preventDefault(); scrollToSection('system'); }}>Features</a>
            <a href="#timeline" onClick={(e) => { e.preventDefault(); scrollToSection('timeline'); }}>Modules</a>
            <a href="#problem" onClick={(e) => { e.preventDefault(); scrollToSection('problem'); }}>Why Clubhouse</a>
            <a href="#sports" onClick={(e) => { e.preventDefault(); scrollToSection('sports'); }}>Pricing</a>
            <a href="#timeline" onClick={(e) => { e.preventDefault(); scrollToSection('timeline'); }}>Changelog</a>
          </nav>

          {/* Top Right Action Buttons (Login & Register as requested) */}
          <div className="nav-actions">
            {isAuthenticated ? (
              <>
                <Link to={dashboardLink} className="btn-login" id="nav-dash-link">
                  Dashboard
                </Link>
                <Link to={dashboardLink} className="btn-register" id="nav-dashboard-btn">
                  <span>Enter Dashboard</span>
                  <ArrowRight style={{ width: 15, height: 15 }} />
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-login" id="nav-login-btn">
                  Log in
                </Link>
                <Link to="/register" className="btn-register" id="nav-register-btn">
                  <span>Register your club</span>
                  <ArrowRight style={{ width: 15, height: 15 }} />
                </Link>
              </>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="mobile-menu-btn"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      <div className={`mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        <a href="#system" className="mobile-link" onClick={() => { setMobileMenuOpen(false); scrollToSection('system'); }}>Features</a>
        <a href="#timeline" className="mobile-link" onClick={() => { setMobileMenuOpen(false); scrollToSection('timeline'); }}>Modules</a>
        <a href="#problem" className="mobile-link" onClick={() => { setMobileMenuOpen(false); scrollToSection('problem'); }}>Why Clubhouse</a>
        <a href="#sports" className="mobile-link" onClick={() => { setMobileMenuOpen(false); scrollToSection('sports'); }}>Multi-Sport</a>
        <div className="mobile-buttons">
          <Link to="/login" className="mobile-btn mobile-btn--outline" onClick={() => setMobileMenuOpen(false)}>
            Log in to Account
          </Link>
          <Link to="/register" className="mobile-btn mobile-btn--primary" onClick={() => setMobileMenuOpen(false)}>
            Register Your Club
          </Link>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
         2. ATHLETIC HERO SECTION WITH DESKTOP BACKGROUND
      ───────────────────────────────────────────────────────────── */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-left">
            <div className="hero-eyebrow">
              ATHLETICS &amp; FITNESS CLUB
            </div>

            <h1 className="hero-headline">
              Built for athletes.<br />
              Engineered for performance.
            </h1>

            <p className="hero-description">
              World-class courts, elite training spaces, and seamless slot booking designed for peak athletic performance.
            </p>

            <div className="hero-actions">
              <Link to="/register" className="btn-hero-primary" id="hero-register-btn">
                <span>Join Club</span>
                <ArrowRight size={16} />
              </Link>
              <button
                type="button"
                onClick={() => scrollToSection('sports')}
                className="btn-hero-secondary"
                id="hero-demo-btn"
              >
                Explore Facilities
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
         3. THE PROBLEM SECTION ("SPORTS CLUBS RUN ON CHAOS")
      ───────────────────────────────────────────────────────────── */}
      <section id="problem" className="problem-section">
        <div className="section-header">
          <span className="eyebrow">THE FRAGMENTATION COST</span>
          <h2>SPORTS CLUBS RUN ON CHAOS.</h2>
          <p>Most clubs stitch together 6 different disconnected tools to handle one single day of operations.</p>
        </div>

        {/* Visual Problem Equation */}
        <div className="equation-grid">
          <div className="eq-card">
            <div className="eq-tag">Bookings</div>
            <div className="eq-val">WhatsApp</div>
          </div>
          <div className="eq-plus">+</div>
          <div className="eq-card">
            <div className="eq-tag">Roster</div>
            <div className="eq-val">Excel Sheets</div>
          </div>
          <div className="eq-plus">+</div>
          <div className="eq-card">
            <div className="eq-tag">Bar / Shop</div>
            <div className="eq-val">Paper Bills</div>
          </div>
        </div>

        <div className="equation-result">
          = LOSS OF REVENUE &amp; FRUSTRATED MEMBERS
        </div>

        {/* The ClubOS Difference card */}
        <div className="difference-card">
          <div>
            <div className="diff-badge">THE CLUBOS DIFFERENCE</div>
            <h3>ONE UNIFIED OPERATING SYSTEM.</h3>
            <p>
              When Arjun Patel books Court 02, his Gold tier auto-applies membership quota. When he buys a racket at the pro shop, 15% is auto-deducted and inventory drops. When he orders lunch at Table 01, it flashes on the kitchen KDS, and his UPI settlement lands directly on the owner ledger.
            </p>
          </div>
          <Link to="/register" className="btn-diff">
            <span>Deploy ClubOS Today</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
         4. THE CLUB DAY (INTERACTIVE TIMELINE)
      ───────────────────────────────────────────────────────────── */}
      <section id="timeline" className="timeline-section">
        <div className="section-head">
          <div>
            <span className="eyebrow">A DAY IN THE LIFE</span>
            <h2>HOW A CLUB RUNS ON CLUBOS.</h2>
          </div>
          <p>
            Click through the hours of a sports club to see how ClubOS keeps members, courts, inventory, cafeteria, and ledger completely synchronized.
          </p>
        </div>

        {/* Interactive 6 Time Pills */}
        <div className="time-pills">
          {timelineEvents.map((ev, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveTimelineStep(idx)}
              className={`time-btn ${activeTimelineStep === idx ? 'active' : ''}`}
            >
              <div className="tb-time">{ev.time}</div>
              <div className="tb-tag">{ev.tag}</div>
            </button>
          ))}
        </div>

        {/* Active Operational Card */}
        <div className="timeline-card">
          <div className="tc-content">
            <div>
              <div className="tc-meta">
                <span className="tc-time">{timelineEvents[activeTimelineStep].time}</span>
                <span className="tc-mod">{timelineEvents[activeTimelineStep].module}</span>
              </div>
              <h3>{timelineEvents[activeTimelineStep].title}</h3>
              <p>{timelineEvents[activeTimelineStep].desc}</p>
            </div>

            <div className="tc-footer">
              <div>
                <div className="tc-metric-label">Live Operational Output</div>
                <div className="tc-metric-val">{timelineEvents[activeTimelineStep].metric}</div>
              </div>
              <Link to="/login" className="tc-link">
                <span>Inspect in Live Admin</span>
                <ChevronRight size={16} />
              </Link>
            </div>
          </div>

          <div className="tc-image">
            <img
              src={timelineEvents[activeTimelineStep].image}
              alt={timelineEvents[activeTimelineStep].title}
            />
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
         5. ONE CLUB, ONE SYSTEM (CONNECTED ARCHITECTURE)
      ───────────────────────────────────────────────────────────── */}
      <section id="system" className="system-section">
        <div className="section-head">
          <span className="eyebrow">CONNECTED ARCHITECTURE</span>
          <h2>ONE CLUB. ONE CONNECTED DATA STREAM.</h2>
          <p>No data silos. Every action in one module immediately informs the others.</p>
        </div>

        <div className="nodes-grid">
          {[
            { label: 'MEMBERS', icon: <Users size={20} />, desc: 'Single profile with card, plan & history' },
            { label: 'BOOKINGS', icon: <Calendar size={20} />, desc: '30m scheduling grid with zero conflicts' },
            { label: 'COURTS', icon: <Layers size={20} />, desc: 'Real-time surface, lights & capacity' },
            { label: 'PRO SHOP', icon: <ShoppingBag size={20} />, desc: 'Shared stock across POS & pickup' },
            { label: 'BAR & KDS', icon: <Wine size={20} />, desc: 'Floor plan table tabs to kitchen queues' },
            { label: 'PAYMENTS', icon: <CircleDollarSign size={20} />, desc: 'UPI, Cash & Card reconciliation' },
            { label: 'FINANCE', icon: <TrendingUp size={20} />, desc: 'Single ledger, P&L, GST reports' },
          ].map((node, nIdx) => (
            <div key={nIdx} className="node-card">
              <div className="node-icon-wrap">
                {node.icon}
              </div>
              <div>
                <div className="node-label">{node.label}</div>
                <div className="node-desc">{node.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
         6. BUILT FOR YOUR SPORT (MULTI-TENANT CAPABILITY)
      ───────────────────────────────────────────────────────────── */}
      <section id="sports" className="sports-section">
        <div className="section-head">
          <div>
            <span className="eyebrow">MULTI-TENANCY IN ACTION</span>
            <h2>BUILT FOR ANY CLUB. ANY SPORT.</h2>
          </div>
          <p>
            Whether running a boutique padel club, premier badminton academy, or municipal multi-court facility, ClubOS configures completely bespoke rules and sports.
          </p>
        </div>

        <div className="sports-grid">
          {clubTypes.map((c, cIdx) => (
            <div key={cIdx} className="sport-card">
              <div className="sc-image-wrap">
                <img src={c.image} alt={c.type} />
                <span className="sc-badge">{c.badge}</span>
              </div>
              <div className="sc-body">
                <div>
                  <h4>{c.type}</h4>
                  <div className="sc-courts">{c.courts}</div>
                  <div className="sc-modules">
                    <strong>Configured:</strong> {c.modules}
                  </div>
                </div>
                <Link to="/register" className="sc-action">
                  <span>Deploy This Setup</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
         7. FINAL DARK EDITORIAL CTA
      ───────────────────────────────────────────────────────────── */}
      <section className="final-cta">
        <div className="cta-container">
          <span className="cta-eyebrow">GET STARTED TODAY</span>
          <h2>
            YOUR CLUB HAS ENOUGH MOVING PARTS. <br />
            <span>GIVE THEM ONE PLACE TO LIVE.</span>
          </h2>
          <p>
            Take 3 minutes to register your club, configure your sports and courts, and start taking bookings with zero software friction.
          </p>
          <div className="cta-buttons">
            <Link to="/register" className="btn-cta-primary" id="cta-register-btn">
              <span>Register Your Club</span>
              <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="btn-cta-secondary" id="cta-login-btn">
              Log in to ClubOS
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
         8. EDITORIAL FOOTER
      ───────────────────────────────────────────────────────────── */}
      <footer className="club-footer">
        <div className="footer-inner">
          <div className="footer-columns">
            <div className="fc-brand">
              <h3>CLUBHOUSE / CLUBOS</h3>
              <p>
                The athletic sports club management operating system. Replaces WhatsApp bookings, Excel sheets, and paper slips with unified operations.
              </p>
              <div className="fc-tagline">
                Any club. Any sport. One operating system.
              </div>
            </div>

            <div className="fc-col">
              <h5>Public Club Pages</h5>
              <ul>
                <li><Link to="/login">Court Availability</Link></li>
                <li><Link to="/login">Membership Tiers</Link></li>
                <li><Link to="/login">Pro Shop Catalog</Link></li>
                <li><Link to="/register">Book a Trial</Link></li>
              </ul>
            </div>

            <div className="fc-col">
              <h5>Internal Modules</h5>
              <ul>
                <li><Link to="/login">Operations Command</Link></li>
                <li><Link to="/login">Court Grid Manager</Link></li>
                <li><Link to="/login">Fast Touch POS</Link></li>
                <li><Link to="/login">Bar Spatial Floor Plan</Link></li>
                <li><Link to="/login">Kitchen Display (KDS)</Link></li>
              </ul>
            </div>

            <div className="fc-col">
              <h5>Multi-Tenant Platform</h5>
              <p>Ready to deploy ClubOS at your tennis, padel, badminton or multi-sport complex?</p>
              <Link to="/register" className="btn-register-footer">
                Register Your Club
              </Link>
            </div>
          </div>

          <div className="footer-bottom">
            <div>
              © 2026 Clubhouse / ClubOS Multi-Tenant SaaS. Built for high-performance clubs.
            </div>
            <div className="fb-links">
              <Link to="/login">Staff Login</Link>
              <Link to="/register">Create Tenant</Link>
              <span>v2.4 Production Ready</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
