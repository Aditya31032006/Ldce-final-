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

// Public club discovery with fuzzy search and scrolling pagination
router.get("/public", getPublicClubsController);

// Public routes (using club-scope from params if needed)
router.get("/:clubId", resolveClubScope, getClubDetailsController);
router.get("/:clubId/gallery", resolveClubScope, getClubGalleryController);

// Authenticated user's joined clubs across the platform
router.get("/my-clubs", verifyToken, getMyClubsController);

// Join a club as a member
router.post("/:clubId/join", verifyToken, joinClubController);

// Create club (doesn't need club scope yet)
router.post("/register", verifyToken, registerClubController);

// Specific club details (public view or member view)
router.get("/:clubId", resolveClubScope, getClubDetailsController);

// Scope by club for subsequent owner/manager routes
router.use(verifyToken, resolveClubScope);

// Gallery management for club (Owner only for modifications)
router.get("/gallery", getClubGalleryController);
router.post("/gallery", requireRole('owner'), addClubGalleryController);
router.delete("/gallery/:imageId", requireRole('owner'), deleteClubGalleryController);


// Only owners and managers can update club details or settings
router.put("/", requireRole('owner', 'manager'), updateClubDetailsController);
router.get("/settings", requireRole('owner', 'manager', 'front_desk', 'shop_staff', 'bar_staff'), getClubSettingsController);
router.put("/settings", requireRole('owner', 'manager'), updateClubSettingsController);

export default router;

