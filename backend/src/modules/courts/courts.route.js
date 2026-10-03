import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { resolveClubScope } from "../../shared/middleware/club-scope.middleware.js";
import { getCourtsController, createCourtController, getCourtAvailabilityController } from "./courts.controller.js";

const router = Router();
router.use(resolveClubScope); // Scope can be applied for public routes too

// Public routes
router.get("/", getCourtsController);
router.get("/availability", getCourtAvailabilityController);

// Protected routes
router.use(verifyToken);
router.post("/", requireRole('owner', 'manager'), createCourtController);

export default router;
