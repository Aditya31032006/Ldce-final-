import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { resolveClubScope } from "../../shared/middleware/club-scope.middleware.js";
import { getMyNotificationsController, triggerRenewalRemindersController } from "./notifications.controller.js";

const router = Router();
router.use(verifyToken, resolveClubScope);

// Members get their own notifications
router.get("/my", requireRole('member', 'owner', 'manager'), getMyNotificationsController);

// Owners and managers can manually trigger the renewal reminder check
router.post("/run-renewal-reminders", requireRole('owner', 'manager'), triggerRenewalRemindersController);

export default router;

