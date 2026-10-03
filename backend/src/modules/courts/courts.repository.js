import * as queries from './courts.query.js';
import { withTenantTransaction } from '../../shared/utils/transaction.util.js';

export async function getCourts(userId, clubId, activeOnly = null) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_COURTS, [clubId, activeOnly]);
    return res.rows;
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
      courtData.is_indoor,
      courtData.has_lighting,
      courtData.max_players,
      courtData.sort_order,
      courtData.is_active
    ];
    const res = await client.query(queries.INSERT_COURT, params);
    return res.rows[0];
  });
}

export async function getCourtAvailability(userId, clubId, day, sportId = null) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_COURT_AVAILABILITY, [clubId, day, sportId]);
    return res.rows;
  });
}
