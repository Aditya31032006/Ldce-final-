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

export const GET_BOOKINGS = `
  SELECT b.*,
         r.court_id, r.start_at, r.end_at, r.status AS reservation_status,
         c.name AS court_name,
         s.name AS sport_name,
         u.full_name AS member_name,
         u.email AS member_email
  FROM app.bookings b
  JOIN app.court_reservations r ON b.reservation_id = r.id
  JOIN app.courts c ON r.court_id = c.id
  LEFT JOIN app.sports s ON c.sport_id = s.id
  LEFT JOIN app.members m ON b.member_id = m.id
  LEFT JOIN app.users u ON m.user_id = u.id
  WHERE b.club_id = $1
    AND ($2::text IS NULL OR b.status = $2)
  ORDER BY r.start_at DESC
  LIMIT 100;
`;

export const GET_CALENDAR_BOOKINGS = `
  SELECT b.id, b.status, b.guest_name,
         r.court_id, r.start_at, r.end_at,
         c.name AS court_name,
         s.name AS sport_name,
         u.full_name AS member_name
  FROM app.bookings b
  JOIN app.court_reservations r ON b.reservation_id = r.id
  JOIN app.courts c ON r.court_id = c.id
  LEFT JOIN app.sports s ON c.sport_id = s.id
  LEFT JOIN app.members m ON b.member_id = m.id
  LEFT JOIN app.users u ON m.user_id = u.id
  WHERE b.club_id = $1
    AND r.start_at >= COALESCE($2::timestamptz, date_trunc('month', now()))
    AND r.end_at <= COALESCE($3::timestamptz, date_trunc('month', now()) + interval '1 month')
  ORDER BY r.start_at ASC;
`;

export const GET_BOOKING_BY_ID = `
  SELECT b.*, r.court_id, r.start_at, r.end_at,
         c.name AS court_name, s.name AS sport_name
  FROM app.bookings b
  JOIN app.court_reservations r ON b.reservation_id = r.id
  JOIN app.courts c ON r.court_id = c.id
  LEFT JOIN app.sports s ON c.sport_id = s.id
  WHERE b.id = $1 AND b.club_id = $2;
`;

export const CANCEL_BOOKING = `
  UPDATE app.bookings
  SET status = 'cancelled', updated_at = now()
  WHERE id = $1 AND club_id = $2
  RETURNING *;
`;

export const CANCEL_RESERVATION = `
  UPDATE app.court_reservations
  SET status = 'cancelled'
  WHERE id = (SELECT reservation_id FROM app.bookings WHERE id = $1);
`;
