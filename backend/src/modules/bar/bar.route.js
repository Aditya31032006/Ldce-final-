import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { resolveClubScope } from "../../shared/middleware/club-scope.middleware.js";
import { getMenuController, createBarOrderController } from "./bar.controller.js";

const router = Router();
router.use(verifyToken, resolveClubScope);

router.get("/menu", getMenuController);

// Only staff can place bar orders typically, or maybe members if there's QR ordering
router.post("/orders", requireRole('owner', 'manager', 'bar_staff', 'front_desk'), createBarOrderController);

export default router;
