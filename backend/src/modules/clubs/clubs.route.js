import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { resolveClubScope } from "../../shared/middleware/club-scope.middleware.js";
import { 
  registerClubController, 
  getClubDetailsController, 
  updateClubDetailsController,
  getClubSettingsController,
  updateClubSettingsController,
  getMyClubsController,
  getPublicClubsController,
  joinClubController,
  getClubGalleryController,
  addClubGalleryController,
  deleteClubGalleryController
} from "./clubs.controller.js";

const router = Router();

// ───── Static / Keyword Routes MUST come before /:clubId ─────

// Public club discovery with fuzzy search and pagination
router.get("/public", getPublicClubsController);

// Authenticated user's joined clubs across the platform
router.get("/my-clubs", verifyToken, getMyClubsController);

// Create club (no club scope needed yet)
router.post("/register", verifyToken, registerClubController);

// ───── Dynamic :clubId Routes ─────

// Specific club details (public view or member view)
router.get("/:clubId", resolveClubScope, getClubDetailsController);

// Club gallery public read
router.get("/:clubId/gallery", resolveClubScope, getClubGalleryController);

// Join a club as a member
router.post("/:clubId/join", verifyToken, joinClubController);

// ───── Scoped Club Management (Owner/Manager) ─────
// These use club scope resolved from request context (header/cookie), not URL param

// Only owners and managers can update club details or settings
router.put("/:clubId", verifyToken, resolveClubScope, requireRole('owner', 'manager'), updateClubDetailsController);
router.get("/:clubId/settings", verifyToken, resolveClubScope, requireRole('owner', 'manager', 'front_desk', 'shop_staff', 'bar_staff'), getClubSettingsController);
router.put("/:clubId/settings", verifyToken, resolveClubScope, requireRole('owner', 'manager'), updateClubSettingsController);

// Gallery management for club (Owner only for modifications)
router.post("/:clubId/gallery", verifyToken, resolveClubScope, requireRole('owner'), addClubGalleryController);
router.delete("/:clubId/gallery/:imageId", verifyToken, resolveClubScope, requireRole('owner'), deleteClubGalleryController);

export default router;
