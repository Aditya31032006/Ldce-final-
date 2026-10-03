import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { resolveClubScope } from "../../shared/middleware/club-scope.middleware.js";
import {
  createMemberController,
  getMembersController,
  getMemberByIdController,
  searchMembersController,
} from "./members.controller.js";

const router = Router();
router.use(verifyToken, resolveClubScope);

// List all members
router.get("/", requireRole('owner', 'manager', 'admin', 'front_desk'), getMembersController);

// Search requires staff roles
router.get("/search", requireRole('owner', 'manager', 'admin', 'front_desk'), searchMembersController);

// Get member by ID
router.get("/:id", getMemberByIdController);

// Create member
router.post("/", createMemberController);

export default router;
