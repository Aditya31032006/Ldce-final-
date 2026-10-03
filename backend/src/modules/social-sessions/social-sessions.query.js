export const GET_SOCIAL_SESSIONS = `
  SELECT id, reservation_id, template_id, title, description, max_players, fee_per_player, member_fee_per_player, status
  FROM app.social_sessions
  WHERE club_id = $1 AND ($2::text IS NULL OR status = $2)
  ORDER BY created_at DESC;
`;

export const INSERT_SOCIAL_SESSION_PLAYER = `
  INSERT INTO app.social_session_players (
    club_id, session_id, member_id, guest_name, guest_phone, status, fee_charged
  ) VALUES (
    $1, $2, $3, $4, $5, 'joined', coalesce($6, 0)
  ) RETURNING *;
`;
