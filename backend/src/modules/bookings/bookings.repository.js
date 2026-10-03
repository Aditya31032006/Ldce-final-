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

export async function getBookings(userId, clubId, status = null) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_BOOKINGS, [clubId, status]);
    return res.rows || [];
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
