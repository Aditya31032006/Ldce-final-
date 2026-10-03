import { Router } from "express";
import { 
  registerController, 
  loginController, 
  logoutController, 
  getMeController,
  googleCallbackController 
} from "./auth.controller.js";
import { verifyToken } from "../../shared/middleware/auth.middleware.js";
import { signupValidation, loginValidation } from "../../validation/index.js";
import passport from "../../config/passport.js";
import config from "../../config/config.js";

const router = Router();

// Local Registration & Login with validation
router.post("/register", signupValidation, registerController);
router.post("/login", loginValidation, loginController);
router.post("/logout", logoutController);

// Google OAuth routes (with graceful fallback if unconfigured)
if (config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET) {
  router.get(
    "/google",
    passport.authenticate("google", { scope: ["profile", "email"], session: false })
  );

  router.get(
    "/google/callback",
    passport.authenticate("google", { session: false, failureRedirect: "/login" }),
    googleCallbackController
  );
} else {
  router.get("/google", (req, res) => {
    res.status(501).json({ message: "Google OAuth credentials not configured on the server." });
  });
  router.get("/google/callback", (req, res) => {
    res.redirect(`${config.CLIENT_URL}/login?error=google_auth_not_configured`);
  });
}

// Protected routes
router.use(verifyToken);
router.get("/me", getMeController);

export default router;
