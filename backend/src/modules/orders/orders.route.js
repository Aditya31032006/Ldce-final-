import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { resolveClubScope } from "../../shared/middleware/club-scope.middleware.js";
import { 
  createShopOrderController, 
  getShopOrdersController, 
  updateOrderStatusController,
  createShopRazorpayOrderController
} from "./orders.controller.js";

const router = Router();
router.use(verifyToken, resolveClubScope);

router.get("/", getShopOrdersController);
router.post("/", createShopOrderController);
router.post("/payments/razorpay/create-order", createShopRazorpayOrderController);
router.patch("/:id/status", requireRole('owner', 'manager', 'admin', 'shop_staff', 'front_desk'), updateOrderStatusController);

export default router;

