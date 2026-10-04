import { Router } from "express";
import { verifyToken } from "../../shared/middleware/auth.middleware.js";
import { resolveClubScope } from "../../shared/middleware/club-scope.middleware.js";
import {
  createBookingController,
  getBookingsController,
  getCalendarBookingsController,
  getBookingByIdController,
  cancelBookingController,
  createBookingRazorpayOrderController,
  getCourtAvailabilityController,
  resolveCourtPriceController,
} from "./bookings.controller.js";

const router = Router();
router.use(verifyToken, resolveClubScope);

router.get("/price", resolveCourtPriceController);
router.get("/availability", getCourtAvailabilityController);
router.get("/court/:courtId/availability", getCourtAvailabilityController);
router.get("/", getBookingsController);
router.get("/calendar", getCalendarBookingsController);
router.post("/", createBookingController);
router.post("/payments/razorpay/create-order", createBookingRazorpayOrderController);
router.get("/:id", getBookingByIdController);
router.put("/:id/cancel", cancelBookingController);

export default router;
