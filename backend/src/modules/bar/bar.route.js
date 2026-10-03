import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { resolveClubScope } from "../../shared/middleware/club-scope.middleware.js";
import {
  getTablesController,
  createTableController,
  updateTableStatusController,
  updateTableController,
  getMenuController,
  createMenuCategoryController,
  createMenuItemController,
  updateMenuItemController,
  getOrdersController,
  getOrderByIdController,
  createBarOrderController,
  addItemsToOrderController,
  getKdsController,
  updateKdsItemStatusController,
  billOrderController,
  payAndSettleOrderController,
  cancelOrderController,
  createRazorpayOrderController,
  verifyRazorpayPaymentController,
  getTabsController,
  settleTabController,
  getDailyClosingController,
} from "./bar.controller.js";

const router = Router();

// Allow public/members or staff with club-scope
router.use(verifyToken, resolveClubScope);

// Menu & Tables
router.get("/menu", getMenuController);
router.post("/menu/category", requireRole('owner', 'manager'), createMenuCategoryController);
router.post("/menu/item", requireRole('owner', 'manager', 'bar_staff'), createMenuItemController);
router.put("/menu/item/:id", requireRole('owner', 'manager', 'bar_staff'), updateMenuItemController);

router.get("/tables", getTablesController);
router.post("/tables", requireRole('owner', 'manager', 'bar_staff', 'front_desk'), createTableController);
router.put("/tables/:id", requireRole('owner', 'manager', 'bar_staff'), updateTableController);
router.put("/tables/:id/status", requireRole('owner', 'manager', 'bar_staff', 'front_desk'), updateTableStatusController);

// Orders & Billing
router.get("/orders", getOrdersController);
router.get("/orders/:id", getOrderByIdController);
router.post("/orders", createBarOrderController);
router.post("/orders/:id/items", addItemsToOrderController);
router.post("/orders/:id/cancel", cancelOrderController);
router.post("/orders/:id/bill", requireRole('owner', 'manager', 'front_desk', 'bar_staff'), billOrderController);
router.post("/orders/:id/pay", payAndSettleOrderController);

// Razorpay Online Payments
router.post("/payments/razorpay/create-order", createRazorpayOrderController);
router.post("/payments/razorpay/verify", verifyRazorpayPaymentController);

// Kitchen Display Screen (KDS)
router.get("/kds", requireRole('owner', 'manager', 'front_desk', 'bar_staff', 'kitchen'), getKdsController);
router.put("/kds/:itemId", requireRole('owner', 'manager', 'front_desk', 'bar_staff', 'kitchen'), updateKdsItemStatusController);

// Member Tabs
router.get("/tabs", requireRole('owner', 'manager', 'bar_staff', 'front_desk'), getTabsController);
router.post("/tabs/:id/settle", requireRole('owner', 'manager', 'bar_staff', 'front_desk'), settleTabController);

// End-of-Day Closing Report
router.get("/daily-closing", requireRole('owner', 'manager', 'bar_staff'), getDailyClosingController);

export default router;
