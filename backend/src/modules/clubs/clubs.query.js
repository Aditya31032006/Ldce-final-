export const REGISTER_CLUB = `
  SELECT app.register_club($1, $2, $3, $4, $5, $6, $7) AS club_id;
`;

export const GET_CLUB_DETAILS = `
  SELECT id, slug, name, legal_name, tagline, description, email, phone, website_url, 
         address_line1, address_line2, city, state, postal_code, country, 
         latitude, longitude, timezone, currency, gstin, pan, logo_url, cover_url, brand_color, 
         status, is_public, owner_user_id, created_at, updated_at
  FROM app.clubs
  WHERE id = $1;
`;

export const UPDATE_CLUB_DETAILS = `
  UPDATE app.clubs
  SET 
    name = coalesce($2, name),
    legal_name = coalesce($3, legal_name),
    tagline = coalesce($4, tagline),
    description = coalesce($5, description),
    email = coalesce($6, email),
    phone = coalesce($7, phone),
    website_url = coalesce($8, website_url),
    address_line1 = coalesce($9, address_line1),
    address_line2 = coalesce($10, address_line2),
    city = coalesce($11, city),
    state = coalesce($12, state),
    postal_code = coalesce($13, postal_code),
    country = coalesce($14, country),
    timezone = coalesce($15, timezone),
    currency = coalesce($16, currency),
    gstin = coalesce($17, gstin),
    pan = coalesce($18, pan),
    logo_url = coalesce($19, logo_url),
    cover_url = coalesce($20, cover_url),
    brand_color = coalesce($21, brand_color),
    is_public = coalesce($22, is_public)
  WHERE id = $1
  RETURNING *;
`;

export const GET_CLUB_SETTINGS = `
  SELECT *
  FROM app.club_settings
  WHERE club_id = $1;
`;

export const UPDATE_CLUB_SETTINGS = `
  UPDATE app.club_settings
  SET
    slot_length_minutes = coalesce($2, slot_length_minutes),
    slot_interval_minutes = coalesce($3, slot_interval_minutes),
    max_bookings_per_member_per_day = coalesce($4, max_bookings_per_member_per_day),
    advance_booking_days = coalesce($5, advance_booking_days),
    min_notice_minutes = coalesce($6, min_notice_minutes),
    cancellation_cutoff_hours = coalesce($7, cancellation_cutoff_hours),
    cancel_refund_mode = coalesce($8, cancel_refund_mode),
    junior_max_age = coalesce($9, junior_max_age),
    require_guardian_for_junior = coalesce($10, require_guardian_for_junior),
    prices_include_tax = coalesce($11, prices_include_tax),
    member_code_prefix = coalesce($12, member_code_prefix)
  WHERE club_id = $1
  RETURNING *;
`;

export const GET_CLUB_GALLERY = `
  SELECT id, club_id, image_url, caption, sort_order, is_active, created_at
  FROM app.club_gallery
  WHERE club_id = $1 AND is_active = true
  ORDER BY sort_order ASC, created_at DESC;
`;

export const ADD_CLUB_GALLERY_IMAGE = `
  INSERT INTO app.club_gallery (club_id, image_url, caption, sort_order, is_active)
  VALUES ($1, $2, $3, COALESCE($4, 0), true)
  RETURNING id, club_id, image_url, caption, sort_order, is_active, created_at;
`;

export const DELETE_CLUB_GALLERY_IMAGE = `
  DELETE FROM app.club_gallery
  WHERE club_id = $1 AND id = $2
  RETURNING id, club_id;
`;

