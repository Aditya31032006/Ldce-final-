import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { resolveClubScope } from "../../shared/middleware/club-scope.middleware.js";
import { getMyNotificationsController } from "./notifications.controller.js";

const router = Router();
router.use(verifyToken, resolveClubScope);

// Members get their own notifications
router.get("/my", requireRole('member', 'owner', 'manager'), getMyNotificationsController);

export default router;
