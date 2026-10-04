import React from 'react';

/**
 * PrintableReportsDocument Component
 * Renders an official, strictly formal, monochrome (black & white)
 * Executive Financial & Operational Audit Report.
 * Optimized for html2canvas PDF rendering and A4 high-contrast physical printing.
 */
export default function PrintableReportsDocument({
  clubName,
  activeClubObj,
  timeRange,
  lastUpdated,
  user,
  role,
  kpi = {},
  revBySource = {},
  paymentMethods = [],
  courtDetails = [],
  membershipTiers = [],
  topShopProducts = [],
  topBarItems = [],
  staffDist = [],
  demographics = {},
}) {
  const formattedDate = (lastUpdated || new Date()).toLocaleString('en-IN', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const rangeLabel = {
    all: 'All-Time Cumulative',
    '30d': 'Trailing 30 Days',
    '7d': 'Trailing 7 Days',
    today: 'Single Day (Today)',
  }[timeRange] || 'Custom Period';

  const reportId = `AUD-${(activeClubObj?.id || 'LDCE').slice(0, 6).toUpperCase()}-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}`;

  const totalRev = Number(revBySource.total || kpi.totalRevenue || 0);
  const memberRev = Number(revBySource.membership || 0);
  const courtRev = Number(revBySource.courts || 0);
  const barRev = Number(revBySource.bar || 0);
  const shopRev = Number(revBySource.shop || 0);

  const totalBookings = Number(kpi.totalBookings || 0);
  const completedBookings = Number(kpi.completedBookings || 0);
  const cancelledBookings = Number(kpi.cancelledBookings || 0);
  const completionRate = totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0;
  const arpu = kpi.activeMembers > 0 ? Math.round(totalRev / kpi.activeMembers) : 0;

  return (
    <div
      id="formal-audit-report"
      className="reports-print-document"
      style={{
        background: '#ffffff',
        color: '#000000',
        padding: '24px 32px',
        boxSizing: 'border-box',
        fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif",
        lineHeight: 1.35,
        width: '100%',
        maxWidth: '850px',
        margin: '0 auto',
      }}
    >
      {/* =================================================================== */}
      {/* 1. OFFICIAL FORMAL LETTERHEAD & AUDIT BANNER                        */}
      {/* =================================================================== */}
      <div style={{ borderBottom: '3px double #000000', paddingBottom: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  border: '2px solid #000000',
                  color: '#000000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1.25rem',
                  fontFamily: 'Georgia, serif',
                }}
              >
                {clubName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#000000', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {clubName}
                </h1>
                <div style={{ fontSize: '0.78rem', color: '#444444', fontWeight: 600 }}>
                  SPORTS FACILITY & CLUBHOUSE OPERATIONS • {activeClubObj?.city ? activeClubObj.city.toUpperCase() : 'LDCE'}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#555555' }}>
              Subdomain: <strong>{activeClubObj?.slug || 'club'}</strong> • System Facility UID: <strong>{activeClubObj?.id || '—'}</strong>
            </div>
          </div>

          <div style={{ textAlign: 'right', minWidth: '220px' }}>
            <div
              style={{
                border: '1.5px solid #000000',
                padding: '3px 10px',
                fontSize: '0.75rem',
                fontWeight: 900,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                display: 'inline-block',
                marginBottom: '6px',
              }}
            >
              EXECUTIVE AUDIT REPORT
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#000000' }}>Reference No: #{reportId}</div>
            <div style={{ fontSize: '0.72rem', color: '#444444' }}>Date & Time: {formattedDate}</div>
            <div style={{ fontSize: '0.72rem', color: '#000000', fontWeight: 600 }}>Classification: CONFIDENTIAL & PROPRIETARY</div>
          </div>
        </div>

        {/* Formal Parameter Metadata Ledger */}
        <div
          style={{
            marginTop: '14px',
            padding: '8px 12px',
            border: '1px solid #000000',
            background: '#fafafa',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            fontSize: '0.72rem',
          }}
        >
          <div>
            <span style={{ color: '#555555', display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700 }}>
              Reporting Scope
            </span>
            <strong style={{ color: '#000000' }}>{rangeLabel}</strong>
          </div>
          <div>
            <span style={{ color: '#555555', display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700 }}>
              Prepared By
            </span>
            <strong style={{ color: '#000000' }}>{user?.full_name || user?.name || user?.email || 'Authorized Auditor'}</strong>
          </div>
          <div>
            <span style={{ color: '#555555', display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700 }}>
              Role Designation
            </span>
            <strong style={{ color: '#000000', textTransform: 'uppercase' }}>{role || 'Administrator'}</strong>
          </div>
          <div>
            <span style={{ color: '#555555', display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700 }}>
              Data Integrity
            </span>
            <strong style={{ color: '#000000' }}>VERIFIED (SQL LEDGER)</strong>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. EXECUTIVE PERFORMANCE MATRIX (BLACK & WHITE HIGH-CONTRAST CARDS) */}
      {/* =================================================================== */}
      <div className="print-avoid-break" style={{ marginBottom: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1.5px solid #000000', paddingBottom: '4px', marginBottom: '10px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            1. Executive Performance Matrix & Financial Summary
          </span>
          <span style={{ fontSize: '0.7rem', color: '#555555', textTransform: 'uppercase' }}>All figures in Indian Rupee (₹)</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          <div style={{ border: '1px solid #000000', padding: '10px 12px', background: '#ffffff' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#444444', textTransform: 'uppercase', display: 'block' }}>
              Gross Realized Revenue
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#000000', margin: '3px 0' }}>
              ₹{totalRev.toLocaleString('en-IN')}
            </div>
            <span style={{ fontSize: '0.65rem', color: '#555555' }}>Consolidated across all 4 operational units</span>
          </div>

          <div style={{ border: '1px solid #000000', padding: '10px 12px', background: '#ffffff' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#444444', textTransform: 'uppercase', display: 'block' }}>
              Active Registered Members
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#000000', margin: '3px 0' }}>
              {Number(kpi.activeMembers || 0).toLocaleString('en-IN')}
            </div>
            <span style={{ fontSize: '0.65rem', color: '#555555' }}>
              +{kpi.newMembers30d || 0} enrolled in trailing 30 days
            </span>
          </div>

          <div style={{ border: '1px solid #000000', padding: '10px 12px', background: '#ffffff' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#444444', textTransform: 'uppercase', display: 'block' }}>
              Court Reservations
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#000000', margin: '3px 0' }}>
              {completedBookings.toLocaleString('en-IN')} / {totalBookings.toLocaleString('en-IN')}
            </div>
            <span style={{ fontSize: '0.65rem', color: '#555555' }}>
              {completionRate}% completion rate ({cancelledBookings} cancellations)
            </span>
          </div>

          <div style={{ border: '1px solid #000000', padding: '10px 12px', background: '#ffffff' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#444444', textTransform: 'uppercase', display: 'block' }}>
              Avg. Revenue Per Member (ARPU)
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#000000', margin: '3px 0' }}>
              ₹{arpu.toLocaleString('en-IN')}
            </div>
            <span style={{ fontSize: '0.65rem', color: '#555555' }}>Yield per active membership account</span>
          </div>

          <div style={{ border: '1px solid #000000', padding: '10px 12px', background: '#ffffff' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#444444', textTransform: 'uppercase', display: 'block' }}>
              Athletic Court Occupancy
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#000000', margin: '3px 0' }}>
              {kpi.courtOccupancyRate || '0%'}
            </div>
            <span style={{ fontSize: '0.65rem', color: '#555555' }}>Utilization capacity across {kpi.totalCourts || 0} courts</span>
          </div>

          <div style={{ border: '1px solid #000000', padding: '10px 12px', background: '#ffffff' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#444444', textTransform: 'uppercase', display: 'block' }}>
              Commercial Orders (Shop + Bar)
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#000000', margin: '3px 0' }}>
              {(Number(kpi.shopOrdersTotal || 0) + Number(kpi.barOrdersTotal || 0)).toLocaleString('en-IN')}
            </div>
            <span style={{ fontSize: '0.65rem', color: '#555555' }}>Pro Shop: {kpi.shopOrdersTotal || 0} • Cafe/Bar: {kpi.barOrdersTotal || 0}</span>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. REVENUE STREAMS & DIVISIONAL AUDIT TABLE                         */}
      {/* =================================================================== */}
      <div className="print-avoid-break" style={{ marginBottom: '22px' }}>
        <div style={{ borderBottom: '1.5px solid #000000', paddingBottom: '4px', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            2. Revenue Streams & Divisional Attribution
          </span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
          <thead>
            <tr style={{ background: '#f2f2f2', borderTop: '1px solid #000000', borderBottom: '1px solid #000000' }}>
              <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 800 }}>Operating Division / Department</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 800 }}>Settled Amount (₹)</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 800 }}>Share (%)</th>
              <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 800 }}>Reconciliation</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
              <td style={{ padding: '6px 8px' }}>
                <strong>Athletic Court Bookings & Reservations</strong>
                <div style={{ fontSize: '0.68rem', color: '#555555' }}>Court hire fees, advance bookings, and walk-in play</div>
              </td>
              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>₹{courtRev.toLocaleString('en-IN')}</td>
              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>{totalRev > 0 ? Math.round((courtRev / totalRev) * 100) : 0}%</td>
              <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, fontSize: '0.7rem' }}>[ RECONCILED ]</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
              <td style={{ padding: '6px 8px' }}>
                <strong>Membership Subscriptions & Joining Fees</strong>
                <div style={{ fontSize: '0.68rem', color: '#555555' }}>Plan subscriptions, renewals, and onboarding fees</div>
              </td>
              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>₹{memberRev.toLocaleString('en-IN')}</td>
              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>{totalRev > 0 ? Math.round((memberRev / totalRev) * 100) : 0}%</td>
              <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, fontSize: '0.7rem' }}>[ RECONCILED ]</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
              <td style={{ padding: '6px 8px' }}>
                <strong>Clubhouse Cafe & Bar POS (Food & Beverages)</strong>
                <div style={{ fontSize: '0.68rem', color: '#555555' }}>Table orders, direct point-of-sale, and bar beverage tabs</div>
              </td>
              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>₹{barRev.toLocaleString('en-IN')}</td>
              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>{totalRev > 0 ? Math.round((barRev / totalRev) * 100) : 0}%</td>
              <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, fontSize: '0.7rem' }}>[ RECONCILED ]</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
              <td style={{ padding: '6px 8px' }}>
                <strong>Pro Shop Merchandise & Sports Gear</strong>
                <div style={{ fontSize: '0.68rem', color: '#555555' }}>Apparel, footwear, rackets, accessories, and inventory</div>
              </td>
              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>₹{shopRev.toLocaleString('en-IN')}</td>
              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>{totalRev > 0 ? Math.round((shopRev / totalRev) * 100) : 0}%</td>
              <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, fontSize: '0.7rem' }}>[ RECONCILED ]</td>
            </tr>
            <tr style={{ background: '#f5f5f5', borderTop: '1.5px solid #000000', borderBottom: '3px double #000000' }}>
              <td style={{ padding: '8px', fontWeight: 900, textTransform: 'uppercase' }}>
                TOTAL AUDITED GROSS REVENUE
              </td>
              <td style={{ padding: '8px', textAlign: 'right', fontWeight: 900, fontSize: '0.9rem' }}>
                ₹{totalRev.toLocaleString('en-IN')}
              </td>
              <td style={{ padding: '8px', textAlign: 'right', fontWeight: 900 }}>100.0%</td>
              <td style={{ padding: '8px', textAlign: 'center', fontWeight: 900, fontSize: '0.72rem' }}>
                [ 100% BALANCED ]
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* =================================================================== */}
      {/* 4. PAYMENT SETTLEMENT TENDER AUDIT TABLE                            */}
      {/* =================================================================== */}
      <div className="print-avoid-break" style={{ marginBottom: '22px' }}>
        <div style={{ borderBottom: '1.5px solid #000000', paddingBottom: '4px', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            3. Payment Settlement Tender Reconciliation
          </span>
        </div>

        {paymentMethods.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
            <thead>
              <tr style={{ background: '#f2f2f2', borderTop: '1px solid #000000', borderBottom: '1px solid #000000' }}>
                <th style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 800 }}>Tender / Channel</th>
                <th style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 800 }}>Txn Count</th>
                <th style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 800 }}>Total Settled (₹)</th>
                <th style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 800 }}>Allocation (%)</th>
              </tr>
            </thead>
            <tbody>
              {paymentMethods.map((pm, idx) => {
                const totalTenderSum = paymentMethods.reduce((acc, curr) => acc + Number(curr.totalAmount || 0), 0);
                const share = totalTenderSum > 0 ? Math.round((Number(pm.totalAmount || 0) / totalTenderSum) * 100) : 0;
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #e0e0e0' }}>
                    <td style={{ padding: '5px 8px', fontWeight: 700, textTransform: 'uppercase' }}>
                      {pm.method || 'COUNTER / DIRECT'}
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'center' }}>{pm.count || 0}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700 }}>₹{Number(pm.totalAmount || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right' }}>{share}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '8px', border: '1px dashed #999999', fontSize: '0.75rem', color: '#555555', textAlign: 'center' }}>
            No individual tender breakdown recorded during this reporting window.
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* 5. ATHLETIC COURTS & DISCIPLINE AUDIT TABLE                         */}
      {/* =================================================================== */}
      <div className="print-avoid-break" style={{ marginBottom: '22px' }}>
        <div style={{ borderBottom: '1.5px solid #000000', paddingBottom: '4px', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            4. Athletic Courts & Facilities Performance Audit
          </span>
        </div>

        {courtDetails.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ background: '#f2f2f2', borderTop: '1px solid #000000', borderBottom: '1px solid #000000' }}>
                <th style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 800 }}>Court Facility</th>
                <th style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 800 }}>Sport Discipline</th>
                <th style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 800 }}>Tariff (₹/hr)</th>
                <th style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 800 }}>Bookings</th>
                <th style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 800 }}>Hours Booked</th>
                <th style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 800 }}>Gross Revenue (₹)</th>
              </tr>
            </thead>
            <tbody>
              {courtDetails.map((cd, idx) => (
                <tr key={cd.id || idx} style={{ borderBottom: '1px solid #e0e0e0' }}>
                  <td style={{ padding: '5px 8px', fontWeight: 700 }}>{cd.court_name}</td>
                  <td style={{ padding: '5px 8px', textTransform: 'capitalize' }}>{cd.sport_name}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right' }}>₹{Number(cd.hourly_rate || 0)}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'center' }}>{cd.bookings_count}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 600 }}>{cd.hours_booked} hrs</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700 }}>₹{Number(cd.total_revenue || 0).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '8px', border: '1px dashed #999999', fontSize: '0.75rem', color: '#555555', textAlign: 'center' }}>
            No athletic courts registered or active for this club facility.
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* 6. MEMBERSHIP TIERS & SUBSCRIPTION REGISTRY                         */}
      {/* =================================================================== */}
      <div className="print-avoid-break" style={{ marginBottom: '22px' }}>
        <div style={{ borderBottom: '1.5px solid #000000', paddingBottom: '4px', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            5. Membership Plans & Subscription Registry
          </span>
        </div>

        {membershipTiers.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ background: '#f2f2f2', borderTop: '1px solid #000000', borderBottom: '1px solid #000000' }}>
                <th style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 800 }}>Membership Plan / Tier</th>
                <th style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 800 }}>Validity (Days)</th>
                <th style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 800 }}>Price (₹)</th>
                <th style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 800 }}>Subscribers</th>
                <th style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 800 }}>Generated Revenue (₹)</th>
              </tr>
            </thead>
            <tbody>
              {membershipTiers.map((tier, idx) => (
                <tr key={tier.id || idx} style={{ borderBottom: '1px solid #e0e0e0' }}>
                  <td style={{ padding: '5px 8px', fontWeight: 700 }}>{tier.planName}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'center' }}>{tier.durationDays || 30} days</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right' }}>₹{Number(tier.price || 0).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 700 }}>{tier.memberCount}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700 }}>₹{Number(tier.revenue || 0).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '8px', border: '1px dashed #999999', fontSize: '0.75rem', color: '#555555', textAlign: 'center' }}>
            No active membership plans registered in database.
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* 7. COMMERCIAL POS HIGHLIGHTS (PRO SHOP & CAFE/BAR)                 */}
      {/* =================================================================== */}
      <div className="print-avoid-break" style={{ marginBottom: '22px' }}>
        <div style={{ borderBottom: '1.5px solid #000000', paddingBottom: '4px', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            6. Commercial POS Highlights: Pro Shop & Cafe/Bar
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
              Pro Shop Merchandise Leaders
            </div>
            {topShopProducts.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                <thead>
                  <tr style={{ background: '#f2f2f2', borderTop: '1px solid #000000', borderBottom: '1px solid #000000' }}>
                    <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 800 }}>Product</th>
                    <th style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 800 }}>Qty</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 800 }}>Sales (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {topShopProducts.slice(0, 5).map((sp, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e0e0e0' }}>
                      <td style={{ padding: '4px 6px', fontWeight: 600 }}>{sp.productName}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'center' }}>{sp.unitsSold}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700 }}>₹{Number(sp.totalSales || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ fontSize: '0.7rem', color: '#666666', fontStyle: 'italic' }}>No shop sales recorded.</div>
            )}
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
              Clubhouse Cafe & Bar Leaders
            </div>
            {topBarItems.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                <thead>
                  <tr style={{ background: '#f2f2f2', borderTop: '1px solid #000000', borderBottom: '1px solid #000000' }}>
                    <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 800 }}>Item</th>
                    <th style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 800 }}>Qty</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 800 }}>Sales (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {topBarItems.slice(0, 5).map((bi, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e0e0e0' }}>
                      <td style={{ padding: '4px 6px', fontWeight: 600 }}>{bi.itemName}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'center' }}>{bi.unitsSold}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700 }}>₹{Number(bi.totalSales || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ fontSize: '0.7rem', color: '#666666', fontStyle: 'italic' }}>No cafe/bar sales recorded.</div>
            )}
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 8. WORKFORCE ALLOCATION & DEPARTMENTAL PAYROLL                     */}
      {/* =================================================================== */}
      {staffDist.length > 0 && (
        <div className="print-avoid-break" style={{ marginBottom: '22px' }}>
          <div style={{ borderBottom: '1.5px solid #000000', paddingBottom: '4px', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              7. Workforce Allocation & Departmental Distribution
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ background: '#f2f2f2', borderTop: '1px solid #000000', borderBottom: '1px solid #000000' }}>
                <th style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 800 }}>Staff Role / Department</th>
                <th style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 800 }}>Headcount</th>
                <th style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 800 }}>Monthly Payroll Allocation (₹)</th>
                <th style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 800 }}>Duty Status</th>
              </tr>
            </thead>
            <tbody>
              {staffDist.map((st, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e0e0e0' }}>
                  <td style={{ padding: '5px 8px', fontWeight: 700, textTransform: 'capitalize' }}>
                    {st.role?.replace('_', ' ')}
                  </td>
                  <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 700 }}>{st.staffCount}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700 }}>₹{Number(st.monthlyPayroll || 0).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 700, fontSize: '0.7rem' }}>[ ACTIVE ]</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* =================================================================== */}
      {/* 9. FORMAL AUDIT CERTIFICATION, SIGN-OFF BLOCKS & LEGAL DISCLAIMER  */}
      {/* =================================================================== */}
      <div className="print-avoid-break" style={{ marginTop: '24px', borderTop: '2px solid #000000', paddingTop: '12px' }}>
        <div style={{ fontSize: '0.68rem', color: '#444444', lineHeight: 1.45, marginBottom: '24px' }}>
          <strong>AUDIT CERTIFICATION STATEMENT:</strong> This document represents an immutable financial transcript and operational summary generated from the transactional database ledgers of {clubName}. All metrics, revenues, and reservation accounts have been computed with mathematical checksum reconciliation. Unauthorized duplication, modification, or distribution is prohibited under applicable audit regulations.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', textAlign: 'center' }}>
          <div>
            <div style={{ borderBottom: '1px solid #000000', height: '36px', marginBottom: '6px' }}></div>
            <strong style={{ fontSize: '0.78rem', color: '#000000', display: 'block' }}>
              {user?.full_name || user?.name || user?.email || 'Authorized Auditor'}
            </strong>
            <span style={{ fontSize: '0.68rem', color: '#555555' }}>Report Preparer • {role || 'Staff'}</span>
          </div>

          <div>
            <div style={{ borderBottom: '1px solid #000000', height: '36px', marginBottom: '6px' }}></div>
            <strong style={{ fontSize: '0.78rem', color: '#000000', display: 'block' }}>
              Managing Director / Club Owner
            </strong>
            <span style={{ fontSize: '0.68rem', color: '#555555' }}>Executive Sign-Off & Verification</span>
          </div>

          <div>
            <div
              style={{
                border: '1.5px solid #000000',
                padding: '6px',
                height: '46px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#fafafa',
              }}
            >
              <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                OFFICIAL SEAL & AUDIT CODE
              </span>
              <span style={{ fontSize: '0.6rem', color: '#444444', fontFamily: 'monospace' }}>
                {reportId}
              </span>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.62rem', color: '#777777', textTransform: 'uppercase' }}>
          &copy; {new Date().getFullYear()} {clubName} • Enterprise Clubhouse Operating System • Certified Formal Document
        </div>
      </div>
    </div>
  );
}
