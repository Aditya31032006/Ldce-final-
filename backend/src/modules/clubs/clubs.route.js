import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { resolveClubScope } from "../../shared/middleware/club-scope.middleware.js";
import { 
  registerClubController, 
  getClubDetailsController, 
  updateClubDetailsController,
  getClubSettingsController,
  updateClubSettingsController
} from "./clubs.controller.js";

const router = Router();

// Public routes (using club-scope from params if needed)
router.get("/:clubId", resolveClubScope, getClubDetailsController);

// Authenticated routes
router.use(verifyToken);

// Create club (doesn't need club scope yet)
router.post("/register", registerClubController);

// Scope by club for subsequent routes
router.use(resolveClubScope);

// Only owners and managers can update club details or settings
router.put("/", requireRole('owner', 'manager'), updateClubDetailsController);
router.get("/settings", requireRole('owner', 'manager', 'front_desk', 'shop_staff', 'bar_staff'), getClubSettingsController);
router.put("/settings", requireRole('owner', 'manager'), updateClubSettingsController);

export default router;
