export const GET_COURT_RATES = `
  SELECT cr.*,
         s.name  AS sport_name,
         c.name  AS court_name,
         p.name  AS plan_name, p.color AS plan_color
  FROM app.court_rates cr
  LEFT JOIN app.sports  s ON s.id = cr.sport_id AND s.club_id = cr.club_id
  LEFT JOIN app.courts  c ON c.id = cr.court_id AND c.club_id = cr.club_id
  LEFT JOIN app.plans   p ON p.id = cr.plan_id  AND p.club_id = cr.club_id
  WHERE cr.club_id = $1
    AND ($2::boolean IS NULL OR cr.is_active = $2)
  ORDER BY cr.priority DESC, cr.created_at ASC;
`;

export const INSERT_COURT_RATE = `
  INSERT INTO app.court_rates
    (club_id, sport_id, court_id, plan_id, weekday, time_from, time_to, valid_from, valid_to, price, priority, is_active)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11, 0), COALESCE($12, true))
  RETURNING *;
`;

export const UPDATE_COURT_RATE = `
  UPDATE app.court_rates
  SET sport_id   = COALESCE($3, sport_id),
      court_id   = COALESCE($4, court_id),
      plan_id    = COALESCE($5, plan_id),
      weekday    = COALESCE($6, weekday),
      time_from  = COALESCE($7, time_from),
      time_to    = COALESCE($8, time_to),
      valid_from = COALESCE($9, valid_from),
      valid_to   = COALESCE($10, valid_to),
      price      = COALESCE($11, price),
      priority   = COALESCE($12, priority),
      is_active  = COALESCE($13, is_active),
      updated_at = now()
  WHERE club_id = $1 AND id = $2
  RETURNING *;
`;

export const DELETE_COURT_RATE = `
  UPDATE app.court_rates
  SET is_active = false, updated_at = now()
  WHERE club_id = $1 AND id = $2
  RETURNING *;
`;
