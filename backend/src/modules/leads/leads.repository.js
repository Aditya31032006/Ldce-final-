import * as queries from './leads.query.js';
import { withTenantTransaction } from '../../shared/utils/transaction.util.js';

export async function createLead(userId, clubId, leadData) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.INSERT_LEAD, [
      clubId,
      leadData.full_name,
      leadData.phone || null,
      leadData.email || null,
      leadData.source || 'website',
      leadData.interested_sport_id || null,
      leadData.interested_plan_id || null,
      leadData.message || null,
      leadData.preferred_trial_at || null
    ]);
    return res.rows[0];
  });
}

export async function getLeads(userId, clubId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_LEADS, [clubId]);
    return res.rows;
  });
}

export async function updateLeadStatus(userId, clubId, leadId, updateData) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.UPDATE_LEAD_STATUS, [
      leadId,
      updateData.status,
      updateData.assigned_to || null,
      updateData.next_follow_up_at || null,
      updateData.lost_reason || null,
      clubId
    ]);
    return res.rows[0];
  });
}

export async function getQuotes(userId, clubId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_QUOTES, [clubId]);
    return res.rows;
  });
}