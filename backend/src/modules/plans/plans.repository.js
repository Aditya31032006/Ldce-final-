import * as queries from './plans.query.js';
import { withTenantTransaction } from '../../shared/utils/transaction.util.js';

export async function getPlans(userId, clubId, activeOnly = null) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_ALL_PLANS, [clubId, activeOnly]);
    return res.rows;
  });
}

export async function getPlanById(userId, clubId, planId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_PLAN_BY_ID, [clubId, planId]);
    return res.rows[0] || null;
  });
}

export async function createPlan(userId, clubId, planData) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const params = [
      clubId,
      planData.name,
      planData.code || null,
      planData.description || null,
      planData.color || null,
      planData.tier_rank ?? 0,
      planData.duration_days,
      planData.price ?? 0,
      planData.joining_fee ?? 0,
      planData.min_age ?? null,
      planData.max_age ?? null,
      planData.court_free ?? false,
      planData.court_discount_percent ?? 0,
      planData.shop_discount_percent ?? 0,
      planData.bar_discount_percent ?? 0,
      planData.max_bookings_per_day ?? null,
      planData.advance_booking_days ?? null,
      planData.allows_social_play !== false,
      planData.is_public !== false,
      planData.is_active !== false,
      planData.sort_order ?? 0,
    ];
    const res = await client.query(queries.CREATE_PLAN, params);
    return res.rows[0];
  });
}

export async function updatePlan(userId, clubId, planId, data) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.UPDATE_PLAN, [
      clubId, planId,
      data.name ?? null,
      data.code ?? null,
      data.description ?? null,
      data.color ?? null,
      data.tier_rank ?? null,
      data.duration_days ?? null,
      data.price ?? null,
      data.joining_fee ?? null,
      data.min_age ?? null,
      data.max_age ?? null,
      data.court_free ?? null,
      data.court_discount_percent ?? null,
      data.shop_discount_percent ?? null,
      data.bar_discount_percent ?? null,
      data.max_bookings_per_day ?? null,
      data.advance_booking_days ?? null,
      data.allows_social_play ?? null,
      data.is_public ?? null,
      data.is_active ?? null,
      data.sort_order ?? null,
    ]);
    if (!res.rows[0]) throw Object.assign(new Error('Plan not found'), { status: 404 });
    return res.rows[0];
  });
}

export async function deletePlan(userId, clubId, planId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.DELETE_PLAN, [clubId, planId]);
    if (!res.rows[0]) throw Object.assign(new Error('Plan not found'), { status: 404 });
    return res.rows[0];
  });
}

export async function addPlanBenefit(userId, clubId, planId, label, sortOrder = 0) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.ADD_PLAN_BENEFIT, [clubId, planId, label, sortOrder]);
    return res.rows[0];
  });
}

export async function deletePlanBenefit(userId, clubId, planId, benefitId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.DELETE_PLAN_BENEFIT, [clubId, planId, benefitId]);
    if (!res.rows[0]) throw Object.assign(new Error('Benefit not found'), { status: 404 });
    return res.rows[0];
  });
}
