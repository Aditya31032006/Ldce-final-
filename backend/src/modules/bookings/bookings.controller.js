import * as bookingsRepo from './bookings.repository.js';

export async function createBookingController(req, res, next) {
  try {
    const { court_id, start_at, end_at, member_id, guest_name } = req.body;

    if (!court_id || !start_at || !end_at) {
      return res.status(400).json({ message: "court_id, start_at, and end_at are required" });
    }

    if (!member_id && !guest_name) {
      return res.status(400).json({ message: "Either member_id or guest_name is required" });
    }

    // Force member_id to current user if role is 'member' to prevent booking for others
    if (req.user.role === 'member') {
      req.body.member_id = req.user.memberId;
      req.body.channel = 'online';
      req.body.status = 'pending';
      // The DB triggers trg_a_booking_member_pricing and trg_b_booking_rules will handle pricing and limits.
    } else {
      req.body.channel = req.body.channel || 'counter';
    }

    const booking = await bookingsRepo.createBooking(req.user.id, req.clubId, req.body);
    return res.status(201).json({ message: "Booking created", booking });
  } catch (error) {
    next(error);
  }
}

export async function getBookingByIdController(req, res, next) {
  try {
    const booking = await bookingsRepo.getBookingById(req.user.id, req.clubId, req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    return res.status(200).json({ booking });
  } catch (error) {
    next(error);
  }
}
