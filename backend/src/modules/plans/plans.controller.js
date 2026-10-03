import * as plansRepo from './plans.repository.js';

export async function getPlansController(req, res, next) {
  try {
    const activeOnly = req.query.active === 'true' ? true : req.query.active === 'false' ? false : null;
    const plans = await plansRepo.getPlans(req.user?.id, req.clubId, activeOnly);
    return res.status(200).json({ success: true, plans });
  } catch (error) { next(error); }
}

export async function getPlanByIdController(req, res, next) {
  try {
    const plan = await plansRepo.getPlanById(req.user?.id, req.clubId, req.params.planId);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    return res.status(200).json({ success: true, plan });
  } catch (error) { next(error); }
}

export async function createPlanController(req, res, next) {
  try {
    const { name, duration_days } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Plan name is required' });
    if (!duration_days || duration_days < 1) return res.status(400).json({ success: false, message: 'duration_days must be > 0' });
    const plan = await plansRepo.createPlan(req.user.id, req.clubId, { ...req.body, name: name.trim() });
    return res.status(201).json({ success: true, message: 'Plan created', plan });
  } catch (error) { next(error); }
}

export async function updatePlanController(req, res, next) {
  try {
    const plan = await plansRepo.updatePlan(req.user.id, req.clubId, req.params.planId, req.body);
    return res.status(200).json({ success: true, message: 'Plan updated', plan });
  } catch (error) { next(error); }
}

export async function deletePlanController(req, res, next) {
  try {
    const plan = await plansRepo.deletePlan(req.user.id, req.clubId, req.params.planId);
    return res.status(200).json({ success: true, message: 'Plan deactivated', plan });
  } catch (error) { next(error); }
}

export async function addPlanBenefitController(req, res, next) {
  try {
    const { label, sort_order } = req.body;
    if (!label?.trim()) return res.status(400).json({ success: false, message: 'Benefit label is required' });
    const benefit = await plansRepo.addPlanBenefit(req.user.id, req.clubId, req.params.planId, label.trim(), sort_order ?? 0);
    return res.status(201).json({ success: true, message: 'Benefit added', benefit });
  } catch (error) { next(error); }
}

export async function deletePlanBenefitController(req, res, next) {
  try {
    await plansRepo.deletePlanBenefit(req.user.id, req.clubId, req.params.planId, req.params.benefitId);
    return res.status(200).json({ success: true, message: 'Benefit removed' });
  } catch (error) { next(error); }
}
