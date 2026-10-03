import * as queries from './clubs.query.js';
import { withTenantTransaction } from '../../shared/utils/transaction.util.js';

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

export async function getClubDetails(userId, clubId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_CLUB_DETAILS, [clubId]);
    return res.rows[0] || null;
  });
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
