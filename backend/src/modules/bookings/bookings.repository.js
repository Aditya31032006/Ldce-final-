import * as queries from './bookings.query.js';
import { withTenantTransaction } from '../../shared/utils/transaction.util.js';

export async function createBooking(userId, clubId, bookingData) {
  return withTenantTransaction(userId, clubId, async (client) => {
    // 1. Lock the court to prevent concurrent bookings on the same court
    const courtRes = await client.query(queries.LOCK_COURT, [bookingData.court_id, clubId]);
    if (courtRes.rows.length === 0) {
      const err = new Error("Court not found");
      err.status = 404;
      throw err;
    }

    // 2. Check for overlapping reservations
    const overlapRes = await client.query(queries.CHECK_OVERLAPPING_RESERVATION, [
      bookingData.court_id,
      bookingData.start_at,
      bookingData.end_at
    ]);

    if (overlapRes.rows.length > 0) {
      const err = new Error("Court is already booked for this time slot");
      err.status = 409;
      throw err;
    }

    // 3. Create Reservation
    const resvResult = await client.query(queries.INSERT_RESERVATION, [
      clubId,
      bookingData.court_id,
      bookingData.start_at,
      bookingData.end_at
    ]);
    const reservationId = resvResult.rows[0].id;

    // 4. Create Booking
    const bookingResult = await client.query(queries.INSERT_BOOKING, [
      clubId,
      reservationId,
      bookingData.member_id || null,
      bookingData.guest_name || null,
      bookingData.guest_phone || null,
      bookingData.channel || 'online',
      bookingData.status || 'confirmed',
      userId
    ]);

    return bookingResult.rows[0];
  });
}

export async function getBookings(userId, clubId, status = null, userIdFilter = null) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_BOOKINGS, [clubId, status, userIdFilter]);
    return res.rows || [];
  });
}

export async function getCourtAvailability(userId, clubId, courtId, date) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_COURT_AVAILABILITY, [courtId, date]);
    const reservations = res.rows || [];

    // All standard 30-minute candidate start slots from 06:00 to 22:00
    const candidateSlots = [];
    for (let h = 6; h <= 22; h++) {
      candidateSlots.push(`${String(h).padStart(2, '0')}:00`);
      if (h < 22) {
        candidateSlots.push(`${String(h).padStart(2, '0')}:30`);
      }
    }

    const bookedSlots = [];

    candidateSlots.forEach((slotTime) => {
      // Slot represents a 1-hour session [slotStart, slotEnd)
      const slotStartIstMs = new Date(`${date}T${slotTime}:00+05:30`).getTime();
      const slotEndIstMs = slotStartIstMs + 60 * 60 * 1000;

      const slotStartUtcMs = new Date(`${date}T${slotTime}:00Z`).getTime();
      const slotEndUtcMs = slotStartUtcMs + 60 * 60 * 1000;

      const hasConflict = reservations.some((r) => {
        const rStartMs = new Date(r.start_at).getTime();
        const rEndMs = new Date(r.end_at).getTime();

        // 1-hour session overlap test: start1 < end2 AND end1 > start2
        const overlapIst = slotStartIstMs < rEndMs && slotEndIstMs > rStartMs;
        const overlapUtc = slotStartUtcMs < rEndMs && slotEndUtcMs > rStartMs;

        return overlapIst || overlapUtc;
      });

      if (hasConflict && !bookedSlots.includes(slotTime)) {
        bookedSlots.push(slotTime);
      }
    });

    return {
      courtId,
      date,
      bookedSlots,
      reservations: reservations.map(r => ({
        id: r.id,
        court_id: r.court_id,
        start_at: r.start_at,
        end_at: r.end_at,
        status: r.status,
      })),
    };
  });
}

export async function getCalendarBookings(userId, clubId, startAt = null, endAt = null) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_CALENDAR_BOOKINGS, [clubId, startAt, endAt]);
    return res.rows || [];
  });
}

export async function getBookingById(userId, clubId, bookingId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_BOOKING_BY_ID, [bookingId, clubId]);
    return res.rows[0] || null;
  });
}

export async function cancelBooking(userId, clubId, bookingId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    await client.query(queries.CANCEL_RESERVATION, [bookingId]);
    const res = await client.query(queries.CANCEL_BOOKING, [bookingId, clubId]);
    return res.rows[0] || null;
  });
}
