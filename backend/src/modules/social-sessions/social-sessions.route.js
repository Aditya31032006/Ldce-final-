import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { resolveClubScope } from "../../shared/middleware/club-scope.middleware.js";
import { getSocialSessionsController, joinSocialSessionController } from "./social-sessions.controller.js";

const router = Router();
router.use(resolveClubScope);

// Public route to view sessions
router.get("/", getSocialSessionsController);

// Members and Staff can join
router.post("/join", verifyToken, joinSocialSessionController);

export default router;
