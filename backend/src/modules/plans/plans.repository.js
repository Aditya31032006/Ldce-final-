import * as queries from './plans.query.js';
import { withTenantTransaction } from '../../shared/utils/transaction.util.js';

export async function getPlans(userId, clubId, activeOnly = null) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_ALL_PLANS, [clubId, activeOnly]);
    return res.rows;
  });
}

export async function createPlan(userId, clubId, planData) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const params = [
      clubId,
      planData.name, planData.code, planData.description, planData.color,
      planData.tier_rank || 0, planData.duration_days, planData.price || 0, planData.joining_fee || 0,
      planData.min_age, planData.max_age, planData.court_free || false,
      planData.court_discount_percent || 0, planData.shop_discount_percent || 0, planData.bar_discount_percent || 0,
      planData.max_bookings_per_day, planData.advance_booking_days,
      planData.allows_social_play !== false, planData.is_public !== false,
      planData.is_active !== false, planData.sort_order || 0
    ];
    const res = await client.query(queries.CREATE_PLAN, params);
    return res.rows[0];
  });
}
