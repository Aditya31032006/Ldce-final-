import * as queries from './sports.query.js';
import { withTenantTransaction } from '../../shared/utils/transaction.util.js';

export async function getSports(userId, clubId, activeOnly = null) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_SPORTS, [clubId, activeOnly]);
    return res.rows;
  });
}

export async function createSport(userId, clubId, data) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.INSERT_SPORT, [
      clubId,
      data.name,
      data.description || null,
      data.icon || null,
      data.sort_order ?? 0,
      data.is_active !== false,
    ]);
    return res.rows[0];
  });
}

export async function updateSport(userId, clubId, sportId, data) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.UPDATE_SPORT, [
      clubId,
      sportId,
      data.name ?? null,
      data.description ?? null,
      data.icon ?? null,
      data.sort_order ?? null,
      data.is_active ?? null,
    ]);
    if (!res.rows[0]) throw Object.assign(new Error('Sport not found'), { status: 404 });
    return res.rows[0];
  });
}

export async function deleteSport(userId, clubId, sportId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.DELETE_SPORT, [clubId, sportId]);
    if (!res.rows[0]) throw Object.assign(new Error('Sport not found'), { status: 404 });
    return res.rows[0];
  });
}
