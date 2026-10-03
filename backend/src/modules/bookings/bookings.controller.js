import * as bookingsRepo from './bookings.repository.js';
import { pool } from '../../config/database.js';

export async function createBookingController(req, res, next) {
  try {
    const { court_id, start_at, end_at, member_id, guest_name } = req.body;

    if (!court_id || !start_at || !end_at) {
      return res.status(400).json({ message: "court_id, start_at, and end_at are required" });
    }

    if (req.user.role === 'member' || !member_id) {
      if (!req.body.member_id) {
        if (req.user.memberId) {
          req.body.member_id = req.user.memberId;
        } else {
          const memRes = await pool.query('SELECT id FROM app.members WHERE user_id = $1 AND club_id = $2', [req.user.id, req.clubId]);
          if (memRes.rows.length > 0) {
            req.body.member_id = memRes.rows[0].id;
          }
        }
      }
      req.body.channel = 'online';
      req.body.status = 'pending';
      // The DB triggers trg_a_booking_member_pricing and trg_b_booking_rules will handle pricing and limits.
    } else {
      req.body.channel = req.body.channel || 'counter';
    }

    if (!req.body.member_id && !guest_name) {
      return res.status(400).json({ message: "Either member_id or guest_name is required" });
    }

    const booking = await bookingsRepo.createBooking(req.user.id, req.clubId, req.body);
    return res.status(201).json({ message: "Booking created", booking });
  } catch (error) {
    next(error);
  }
}

export async function getBookingsController(req, res, next) {
  try {
    const { status } = req.query;
    const bookings = await bookingsRepo.getBookings(req.user.id, req.clubId, status || null);
    return res.status(200).json({ bookings });
  } catch (error) {
    next(error);
  }
}

export async function getCalendarBookingsController(req, res, next) {
  try {
    const { start, end } = req.query;
    const bookings = await bookingsRepo.getCalendarBookings(req.user.id, req.clubId, start || null, end || null);
    return res.status(200).json({ bookings });
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

export async function cancelBookingController(req, res, next) {
  try {
    const booking = await bookingsRepo.cancelBooking(req.user.id, req.clubId, req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    return res.status(200).json({ message: "Booking cancelled successfully", booking });
  } catch (error) {
    next(error);
  }
}
