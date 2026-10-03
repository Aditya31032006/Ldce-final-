export const LOCK_COURT = `
  SELECT id FROM app.courts WHERE id = $1 AND club_id = $2 FOR UPDATE;
`;

export const CHECK_OVERLAPPING_RESERVATION = `
  SELECT id FROM app.court_reservations
  WHERE court_id = $1 AND status = 'active'
    AND tstzrange(start_at, end_at, '[)') && tstzrange($2::timestamptz, $3::timestamptz, '[)')
  LIMIT 1;
`;

export const INSERT_RESERVATION = `
  INSERT INTO app.court_reservations (club_id, court_id, start_at, end_at, kind, status)
  VALUES ($1, $2, $3, $4, 'booking', 'active')
  RETURNING id;
`;

export const INSERT_BOOKING = `
  INSERT INTO app.bookings (
    club_id, reservation_id, member_id, guest_name, guest_phone, channel, status, created_by
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
  ) RETURNING *;
`;

export const GET_BOOKING_BY_ID = `
  SELECT b.*, r.court_id, r.start_at, r.end_at
  FROM app.bookings b
  JOIN app.court_reservations r ON b.reservation_id = r.id
  WHERE b.id = $1 AND b.club_id = $2;
`;
