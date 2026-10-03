import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { resolveClubScope } from "../../shared/middleware/club-scope.middleware.js";
import { 
  getStaffController, 
  addStaffController, 
  removeStaffController,
  getEmployeesController,
  createEmployeeController,
  updateEmployeeController,
  deleteEmployeeController,
  getLeaveTypesController,
  createLeaveTypeController,
  getLeaveRequestsController,
  createLeaveRequestController,
  updateLeaveStatusController,
  getPayrollRunsController,
  getPayrollEntriesController,
  generateMonthlyPayrollController,
  approvePayrollRunController,
  getHRDiagnosticsController
} from "./hr.controller.js";

const router = Router();
router.use(verifyToken, resolveClubScope);

// ─── Staff Access (Owner & Manager) ─────────────────────────────────────────
router.get("/", requireRole('owner', 'manager'), getStaffController);
router.post("/", requireRole('owner', 'manager'), addStaffController);
router.delete("/:userId", requireRole('owner', 'manager'), removeStaffController);
router.delete("/staff/:userId", requireRole('owner', 'manager'), removeStaffController);

// ─── Employees & Salary Management (Owner & Manager) ────────────────────────
router.get("/employees", requireRole('owner', 'manager'), getEmployeesController);
router.post("/employees", requireRole('owner', 'manager'), createEmployeeController);
router.put("/employees/:id", requireRole('owner', 'manager'), updateEmployeeController);
router.delete("/employees/:id", requireRole('owner', 'manager'), deleteEmployeeController);

// ─── Leave Management (Owner & Manager) ─────────────────────────────────────
router.get("/leave-types", requireRole('owner', 'manager'), getLeaveTypesController);
router.post("/leave-types", requireRole('owner', 'manager'), createLeaveTypeController);
router.get("/leaves", requireRole('owner', 'manager'), getLeaveRequestsController);
router.post("/leaves", requireRole('owner', 'manager'), createLeaveRequestController);
router.put("/leaves/:id/status", requireRole('owner', 'manager'), updateLeaveStatusController);

// ─── Payroll & Salary Runs (Owner & Manager) ────────────────────────────────
router.get("/payroll", requireRole('owner', 'manager'), getPayrollRunsController);
router.get("/payroll/:runId/entries", requireRole('owner', 'manager'), getPayrollEntriesController);
router.post("/payroll/run", requireRole('owner', 'manager'), generateMonthlyPayrollController);
router.put("/payroll/:runId/pay", requireRole('owner', 'manager'), approvePayrollRunController);

// ─── HR & Workforce Diagnostics (Owner & Manager) ───────────────────────────
router.get("/diagnostics", requireRole('owner', 'manager'), getHRDiagnosticsController);

export default router;
