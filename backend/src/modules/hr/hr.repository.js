import * as queries from './hr.query.js';
import { withTenantTransaction } from '../../shared/utils/transaction.util.js';

export async function getStaff(userId, clubId, activeOnly = null) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_STAFF, [clubId, activeOnly]);
    return res.rows;
  });
}

export async function addStaff(userId, clubId, staffData) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.ADD_STAFF, [
      clubId,
      staffData.user_id,
      staffData.role
    ]);
    return res.rows[0];
  });
}

export async function removeStaff(userId, clubId, staffUserId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.REMOVE_STAFF, [clubId, staffUserId]);
    return res.rows[0];
  });
}

export async function getEmployees(userId, clubId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_EMPLOYEES, [clubId]);
    return res.rows;
  });
}