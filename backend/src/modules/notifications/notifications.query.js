export const GET_NOTIFICATIONS = `
  SELECT * FROM app.communications
  WHERE club_id = $1 AND member_id = $2
  ORDER BY sent_at DESC;
`;

export const INSERT_NOTIFICATION = `
  INSERT INTO app.communications (
    club_id, type, channel, status, member_id, subject, content
  ) VALUES (
    $1, $2, $3, 'pending', $4, $5, $6
  ) RETURNING *;
`;
