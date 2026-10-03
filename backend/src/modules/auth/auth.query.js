export const FIND_USER_BY_EMAIL = `
  SELECT u.*, uc.password_hash 
  FROM users u
  LEFT JOIN user_credentials uc ON u.id = uc.user_id
  WHERE u.email = $1;
`;

export const FIND_USER_BY_ID = `
  SELECT id, email, phone, full_name, avatar_url, is_active, email_verified_at, last_login_at, created_at, updated_at
  FROM users
  WHERE id = $1;
`;

export const INSERT_USER = `
  INSERT INTO users (email, full_name, phone, is_active)
  VALUES ($1, $2, $3, true)
  RETURNING *;
`;

export const INSERT_USER_CREDENTIALS = `
  INSERT INTO user_credentials (user_id, password_hash)
  VALUES ($1, $2);
`;

export const FIND_USER_CLUBS = `
  SELECT club_id, slug, name, role
  FROM app.user_clubs($1);
`;
