import * as queries from './clubs.query.js';
import { withTenantTransaction } from '../../shared/utils/transaction.util.js';
import { pool } from '../../config/database.js';

export async function registerClub(userId, { name, slug, city, phone, email, timezone }) {
  // We use the owner role (superuser) or a public role to register since the club_app 
  // might not have permission to insert into clubs if they are not owner yet.
  // Actually, the register_club function is SECURITY DEFINER and sets things up.
  // But let's run it with tenant transaction (clubId is null initially).
  return withTenantTransaction(userId, null, async (client) => {
    const res = await client.query(queries.REGISTER_CLUB, [userId, name, slug, city, phone, email, timezone]);
    return res.rows[0].club_id;
  });
}

export async function getClubDetails(userId, clubIdOrSlug) {
  const clubRes = await pool.query(queries.GET_CLUB_DETAILS, [clubIdOrSlug]);
  const club = clubRes.rows[0];
  if (!club) return null;

  const actualClubId = club.id;

  const [sportsRes, courtsRes, plansRes, galleryRes, memberRes] = await Promise.all([
    pool.query(queries.GET_CLUB_SPORTS, [actualClubId]),
    pool.query(queries.GET_CLUB_COURTS_OVERVIEW, [actualClubId]),
    pool.query(queries.GET_CLUB_PUBLIC_PLANS, [actualClubId]),
    pool.query(queries.GET_CLUB_GALLERY, [actualClubId]),
    userId ? pool.query(queries.GET_USER_MEMBERSHIP_STATUS, [actualClubId, userId]) : Promise.resolve({ rows: [] }),
  ]);

  const sports = sportsRes.rows || [];
  const courts = courtsRes.rows || [];
  const plans = plansRes.rows || [];
  const gallery = galleryRes.rows || [];
  const membership = memberRes.rows[0] || null;

  return {
    ...club,
    sports,
    courts,
    total_courts: courts.length,
    plans,
    accepting_members: plans.length > 0,
    gallery,
    membership: membership ? {
      is_member: true,
      member_id: membership.member_id,
      member_code: membership.member_code,
      member_status: membership.member_status,
      membership_id: membership.membership_id,
      plan_id: membership.plan_id,
      plan_name: membership.plan_name,
      plan_color: membership.plan_color,
      start_date: membership.start_date,
      end_date: membership.end_date,
      days_remaining: membership.days_remaining != null ? Number(membership.days_remaining) : null,
      needs_renewal: membership.days_remaining != null && Number(membership.days_remaining) <= 7,
      max_bookings_per_day: membership.max_bookings_per_day,
      court_free: membership.court_free,
      court_discount_percent: membership.court_discount_percent,
    } : { is_member: false },
  };
}

export async function updateClubDetails(userId, clubId, updates) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const params = [
      clubId,
      updates.name, updates.legal_name, updates.tagline, updates.description,
      updates.email, updates.phone, updates.website_url,
      updates.address_line1, updates.address_line2, updates.city, updates.state, updates.postal_code, updates.country,
      updates.timezone, updates.currency, updates.gstin, updates.pan,
      updates.logo_url, updates.cover_url, updates.brand_color, updates.is_public
    ];
    const res = await client.query(queries.UPDATE_CLUB_DETAILS, params);
    return res.rows[0];
  });
}

export async function getClubSettings(userId, clubId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_CLUB_SETTINGS, [clubId]);
    return res.rows[0] || null;
  });
}

export async function updateClubSettings(userId, clubId, updates) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const params = [
      clubId,
      updates.slot_length_minutes,
      updates.slot_interval_minutes,
      updates.max_bookings_per_member_per_day,
      updates.advance_booking_days,
      updates.min_notice_minutes,
      updates.cancellation_cutoff_hours,
      updates.cancel_refund_mode,
      updates.junior_max_age,
      updates.require_guardian_for_junior,
      updates.prices_include_tax,
      updates.member_code_prefix
    ];
    const res = await client.query(queries.UPDATE_CLUB_SETTINGS, params);
    return res.rows[0];
  });
}

