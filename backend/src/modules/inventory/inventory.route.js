import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { resolveClubScope } from "../../shared/middleware/club-scope.middleware.js";
import { 
  getProductsController, 
  createProductController, 
  getPurchaseOrdersController 
} from "./inventory.controller.js";

const router = Router();
router.use(verifyToken, resolveClubScope);

// Everyone can view products
router.get("/products", getProductsController);

// Only staff can create products
router.post("/products", requireRole('owner', 'manager', 'shop_staff'), createProductController);
router.get("/purchase-orders", requireRole('owner', 'manager', 'shop_staff'), getPurchaseOrdersController);

export default router;
