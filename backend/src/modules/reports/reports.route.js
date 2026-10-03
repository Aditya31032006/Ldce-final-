import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { resolveClubScope } from "../../shared/middleware/club-scope.middleware.js";
import { getDailySummaryController } from "./reports.controller.js";

const router = Router();
router.use(verifyToken, resolveClubScope);

router.get("/daily", requireRole('owner', 'manager'), getDailySummaryController);

export default router;
