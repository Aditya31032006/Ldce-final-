import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { resolveClubScope } from "../../shared/middleware/club-scope.middleware.js";
import { 
  getDailySummaryController, 
  getDashboardDataController, 
  getAnalyticsDataController 
} from "./reports.controller.js";

const router = Router();
router.use(verifyToken, resolveClubScope);

// Operational Dashboard Metrics (all staff roles)
router.get(
  "/dashboard", 
  requireRole('owner', 'manager', 'admin', 'front_desk', 'shop_staff', 'bar_staff'), 
  getDashboardDataController
);

// Deep-dive Analytics & Financial Reports (Owner, Manager, Admin)
router.get(
  "/analytics", 
  requireRole('owner', 'manager', 'admin'), 
  getAnalyticsDataController
);

// Legacy/Daily Summary endpoint
router.get(
  "/daily", 
  requireRole('owner', 'manager', 'admin'), 
  getDailySummaryController
);

export default router;
