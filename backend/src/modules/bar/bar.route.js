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
  deleteMenuItemController,
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
router.post("/menu/category", requireRole('admin', 'owner', 'manager'), createMenuCategoryController);
router.post("/menu/item", requireRole('admin', 'owner', 'manager', 'bar_staff', 'cafe_staff'), createMenuItemController);
router.put("/menu/item/:id", requireRole('admin', 'owner', 'manager', 'bar_staff', 'cafe_staff'), updateMenuItemController);
router.delete("/menu/item/:id", requireRole('admin', 'owner', 'manager', 'bar_staff', 'cafe_staff'), deleteMenuItemController);

router.get("/tables", getTablesController);
router.post("/tables", requireRole('admin', 'owner', 'manager', 'bar_staff', 'cafe_staff', 'front_desk'), createTableController);
router.put("/tables/:id", requireRole('admin', 'owner', 'manager', 'bar_staff', 'cafe_staff', 'front_desk'), updateTableController);
router.put("/tables/:id/status", requireRole('admin', 'owner', 'manager', 'bar_staff', 'cafe_staff', 'front_desk'), updateTableStatusController);

// Orders & Billing
router.get("/orders", getOrdersController);
router.get("/orders/:id", getOrderByIdController);
router.post("/orders", requireRole('admin', 'owner', 'manager', 'front_desk', 'bar_staff', 'cafe_staff', 'member'), createBarOrderController);
router.post("/orders/:id/items", requireRole('admin', 'owner', 'manager', 'front_desk', 'bar_staff', 'cafe_staff', 'member'), addItemsToOrderController);
router.post("/orders/:id/cancel", requireRole('admin', 'owner', 'manager', 'front_desk', 'bar_staff', 'cafe_staff'), cancelOrderController);
router.post("/orders/:id/bill", requireRole('admin', 'owner', 'manager', 'front_desk', 'bar_staff', 'cafe_staff'), billOrderController);
router.post("/orders/:id/pay", requireRole('admin', 'owner', 'manager', 'front_desk', 'bar_staff', 'cafe_staff', 'member'), payAndSettleOrderController);

// Razorpay Online Payments
router.post("/payments/razorpay/create-order", requireRole('admin', 'owner', 'manager', 'front_desk', 'bar_staff', 'cafe_staff', 'member'), createRazorpayOrderController);
router.post("/payments/razorpay/verify", requireRole('admin', 'owner', 'manager', 'front_desk', 'bar_staff', 'cafe_staff', 'member'), verifyRazorpayPaymentController);

// Kitchen Display Screen (KDS)
router.get("/kds", requireRole('owner', 'manager', 'front_desk', 'bar_staff', 'kitchen'), getKdsController);
router.put("/kds/:itemId", requireRole('owner', 'manager', 'front_desk', 'bar_staff', 'kitchen'), updateKdsItemStatusController);

// Member Tabs
router.get("/tabs", requireRole('owner', 'manager', 'bar_staff', 'front_desk'), getTabsController);
router.post("/tabs/:id/settle", requireRole('owner', 'manager', 'bar_staff', 'front_desk'), settleTabController);

// End-of-Day Closing Report
router.get("/daily-closing", requireRole('owner', 'manager', 'bar_staff'), getDailyClosingController);

export default router;
