import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { resolveClubScope } from "../../shared/middleware/club-scope.middleware.js";
import { getPlansController, createPlanController } from "./plans.controller.js";

const router = Router();
router.use(resolveClubScope);

// Public/Member can view active plans
router.get("/", getPlansController);

// Only manager/owner can create
router.post("/", verifyToken, requireRole('owner', 'manager'), createPlanController);

export default router;
