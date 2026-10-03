import { Router } from 'express';
import { verifyToken, requireRole } from '../../shared/middleware/auth.middleware.js';
import { resolveClubScope } from '../../shared/middleware/club-scope.middleware.js';
import {
  getCourtsController,
  getCourtByIdController,
  createCourtController,
  updateCourtController,
  deleteCourtController,
  getCourtAvailabilityController,
  getOperatingHoursController,
  upsertOperatingHoursController,
} from './courts.controller.js';

const router = Router();
router.use(resolveClubScope);

// Public / member readable
router.get('/', getCourtsController);
router.get('/availability', getCourtAvailabilityController);
router.get('/:courtId', getCourtByIdController);
router.get('/:courtId/hours', getOperatingHoursController);

// Owner/Manager management
router.post('/', verifyToken, requireRole('owner', 'manager'), createCourtController);
router.put('/:courtId', verifyToken, requireRole('owner', 'manager'), updateCourtController);
router.delete('/:courtId', verifyToken, requireRole('owner'), deleteCourtController);
router.put('/:courtId/hours', verifyToken, requireRole('owner', 'manager'), upsertOperatingHoursController);

export default router;
