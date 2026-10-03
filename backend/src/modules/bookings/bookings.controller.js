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
      // If payment has already been made or confirmed/paid status provided, keep confirmed
      if (req.body.razorpay_payment_id || req.body.status === 'confirmed' || req.body.status === 'paid') {
        req.body.status = 'confirmed';
      } else {
        req.body.status = 'pending';
      }
    } else {
      req.body.channel = req.body.channel || 'counter';
      // Sanitize status — 'paid' is not a valid enum value; map to 'confirmed'
      const rawStatus = req.body.status || 'confirmed';
      req.body.status = rawStatus === 'paid' ? 'confirmed' : rawStatus;
    }

    if (!req.body.member_id && !req.body.guest_name && !guest_name) {
      req.body.guest_name = req.user?.full_name || req.user?.name || req.user?.email || 'Valued Member';
    }

    // Resolve price dynamically using rate rules if not provided
    let calculatedPrice = Number(req.body.amount || req.body.total_amount || 0);
    let planIdForPricing = null;
    try {
      if (req.body.member_id) {
        const memRes = await pool.query(
          "SELECT plan_id FROM app.memberships WHERE member_id = $1 AND club_id = $2 AND status = 'active' ORDER BY end_date DESC LIMIT 1",
          [req.body.member_id, req.clubId]
        );
        planIdForPricing = memRes.rows[0]?.plan_id || null;
      } else if (req.user?.id) {
        const memRes = await pool.query(`
          SELECT ms.plan_id
          FROM app.members m
          JOIN app.memberships ms ON ms.member_id = m.id AND ms.club_id = m.club_id AND ms.status = 'active'
          WHERE m.user_id = $1 AND m.club_id = $2
          ORDER BY ms.end_date DESC LIMIT 1
        `, [req.user.id, req.clubId]);
        planIdForPricing = memRes.rows[0]?.plan_id || null;
      }
    } catch {
      planIdForPricing = null;
    }

    if (!calculatedPrice && court_id && start_at) {
      try {
        const priceRes = await pool.query(
          'SELECT app.resolve_court_price($1::uuid, $2::uuid, $3::timestamptz) AS price',
          [court_id, planIdForPricing, start_at]
        );
        calculatedPrice = Number(priceRes.rows[0]?.price || 0);
      } catch {
        const courtRes = await pool.query('SELECT hourly_rate FROM app.courts WHERE id = $1', [court_id]);
        calculatedPrice = Number(courtRes.rows[0]?.hourly_rate || 400);
      }
    }

    req.body.base_price = calculatedPrice;
    req.body.discount_amount = 0;
    req.body.tax_amount = 0;
    req.body.total_amount = calculatedPrice;
    req.body.plan_id = planIdForPricing;

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

          await pool.query("UPDATE app.bookings SET status = 'confirmed', total_amount = coalesce(nullif($2, 0), total_amount), base_price = coalesce(nullif($2, 0), base_price), updated_at = now() WHERE id = $1", [booking.id, payAmt]);
          booking.status = 'confirmed';
          if (payAmt > 0) booking.total_amount = payAmt;
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
    const { status, user_only } = req.query;
    // If user_only requested or user is a member without admin role, filter to their bookings
    const isStaff = ['owner', 'manager', 'admin', 'front_desk'].includes(req.user?.role);
    const userIdFilter = (user_only === 'true' || !isStaff) ? req.user?.id : null;
    const bookings = await bookingsRepo.getBookings(req.user.id, req.clubId, status || null, userIdFilter);
    return res.status(200).json({ bookings, count: bookings.length });
  } catch (error) {
    next(error);
  }
}

export async function getCourtAvailabilityController(req, res, next) {
  try {
    const courtId = req.params.courtId || req.query.court_id;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    if (!courtId) {
      return res.status(400).json({ success: false, message: 'courtId is required' });
    }
    const availability = await bookingsRepo.getCourtAvailability(req.user?.id, req.clubId, courtId, date);
    return res.status(200).json({ success: true, data: availability });
  } catch (error) {
    next(error);
  }
}

export async function getCalendarBookingsController(req, res, next) {
  try {
    let { start, end } = req.query;
    if (typeof start === 'string' && start.includes(' ')) start = start.replace(' ', '+');
    if (typeof end === 'string' && end.includes(' ')) end = end.replace(' ', '+');
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

export async function resolveCourtPriceController(req, res, next) {
  try {
    const { court_id, plan_id, start_at } = req.query;
    if (!court_id) {
      return res.status(400).json({ success: false, message: 'court_id is required' });
    }

    let planId = plan_id || null;
    if (!planId && req.user) {
      try {
        const memRes = await pool.query(`
          SELECT ms.plan_id
          FROM app.members m
          JOIN app.memberships ms ON ms.member_id = m.id AND ms.club_id = m.club_id AND ms.status = 'active'
          WHERE m.user_id = $1 AND m.club_id = $2
          ORDER BY ms.end_date DESC LIMIT 1
        `, [req.user.id, req.clubId]);
        if (memRes.rows.length > 0 && memRes.rows[0].plan_id) {
          planId = memRes.rows[0].plan_id;
        }
      } catch {
        planId = null;
      }
    }

    const timestamp = start_at ? new Date(start_at).toISOString() : new Date().toISOString();
    let price = 0;
    let basePrice = 0;

    try {
      const result = await pool.query(
        'SELECT app.resolve_court_price($1::uuid, $2::uuid, $3::timestamptz) AS price',
        [court_id, planId, timestamp]
      );
      price = Number(result.rows[0]?.price || 0);

      const baseResult = await pool.query(
        'SELECT app.resolve_court_price($1::uuid, NULL, $2::timestamptz) AS base_price',
        [court_id, timestamp]
      );
      basePrice = Number(baseResult.rows[0]?.base_price || price);
    } catch (sqlErr) {
      const courtRes = await pool.query('SELECT hourly_rate FROM app.courts WHERE id = $1', [court_id]);
      basePrice = Number(courtRes.rows[0]?.hourly_rate || 400);
      price = basePrice;
    }

    return res.status(200).json({
      success: true,
      price,
      base_price: basePrice,
      plan_id: planId,
    });
  } catch (error) {
    next(error);
  }
}

