import { Router } from "express";
import { verifyToken } from "../../shared/middleware/auth.middleware.js";
import { resolveClubScope } from "../../shared/middleware/club-scope.middleware.js";
import {
  createBookingController,
  getBookingsController,
  getCalendarBookingsController,
  getBookingByIdController,
  cancelBookingController,
} from "./bookings.controller.js";

const router = Router();
router.use(verifyToken, resolveClubScope);

router.get("/", getBookingsController);
router.get("/calendar", getCalendarBookingsController);
router.post("/", createBookingController);
router.get("/:id", getBookingByIdController);
router.put("/:id/cancel", cancelBookingController);

export default router;
