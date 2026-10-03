export const CREATE_MEMBER = `
  INSERT INTO app.members (
    club_id, user_id, first_name, last_name, phone, email, dob, gender, photo_url,
    address_line, city, postal_code, emergency_contact_name, emergency_contact_phone,
    emergency_contact_relation, status, created_by
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
  ) RETURNING *;
`;

export const GET_MEMBER_BY_ID = `
  SELECT * FROM app.members
  WHERE id = $1 AND club_id = $2;
`;

export const SEARCH_MEMBERS = `
  SELECT * FROM app.search_members($1, $2);
`;
