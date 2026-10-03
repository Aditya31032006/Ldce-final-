export const INSERT_LEAD = `
  INSERT INTO app.leads (
    club_id, full_name, phone, email, source, status, interested_sport_id, interested_plan_id, message, preferred_trial_at
  ) VALUES (
    $1, $2, $3, $4, coalesce($5, 'website'), 'new', $6, $7, $8, $9
  ) RETURNING *;
`;

export const GET_LEADS = `
  SELECT * FROM app.leads
  WHERE club_id = $1
  ORDER BY created_at DESC;
`;

export const UPDATE_LEAD_STATUS = `
  UPDATE app.leads
  SET status = $2,
      assigned_to = coalesce($3, assigned_to),
      next_follow_up_at = coalesce($4, next_follow_up_at),
      lost_reason = coalesce($5, lost_reason)
  WHERE id = $1 AND club_id = $6
  RETURNING *;
`;

export const GET_QUOTES = 'SELECT * FROM app.quotes WHERE club_id = $1;';