export async function getMyClubs(userId) {
  const res = await pool.query(queries.GET_MY_CLUBS, [userId]);
  return res.rows;
}

export async function getPublicClubs({ search = '', page = 1, limit = 9 }) {
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const trimmedSearch = (search || '').trim();

  const [clubsRes, countRes, sportsRes] = await Promise.all([
    pool.query(queries.GET_PUBLIC_CLUBS, [trimmedSearch, limit, offset]),
    pool.query(queries.COUNT_PUBLIC_CLUBS, [trimmedSearch]),
    pool.query(queries.GET_DISTINCT_PUBLIC_SPORTS),
  ]);

  const total = parseInt(countRes.rows[0]?.total || 0, 10);
  const totalPages = Math.ceil(total / limit);

  return {
    clubs: clubsRes.rows,
    availableSports: sportsRes.rows.map((r) => r.name),
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
      totalPages,
      hasMore: parseInt(page, 10) < totalPages,
    },
  };
}

export async function joinClub(userId, clubId, planId = null) {
  // Fetch user info for name, email, phone
  const userRes = await pool.query('SELECT full_name, email, phone FROM app.users WHERE id = $1', [userId]);
  if (!userRes.rows.length) {
    throw new Error('User not found');
  }

  const u = userRes.rows[0];
  const nameParts = (u.full_name || 'Member').trim().split(' ');
  const firstName = nameParts[0] || 'Member';
  const lastName = nameParts.slice(1).join(' ') || '';

  const res = await pool.query(queries.JOIN_CLUB_AS_MEMBER, [
    clubId,
    userId,
    firstName,
    lastName,
    u.email,
    u.phone || null,
  ]);
  const member = res.rows[0];

  let membership = null;
  if (planId) {
    const planRes = await pool.query('SELECT * FROM app.plans WHERE id = $1 AND club_id = $2', [planId, clubId]);
    if (planRes.rows.length > 0) {
      const plan = planRes.rows[0];
      const durationDays = plan.duration_days || 30;
      const price = plan.price || 0;

      // Close previous active memberships to respect GiST exclusion constraint
      await pool.query(
        "UPDATE app.memberships SET status = 'cancelled', updated_at = now() WHERE club_id = $1 AND member_id = $2 AND status = 'active'",
        [clubId, member.id]
      );

      const msRes = await pool.query(`
        INSERT INTO app.memberships (
          club_id, member_id, plan_id, start_date, end_date, status, price_paid, created_by
        ) VALUES (
          $1, $2, $3, CURRENT_DATE, CURRENT_DATE + ($4 || ' days')::interval, 'active', $5, $6
        )
        RETURNING *;
      `, [clubId, member.id, plan.id, durationDays, price, userId]);

      membership = msRes.rows[0];
    }
  }

  return { member, membership };
}

export async function getClubGallery(userId, clubId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_CLUB_GALLERY, [clubId]);
    return res.rows;
  });
}

export async function addClubGalleryImages(userId, clubId, images) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const list = Array.isArray(images) ? images : [images];
    const inserted = [];
    for (const item of list) {
      const imageUrl = typeof item === 'string' ? item : item.imageUrl || item.image_url;
      const caption = typeof item === 'object' ? (item.caption || null) : null;
      const sortOrder = typeof item === 'object' ? (item.sortOrder || item.sort_order || 0) : 0;
      if (imageUrl && imageUrl.trim()) {
        const res = await client.query(queries.ADD_CLUB_GALLERY_IMAGE, [
          clubId,
          imageUrl.trim(),
          caption,
          sortOrder,
        ]);
        inserted.push(res.rows[0]);
      }
    }
    return inserted;
  });
}

export async function deleteClubGalleryImage(userId, clubId, imageId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.DELETE_CLUB_GALLERY_IMAGE, [clubId, imageId]);
    return res.rows[0];
  });
}

