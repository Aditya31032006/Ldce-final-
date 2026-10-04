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
         ms.status AS membership_status, ms.start_date AS membership_start_date, ms.end_date AS membership_end_date
  FROM app.members m
  LEFT JOIN LATERAL (
    SELECT ms.plan_id, ms.status, ms.start_date, ms.end_date
    FROM app.memberships ms
    WHERE ms.member_id = m.id AND ms.club_id = m.club_id
    ORDER BY ms.created_at DESC
    LIMIT 1
  ) ms ON true
  LEFT JOIN app.plans p ON p.id = ms.plan_id
  WHERE m.club_id = $1
    AND ($2::text IS NULL OR m.status::text = $2)
    AND (
      $3::text IS NULL OR $3::text = '' OR
      m.first_name ILIKE '%' || $3 || '%' OR
      m.last_name ILIKE '%' || $3 || '%' OR
      (m.first_name || ' ' || COALESCE(m.last_name, '')) ILIKE '%' || $3 || '%' OR
      m.email ILIKE '%' || $3 || '%' OR
      m.phone ILIKE '%' || $3 || '%' OR
      m.member_code ILIKE '%' || $3 || '%' OR
      p.name ILIKE '%' || $3 || '%' OR
      similarity(m.first_name || ' ' || COALESCE(m.last_name, ''), $3) > 0.15 OR
      similarity(COALESCE(m.email, ''), $3) > 0.15 OR
      similarity(COALESCE(m.member_code, ''), $3) > 0.15
    )
  ORDER BY 
    CASE WHEN $3::text IS NOT NULL AND $3::text != '' 
      THEN similarity(m.first_name || ' ' || COALESCE(m.last_name, ''), $3)
      ELSE 0
    END DESC,
    m.created_at DESC
  LIMIT 100;
`;

export const GET_MEMBER_BY_ID = `
  SELECT m.*,
         p.name AS plan_name, p.color AS plan_color,
         ms.status AS membership_status, ms.start_date AS membership_start_date, ms.end_date AS membership_end_date
  FROM app.members m
  LEFT JOIN LATERAL (
    SELECT ms.plan_id, ms.status, ms.start_date, ms.end_date
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
