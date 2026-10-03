import { Router } from "express";
import { verifyToken } from "../../shared/middleware/auth.middleware.js";
import { resolveClubScope } from "../../shared/middleware/club-scope.middleware.js";
import { createShopOrderController } from "./orders.controller.js";

const router = Router();
router.use(verifyToken, resolveClubScope);

router.post("/", createShopOrderController);

export default router;
