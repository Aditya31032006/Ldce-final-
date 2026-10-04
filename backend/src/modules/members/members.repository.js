import * as queries from './members.query.js';
import { withTenantTransaction } from '../../shared/utils/transaction.util.js';

export async function createMember(userId, clubId, memberData) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const params = [
      clubId,
      memberData.user_id,
      memberData.first_name,
      memberData.last_name,
      memberData.phone,
      memberData.email,
      memberData.dob,
      memberData.gender,
      memberData.photo_url,
      memberData.address_line,
      memberData.city,
      memberData.postal_code,
      memberData.emergency_contact_name,
      memberData.emergency_contact_phone,
      memberData.emergency_contact_relation,
      memberData.status || 'active',
      userId
    ];
    const res = await client.query(queries.CREATE_MEMBER, params);
    return res.rows[0];
  });
}

export async function getMembers(userId, clubId, status = null, search = null) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_MEMBERS, [clubId, status, search ? search.trim() : null]);
    return res.rows || [];
  });
}

export async function getMemberById(userId, clubId, memberId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_MEMBER_BY_ID, [memberId, clubId]);
    return res.rows[0] || null;
  });
}

export async function searchMembers(userId, clubId, query, limit = 20) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.SEARCH_MEMBERS, [query, limit]);
    return res.rows;
  });
}
