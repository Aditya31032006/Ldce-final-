import * as queries from './courts.query.js';
import { withTenantTransaction } from '../../shared/utils/transaction.util.js';

export async function getCourts(userId, clubId, activeOnly = null) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_COURTS, [clubId, activeOnly]);
    return res.rows;
  });
}

export async function getCourtById(userId, clubId, courtId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_COURT_BY_ID, [clubId, courtId]);
    return res.rows[0] || null;
  });
}

export async function createCourt(userId, clubId, courtData) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const params = [
      clubId,
      courtData.sport_id,
      courtData.name,
      courtData.surface || null,
      courtData.description || null,
      courtData.image_url || null,
      courtData.is_indoor ?? false,
      courtData.has_lighting ?? false,
      courtData.max_players ?? 4,
      courtData.sort_order ?? 0,
      courtData.is_active !== false,
    ];
    const res = await client.query(queries.INSERT_COURT, params);
    return res.rows[0];
  });
}

export async function updateCourt(userId, clubId, courtId, data) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.UPDATE_COURT, [
      clubId, courtId,
      data.sport_id ?? null,
      data.name ?? null,
      data.surface ?? null,
      data.description ?? null,
      data.image_url ?? null,
      data.is_indoor ?? null,
      data.has_lighting ?? null,
      data.max_players ?? null,
      data.sort_order ?? null,
      data.is_active ?? null,
    ]);
    if (!res.rows[0]) throw Object.assign(new Error('Court not found'), { status: 404 });
    return res.rows[0];
  });
}

export async function deleteCourt(userId, clubId, courtId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.DELETE_COURT, [clubId, courtId]);
    if (!res.rows[0]) throw Object.assign(new Error('Court not found'), { status: 404 });
    return res.rows[0];
  });
}

export async function getCourtAvailability(userId, clubId, day, sportId = null) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_COURT_AVAILABILITY, [clubId, day, sportId]);
    return res.rows;
  });
}

export async function getOperatingHours(userId, clubId, courtId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_OPERATING_HOURS, [clubId, courtId]);
    return res.rows;
  });
}

export async function upsertOperatingHours(userId, clubId, courtId, hoursArray) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const results = [];
    for (const h of hoursArray) {
      const res = await client.query(queries.UPSERT_OPERATING_HOUR, [
        clubId, courtId, h.weekday, h.opens_at || '06:00', h.closes_at || '22:00', h.is_closed ?? false,
      ]);
      results.push(res.rows[0]);
    }
    return results;
  });
}
