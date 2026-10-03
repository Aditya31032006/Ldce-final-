export const GET_COURTS = `
  SELECT id, sport_id, name, surface, description, image_url, is_indoor, has_lighting, max_players, sort_order, is_active
  FROM app.courts
  WHERE club_id = $1 AND ($2::boolean IS NULL OR is_active = $2)
  ORDER BY sort_order ASC;
`;

export const INSERT_COURT = `
  INSERT INTO app.courts (club_id, sport_id, name, surface, description, image_url, is_indoor, has_lighting, max_players, sort_order, is_active)
  VALUES ($1, $2, $3, $4, $5, $6, coalesce($7, false), coalesce($8, false), coalesce($9, 4), coalesce($10, 0), coalesce($11, true))
  RETURNING *;
`;

export const GET_COURT_AVAILABILITY = `
  SELECT * FROM app.court_availability($1, $2, $3);
`;
