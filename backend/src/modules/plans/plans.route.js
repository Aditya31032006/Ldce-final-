import { Router } from 'express';
import { verifyToken, requireRole } from '../../shared/middleware/auth.middleware.js';
import { resolveClubScope } from '../../shared/middleware/club-scope.middleware.js';
import {
  getPlansController,
  getPlanByIdController,
  createPlanController,
  updatePlanController,
  deletePlanController,
  addPlanBenefitController,
  deletePlanBenefitController,
} from './plans.controller.js';

const router = Router();
router.use(resolveClubScope);

// Anyone can view plans (public pricing page)
router.get('/', getPlansController);
router.get('/:planId', getPlanByIdController);

// Owner/Manager management
router.post('/', verifyToken, requireRole('owner', 'manager'), createPlanController);
router.put('/:planId', verifyToken, requireRole('owner', 'manager'), updatePlanController);
router.delete('/:planId', verifyToken, requireRole('owner'), deletePlanController);

// Benefits sub-resource
router.post('/:planId/benefits', verifyToken, requireRole('owner', 'manager'), addPlanBenefitController);
router.delete('/:planId/benefits/:benefitId', verifyToken, requireRole('owner', 'manager'), deletePlanBenefitController);

export default router;
