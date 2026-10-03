import * as bookingsRepo from './bookings.repository.js';
import { pool } from '../../config/database.js';
import { addBookingConfirmationEmailJob } from '../../../jobs/emailQueue.js';
import { createRazorpayOrder } from '../../services/razorpay.service.js';

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

    // Asynchronously dispatch booking confirmation email via BullMQ
    (async () => {
      try {
        let recipientEmail = req.user.email;
        let recipientName = req.user.full_name || req.body.guest_name || 'Valued Member';

        if (!recipientEmail && req.body.member_id) {
          const memRes = await pool.query('SELECT email, first_name, last_name FROM app.members WHERE id = $1', [req.body.member_id]);
          if (memRes.rows.length) {
            recipientEmail = memRes.rows[0].email;
            recipientName = `${memRes.rows[0].first_name || ''} ${memRes.rows[0].last_name || ''}`.trim() || recipientName;
          }
        }

        if (recipientEmail) {
          const courtRes = await pool.query('SELECT name FROM app.courts WHERE id = $1', [court_id]);
          const courtName = courtRes.rows[0]?.name || 'Court';
          await addBookingConfirmationEmailJob({
            toEmail: recipientEmail,
            memberName: recipientName,
            courtName,
            startTime: start_at,
            endTime: end_at,
            bookingRef: booking.id ? String(booking.id).slice(0, 8).toUpperCase() : 'CONFIRMED',
          });
        }
      } catch (emailErr) {
        console.warn('Booking confirmation email enqueue notice:', emailErr.message);
      }
    })();

    // Record payment if paid via Razorpay gateway
    if (req.body.razorpay_payment_id || req.body.paymentDetails) {
      const payAmt = Number(req.body.amount || booking.total_amount || 0);
      if (payAmt > 0) {
        try {
          await pool.query(`
            INSERT INTO app.payments (
              club_id, kind, method, status, amount, member_id, booking_id, reference, received_by, notes
            ) VALUES (
              $1, 'payment', 'online', 'completed', $2, $3, $4, $5, $6, $7
            )
          `, [
            req.clubId,
            payAmt,
            booking.member_id || null,
            booking.id,
            req.body.razorpay_payment_id || req.body.paymentDetails?.reference || 'Razorpay Online',
            req.user.id,
            `Court booking online settlement #${booking.id}`,
          ]);

          await pool.query("UPDATE app.bookings SET status = 'confirmed', updated_at = now() WHERE id = $1", [booking.id]);
          booking.status = 'confirmed';
        } catch (payErr) {
          console.warn('Could not record court booking payment in ledger:', payErr.message);
        }
      }
    }

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

export async function createBookingRazorpayOrderController(req, res, next) {
  try {
    const { amount, court_id, date, time } = req.body;
    const targetAmount = Number(amount);

    if (!targetAmount || targetAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }

    const rzpOrder = await createRazorpayOrder({
      amount: targetAmount,
      receipt: `bkg_${court_id ? String(court_id).substring(0, 6) : Date.now()}`,
      notes: {
        clubId: req.clubId,
        courtId: court_id || '',
        userId: req.user.id,
        slot: `${date || ''} ${time || ''}`,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        orderId: rzpOrder.orderId,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        key: process.env.RAZORPAY_KEY_ID || 'rzp_test_SQOga2rRgYRMaJ',
      },
    });
  } catch (error) {
    next(error);
  }
}
