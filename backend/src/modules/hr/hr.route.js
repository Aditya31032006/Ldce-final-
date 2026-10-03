import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { resolveClubScope } from "../../shared/middleware/club-scope.middleware.js";
import { 
  getStaffController, 
  addStaffController, 
  removeStaffController,
  getEmployeesController 
} from "./hr.controller.js";

const router = Router();
router.use(verifyToken, resolveClubScope);

// Staff management (Owner only)
router.get("/", requireRole('owner'), getStaffController);
router.post("/", requireRole('owner'), addStaffController);
router.delete("/:userId", requireRole('owner'), removeStaffController);
router.delete("/staff/:userId", requireRole('owner'), removeStaffController);
router.get("/employees", requireRole('owner', 'manager'), getEmployeesController);

export default router;


