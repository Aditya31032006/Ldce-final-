import * as plansRepo from './plans.repository.js';

export async function getPlansController(req, res, next) {
  try {
    const activeOnly = req.user?.role === 'member' || req.user?.role === 'public' ? true : null;
    const plans = await plansRepo.getPlans(req.user?.id, req.clubId, activeOnly);
    return res.status(200).json({ plans });
  } catch (error) {
    next(error);
  }
}

export async function createPlanController(req, res, next) {
  try {
    const { name, duration_days } = req.body;
    if (!name || !duration_days) {
      return res.status(400).json({ message: "Name and duration_days are required" });
    }
    const plan = await plansRepo.createPlan(req.user.id, req.clubId, req.body);
    return res.status(201).json({ message: "Plan created", plan });
  } catch (error) {
    next(error);
  }
}
