import { Router } from 'express';
import { verifyToken, requireRole } from '../../shared/middleware/auth.middleware.js';
import { resolveClubScope } from '../../shared/middleware/club-scope.middleware.js';
import { getSportsController, createSportController, updateSportController, deleteSportController } from './sports.controller.js';

const router = Router();
router.use(resolveClubScope);

// Anyone (public/member/staff) can view sports
router.get('/', getSportsController);

// Owner and manager only for management
router.post('/', verifyToken, requireRole('owner', 'manager'), createSportController);
router.put('/:sportId', verifyToken, requireRole('owner', 'manager'), updateSportController);
router.delete('/:sportId', verifyToken, requireRole('owner'), deleteSportController);

export default router;
