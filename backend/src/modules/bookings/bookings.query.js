export const LOCK_COURT = `
  SELECT id FROM app.courts WHERE id = $1 AND club_id = $2 AND is_active = true;
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
    club_id, reservation_id, member_id, guest_name, guest_phone, channel, status, created_by,
    base_price, discount_amount, tax_amount, total_amount, plan_id
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8,
    COALESCE($9, 0), COALESCE($10, 0), COALESCE($11, 0), COALESCE($12, 0), $13
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
    AND ($2::text IS NULL OR b.status::text = $2::text)
    AND ($3::uuid IS NULL OR m.user_id = $3 OR b.created_by = $3)
  ORDER BY r.start_at DESC
  LIMIT 100;
`;

export const GET_COURT_AVAILABILITY = `
  SELECT r.id, r.court_id, r.start_at, r.end_at, r.status, b.status AS booking_status
  FROM app.court_reservations r
  LEFT JOIN app.bookings b ON b.reservation_id = r.id
  WHERE r.court_id = $1
    AND r.status = 'active'
    AND (b.status IS NULL OR b.status::text NOT IN ('cancelled', 'void'))
    AND (
      r.start_at::date = $2::date
      OR (r.start_at AT TIME ZONE 'Asia/Kolkata')::date = $2::date
      OR (r.end_at AT TIME ZONE 'Asia/Kolkata')::date = $2::date
      OR (r.start_at AT TIME ZONE 'UTC')::date = $2::date
    )
  ORDER BY r.start_at ASC;
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
    AND (b.status IS NULL OR b.status::text NOT IN ('cancelled', 'void'))
    AND r.status = 'active'
    AND (
      $2::timestamptz IS NULL OR r.end_at >= $2::timestamptz
    )
    AND (
      $3::timestamptz IS NULL OR r.start_at <= $3::timestamptz
    )
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
  SET status = 'released'
  WHERE id = (SELECT reservation_id FROM app.bookings WHERE id = $1);
`;
