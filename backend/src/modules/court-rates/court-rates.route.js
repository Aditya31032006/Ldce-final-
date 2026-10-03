import { Router } from 'express';
import { verifyToken, requireRole } from '../../shared/middleware/auth.middleware.js';
import { resolveClubScope } from '../../shared/middleware/club-scope.middleware.js';
import { getCourtRatesController, createCourtRateController, updateCourtRateController, deleteCourtRateController } from './court-rates.controller.js';

const router = Router();
router.use(resolveClubScope);

router.get('/', verifyToken, requireRole('owner', 'manager'), getCourtRatesController);
router.post('/', verifyToken, requireRole('owner', 'manager'), createCourtRateController);
router.put('/:rateId', verifyToken, requireRole('owner', 'manager'), updateCourtRateController);
router.delete('/:rateId', verifyToken, requireRole('owner'), deleteCourtRateController);

export default router;
