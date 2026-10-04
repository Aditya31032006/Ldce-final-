export const GET_COURTS = `
  SELECT c.id, c.sport_id, s.name AS sport_name, s.icon AS sport_icon,
         c.name, c.surface, c.description, c.image_url,
         c.is_indoor, c.has_lighting, c.max_players, c.sort_order, c.is_active,
         c.created_at, c.updated_at,
         COALESCE(
           (SELECT price FROM app.court_rates cr
            WHERE cr.club_id = c.club_id AND cr.court_id = c.id AND cr.is_active
            ORDER BY cr.priority DESC, cr.created_at DESC LIMIT 1),
           (SELECT price FROM app.court_rates cr
            WHERE cr.club_id = c.club_id AND cr.sport_id = c.sport_id AND cr.court_id IS NULL AND cr.is_active
            ORDER BY cr.priority DESC, cr.created_at DESC LIMIT 1),
           (SELECT price FROM app.court_rates cr
            WHERE cr.club_id = c.club_id AND cr.sport_id IS NULL AND cr.court_id IS NULL AND cr.is_active
            ORDER BY cr.priority DESC, cr.created_at DESC LIMIT 1),
           400
         ) AS hourly_rate
  FROM app.courts c
  LEFT JOIN app.sports s ON s.id = c.sport_id AND s.club_id = c.club_id
  WHERE c.club_id = $1 AND ($2::boolean IS NULL OR c.is_active = $2)
  ORDER BY c.sort_order ASC, c.name ASC;
`;

export const GET_COURT_BY_ID = `
  SELECT c.*, s.name AS sport_name, s.icon AS sport_icon,
         COALESCE(
           (SELECT price FROM app.court_rates cr
            WHERE cr.club_id = c.club_id AND cr.court_id = c.id AND cr.is_active
            ORDER BY cr.priority DESC, cr.created_at DESC LIMIT 1),
           (SELECT price FROM app.court_rates cr
            WHERE cr.club_id = c.club_id AND cr.sport_id = c.sport_id AND cr.court_id IS NULL AND cr.is_active
            ORDER BY cr.priority DESC, cr.created_at DESC LIMIT 1),
           (SELECT price FROM app.court_rates cr
            WHERE cr.club_id = c.club_id AND cr.sport_id IS NULL AND cr.court_id IS NULL AND cr.is_active
            ORDER BY cr.priority DESC, cr.created_at DESC LIMIT 1),
           400
         ) AS hourly_rate
  FROM app.courts c
  LEFT JOIN app.sports s ON s.id = c.sport_id AND s.club_id = c.club_id
  WHERE c.club_id = $1 AND c.id = $2;
`;

export const INSERT_COURT = `
  INSERT INTO app.courts (club_id, sport_id, name, surface, description, image_url, is_indoor, has_lighting, max_players, sort_order, is_active)
  VALUES ($1, $2, $3, $4, $5, $6, coalesce($7, false), coalesce($8, false), coalesce($9, 4), coalesce($10, 0), coalesce($11, true))
  RETURNING *;
`;

export const UPDATE_COURT = `
  UPDATE app.courts
  SET sport_id     = COALESCE($3, sport_id),
      name         = COALESCE($4, name),
      surface      = COALESCE($5, surface),
      description  = COALESCE($6, description),
      image_url    = COALESCE($7, image_url),
      is_indoor    = COALESCE($8, is_indoor),
      has_lighting = COALESCE($9, has_lighting),
      max_players  = COALESCE($10, max_players),
      sort_order   = COALESCE($11, sort_order),
      is_active    = COALESCE($12, is_active),
      updated_at   = now()
  WHERE club_id = $1 AND id = $2
  RETURNING *;
`;

export const DELETE_COURT = `
  UPDATE app.courts
  SET is_active = false, updated_at = now()
  WHERE club_id = $1 AND id = $2
  RETURNING *;
`;

export const GET_COURT_AVAILABILITY = `
  SELECT * FROM app.court_availability($1, $2, $3);
`;

export const GET_OPERATING_HOURS = `
  SELECT id, court_id, weekday, opens_at, closes_at, is_closed
  FROM app.court_operating_hours
  WHERE club_id = $1 AND court_id = $2
  ORDER BY weekday ASC;
`;

export const UPSERT_OPERATING_HOUR = `
  INSERT INTO app.court_operating_hours (club_id, court_id, weekday, opens_at, closes_at, is_closed)
  VALUES ($1, $2, $3, $4, $5, $6)
  ON CONFLICT (court_id, weekday)
  DO UPDATE SET opens_at = EXCLUDED.opens_at,
                closes_at = EXCLUDED.closes_at,
                is_closed = EXCLUDED.is_closed,
                updated_at = now()
  RETURNING *;
`;
