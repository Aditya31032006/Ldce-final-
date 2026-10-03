import * as q from './court-rates.query.js';
import { withTenantTransaction } from '../../shared/utils/transaction.util.js';

export async function getCourtRates(userId, clubId, activeOnly = null) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(q.GET_COURT_RATES, [clubId, activeOnly]);
    return res.rows;
  });
}

export async function createCourtRate(userId, clubId, data) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(q.INSERT_COURT_RATE, [
      clubId,
      data.sport_id || null,
      data.court_id || null,
      data.plan_id || null,
      data.weekday ?? null,
      data.time_from || null,
      data.time_to || null,
      data.valid_from || null,
      data.valid_to || null,
      data.price,
      data.priority ?? 0,
      data.is_active !== false,
    ]);
    return res.rows[0];
  });
}

export async function updateCourtRate(userId, clubId, rateId, data) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(q.UPDATE_COURT_RATE, [
      clubId, rateId,
      data.sport_id ?? null,
      data.court_id ?? null,
      data.plan_id ?? null,
      data.weekday ?? null,
      data.time_from ?? null,
      data.time_to ?? null,
      data.valid_from ?? null,
      data.valid_to ?? null,
      data.price ?? null,
      data.priority ?? null,
      data.is_active ?? null,
    ]);
    if (!res.rows[0]) throw Object.assign(new Error('Rate not found'), { status: 404 });
    return res.rows[0];
  });
}

export async function deleteCourtRate(userId, clubId, rateId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(q.DELETE_COURT_RATE, [clubId, rateId]);
    if (!res.rows[0]) throw Object.assign(new Error('Rate not found'), { status: 404 });
    return res.rows[0];
  });
}
