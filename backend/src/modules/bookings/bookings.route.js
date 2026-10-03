import { Router } from "express";
import { verifyToken } from "../../shared/middleware/auth.middleware.js";
import { resolveClubScope } from "../../shared/middleware/club-scope.middleware.js";
import { createBookingController, getBookingByIdController } from "./bookings.controller.js";

const router = Router();
router.use(verifyToken, resolveClubScope);

router.post("/", createBookingController);
router.get("/:id", getBookingByIdController);

export default router;
