import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { resolveClubScope } from "../../shared/middleware/club-scope.middleware.js";
import { 
  getStaffController, 
  addStaffController, 
  getEmployeesController 
} from "./hr.controller.js";

const router = Router();
router.use(verifyToken, resolveClubScope);

router.get("/", requireRole('owner', 'manager'), getStaffController);
router.post("/", requireRole('owner', 'manager'), addStaffController);
router.get("/employees", requireRole('owner', 'manager'), getEmployeesController);

export default router;
