import * as queries from './social-sessions.query.js';
import { withTenantTransaction } from '../../shared/utils/transaction.util.js';

export async function getSocialSessions(userId, clubId, status) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_SOCIAL_SESSIONS, [clubId, status || null]);
    return res.rows;
  });
}

export async function joinSocialSession(userId, clubId, sessionData) {
  return withTenantTransaction(userId, clubId, async (client) => {
    // Triggers (trg_social_capacity) will handle capacity checks with FOR UPDATE locks.
    const res = await client.query(queries.INSERT_SOCIAL_SESSION_PLAYER, [
      clubId,
      sessionData.session_id,
      sessionData.member_id || null,
      sessionData.guest_name || null,
      sessionData.guest_phone || null,
      sessionData.fee_charged || 0
    ]);
    return res.rows[0];
  });
}
