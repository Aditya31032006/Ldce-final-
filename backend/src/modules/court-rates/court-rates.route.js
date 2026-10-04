import { Router } from 'express';
import { verifyToken, requireRole } from '../../shared/middleware/auth.middleware.js';
import { resolveClubScope } from '../../shared/middleware/club-scope.middleware.js';
import { getCourtRatesController, createCourtRateController, updateCourtRateController, deleteCourtRateController } from './court-rates.controller.js';

const router = Router();
router.use(resolveClubScope);

router.get('/', verifyToken, getCourtRatesController);
router.post('/', verifyToken, requireRole('owner', 'manager', 'admin'), createCourtRateController);
router.put('/:rateId', verifyToken, requireRole('owner', 'manager', 'admin'), updateCourtRateController);
router.delete('/:rateId', verifyToken, requireRole('owner', 'manager', 'admin'), deleteCourtRateController);

export default router;
