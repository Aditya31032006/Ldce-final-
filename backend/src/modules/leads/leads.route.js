import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { resolveClubScope } from "../../shared/middleware/club-scope.middleware.js";
import { 
  createLeadController, 
  getLeadsController, 
  updateLeadStatusController, 
  getQuotesController 
} from "./leads.controller.js";

const router = Router();
router.use(resolveClubScope);

// Public route for enquiry form
router.post("/", createLeadController);

// Staff routes
router.use(verifyToken);
router.get("/", requireRole('owner', 'manager', 'front_desk'), getLeadsController);
router.put("/:id/status", requireRole('owner', 'manager', 'front_desk'), updateLeadStatusController);
router.get("/quotes", requireRole('owner', 'manager', 'front_desk'), getQuotesController);

export default router;
