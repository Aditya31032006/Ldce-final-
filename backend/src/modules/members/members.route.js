import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { resolveClubScope } from "../../shared/middleware/club-scope.middleware.js";
import { createMemberController, getMemberByIdController, searchMembersController } from "./members.controller.js";

const router = Router();
router.use(verifyToken, resolveClubScope);

// Staff and Members can create a member (Members via self sign-up if allowed, else just staff)
router.post("/", createMemberController);

// Search requires staff roles
router.get("/search", requireRole('owner', 'manager', 'front_desk'), searchMembersController);

// Get member by ID
router.get("/:id", getMemberByIdController);

export default router;
