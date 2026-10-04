import { Router } from 'express';
import { verifyToken, requireRole } from '../../shared/middleware/auth.middleware.js';
import { resolveClubScope } from '../../shared/middleware/club-scope.middleware.js';
import { chatStreamController, chatMessageController } from './chat.controller.js';

const router = Router();

// Secure all chat routes: Authentication required + Active Club Scope
router.use(verifyToken, resolveClubScope);

// Streaming endpoint (SSE) for real-time token and tool event streaming
router.post('/stream', requireRole('owner', 'manager', 'admin'), chatStreamController);

// Standard JSON fallback endpoint
router.post('/message', requireRole('owner', 'manager', 'admin'), chatMessageController);

export default router;
