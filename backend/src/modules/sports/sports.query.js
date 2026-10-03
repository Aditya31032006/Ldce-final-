// Sports queries
const GET_SPORTS = `
  SELECT id, name, description, icon, sort_order, is_active, created_at
  FROM app.sports
  WHERE club_id = $1
    AND ($2::boolean IS NULL OR is_active = $2)
  ORDER BY sort_order ASC, name ASC
`;

const INSERT_SPORT = `
  INSERT INTO app.sports (club_id, name, description, icon, sort_order, is_active)
  VALUES ($1, $2, $3, $4, $5, $6)
  RETURNING *
`;

const UPDATE_SPORT = `
  UPDATE app.sports
  SET name = COALESCE($3, name),
      description = COALESCE($4, description),
      icon = COALESCE($5, icon),
      sort_order = COALESCE($6, sort_order),
      is_active = COALESCE($7, is_active),
      updated_at = now()
  WHERE club_id = $1 AND id = $2
  RETURNING *
`;

const DELETE_SPORT = `
  UPDATE app.sports
  SET is_active = false, updated_at = now()
  WHERE club_id = $1 AND id = $2
  RETURNING *
`;

export { GET_SPORTS, INSERT_SPORT, UPDATE_SPORT, DELETE_SPORT };
