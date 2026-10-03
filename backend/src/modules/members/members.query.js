export const CREATE_MEMBER = `
  INSERT INTO app.members (
    club_id, user_id, first_name, last_name, phone, email, dob, gender, photo_url,
    address_line, city, postal_code, emergency_contact_name, emergency_contact_phone,
    emergency_contact_relation, status, created_by
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
  ) RETURNING *;
`;

export const GET_MEMBERS = `
  SELECT m.*,
         p.name AS plan_name, p.color AS plan_color,
         ms.status AS membership_status, ms.ends_on AS membership_ends_on
  FROM app.members m
  LEFT JOIN LATERAL (
    SELECT ms.plan_id, ms.status, ms.ends_on
    FROM app.memberships ms
    WHERE ms.member_id = m.id AND ms.club_id = m.club_id
    ORDER BY ms.created_at DESC
    LIMIT 1
  ) ms ON true
  LEFT JOIN app.plans p ON p.id = ms.plan_id
  WHERE m.club_id = $1
    AND ($2::text IS NULL OR m.status::text = $2)
  ORDER BY m.created_at DESC
  LIMIT 100;
`;

export const GET_MEMBER_BY_ID = `
  SELECT m.*,
         p.name AS plan_name, p.color AS plan_color,
         ms.status AS membership_status, ms.ends_on AS membership_ends_on
  FROM app.members m
  LEFT JOIN LATERAL (
    SELECT ms.plan_id, ms.status, ms.ends_on
    FROM app.memberships ms
    WHERE ms.member_id = m.id AND ms.club_id = m.club_id
    ORDER BY ms.created_at DESC
    LIMIT 1
  ) ms ON true
  LEFT JOIN app.plans p ON p.id = ms.plan_id
  WHERE m.id = $1 AND m.club_id = $2;
`;

export const SEARCH_MEMBERS = `
  SELECT * FROM app.search_members($1, $2);
`;
