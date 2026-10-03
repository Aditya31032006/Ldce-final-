import { Router } from "express";
import { registerController, loginController, logoutController, getMeController } from "./auth.controller.js";
import { verifyToken } from "../../shared/middleware/auth.middleware.js";

const router = Router();

router.post("/register", registerController);
router.post("/login", loginController);
router.post("/logout", logoutController);

router.use(verifyToken);
router.get("/me", getMeController);

export default router;
