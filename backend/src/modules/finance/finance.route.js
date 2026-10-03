import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { resolveClubScope } from "../../shared/middleware/club-scope.middleware.js";
import { 
  createPaymentController, 
  getPaymentsController, 
  getInvoicesController 
} from "./finance.controller.js";

const router = Router();
router.use(verifyToken, resolveClubScope);

// Creating payments involves various staff roles
router.post("/payments", requireRole('owner', 'manager', 'front_desk', 'bar_staff', 'shop_staff'), createPaymentController);

// Getting all payments is for managers and owners
router.get("/payments", requireRole('owner', 'manager'), getPaymentsController);
router.get("/invoices", requireRole('owner', 'manager'), getInvoicesController);

export default router;
