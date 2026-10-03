import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { resolveClubScope } from "../../shared/middleware/club-scope.middleware.js";
import { 
  getProductsController, 
  getCategoriesController,
  createProductController, 
  updateProductController,
  deleteProductController,
  getPurchaseOrdersController 
} from "./inventory.controller.js";

const router = Router();
router.use(verifyToken, resolveClubScope);

// Products catalog endpoint
router.get("/products", getProductsController);
router.get("/categories", getCategoriesController);

// Inventory management endpoints (Owner, Manager, and Shop Staff only)
router.post("/products", requireRole('owner', 'manager', 'admin', 'shop_staff'), createProductController);
router.put("/products/:id", requireRole('owner', 'manager', 'admin', 'shop_staff'), updateProductController);
router.delete("/products/:id", requireRole('owner', 'manager', 'admin', 'shop_staff'), deleteProductController);
router.get("/purchase-orders", requireRole('owner', 'manager', 'admin', 'shop_staff'), getPurchaseOrdersController);

export default router;
