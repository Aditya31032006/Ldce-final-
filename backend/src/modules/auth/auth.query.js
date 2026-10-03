/**
 * SQL Queries for Auth Module
 * Direct & OAuth Authentication for Sports Club Platform
 * Targets schema: app
 */

export const FIND_USER_BY_EMAIL = `
  SELECT 
    u.id, 
    u.email, 
    u.phone, 
    u.full_name, 
    u.avatar_url, 
    u.is_active, 
    u.email_verified_at, 
    u.last_login_at, 
    u.created_at, 
    u.updated_at,
    uc.password_hash
  FROM app.users u
  LEFT JOIN app.user_credentials uc ON u.id = uc.user_id
  WHERE u.email = $1;
`;

export const FIND_USER_BY_ID = `
  SELECT 
    u.id, 
    u.email, 
    u.phone, 
    u.full_name, 
    u.avatar_url, 
    u.is_active, 
    u.email_verified_at, 
    u.last_login_at, 
    u.created_at, 
    u.updated_at,
    (uc.password_hash IS NOT NULL) AS has_password
  FROM app.users u
  LEFT JOIN app.user_credentials uc ON u.id = uc.user_id
  WHERE u.id = $1;
`;

export const INSERT_USER = `
  INSERT INTO app.users (email, full_name, phone, avatar_url, is_active, email_verified_at)
  VALUES ($1, $2, $3, $4, true, $5)
  RETURNING id, email, phone, full_name, avatar_url, is_active, email_verified_at, last_login_at, created_at, updated_at;
`;

export const INSERT_USER_CREDENTIALS = `
  INSERT INTO app.user_credentials (user_id, password_hash)
  VALUES ($1, $2)
  ON CONFLICT (user_id) 
  DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = now()
  RETURNING user_id, updated_at;
`;

export const UPDATE_USER_PROFILE = `
  UPDATE app.users
  SET 
    full_name = COALESCE($2, full_name),
    phone = COALESCE($3, phone),
    avatar_url = COALESCE($4, avatar_url),
    updated_at = now()
  WHERE id = $1
  RETURNING id, email, phone, full_name, avatar_url, is_active, email_verified_at, last_login_at, created_at, updated_at;
`;

export const UPDATE_USER_LAST_LOGIN = `
  UPDATE app.users
  SET last_login_at = now()
  WHERE id = $1;
`;

export const UPDATE_GOOGLE_USER_SYNC = `
  UPDATE app.users
  SET 
    avatar_url = COALESCE(avatar_url, $2),
    email_verified_at = COALESCE(email_verified_at, now()),
    last_login_at = now(),
    updated_at = now()
  WHERE id = $1
  RETURNING id, email, phone, full_name, avatar_url, is_active, email_verified_at, last_login_at, created_at, updated_at;
`;

export const FIND_USER_CLUBS = `
  SELECT club_id, slug, name, role
  FROM app.user_clubs($1);
`;

export const CHECK_PLATFORM_ADMIN = `
  SELECT 1 FROM app.platform_admins WHERE user_id = $1;
`;
