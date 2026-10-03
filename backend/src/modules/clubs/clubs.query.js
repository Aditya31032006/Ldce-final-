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

export const GET_MY_CLUBS = `
  SELECT DISTINCT c.id, c.slug, c.name, c.tagline, c.description, c.city, c.state, 
         c.logo_url, c.cover_url, c.brand_color, c.status,
         m.member_code, m.status AS member_status, m.joined_on,
         coalesce(cs.role::text, CASE WHEN c.owner_user_id = $1 THEN 'owner' ELSE 'member' END) AS user_role,
         (SELECT count(*)::int FROM app.courts ct WHERE ct.club_id = c.id AND ct.is_active) AS total_courts
  FROM app.clubs c
  LEFT JOIN app.members m ON m.club_id = c.id AND m.user_id = $1
  LEFT JOIN app.club_staff cs ON cs.club_id = c.id AND cs.user_id = $1
  WHERE (m.user_id = $1 OR cs.user_id = $1 OR c.owner_user_id = $1)
    AND c.status = 'active'
  ORDER BY c.name ASC;
`;

export const GET_PUBLIC_CLUBS = `
  SELECT c.id, c.slug, c.name, c.tagline, c.description, c.city, c.state, 
         c.logo_url, c.cover_url, c.brand_color, c.created_at,
         coalesce(c.currency, 'INR') AS currency,
         (SELECT coalesce(json_agg(json_build_object('name', s.name, 'icon', s.icon)), '[]'::json) 
          FROM app.sports s WHERE s.club_id = c.id AND s.is_active) AS sports,
         (SELECT count(*)::int FROM app.courts ct WHERE ct.club_id = c.id AND ct.is_active) AS total_courts
  FROM app.clubs c
  WHERE c.status = 'active' AND c.is_public
    AND (
      $1 = '' OR 
      c.name ILIKE '%' || $1 || '%' OR 
      c.city ILIKE '%' || $1 || '%' OR 
      c.tagline ILIKE '%' || $1 || '%' OR
      similarity(c.name, $1) > 0.12 OR
      similarity(coalesce(c.city, ''), $1) > 0.12 OR
      EXISTS (SELECT 1 FROM app.sports sp WHERE sp.club_id = c.id AND sp.is_active AND sp.name ILIKE '%' || $1 || '%')
    )
  ORDER BY 
    CASE WHEN $1 <> '' THEN similarity(c.name, $1) ELSE 0 END DESC,
    c.created_at DESC
  LIMIT $2 OFFSET $3;
`;

export const COUNT_PUBLIC_CLUBS = `
  SELECT count(*)::int AS total
  FROM app.clubs c
  WHERE c.status = 'active' AND c.is_public
    AND (
      $1 = '' OR 
      c.name ILIKE '%' || $1 || '%' OR 
      c.city ILIKE '%' || $1 || '%' OR 
      c.tagline ILIKE '%' || $1 || '%' OR
      similarity(c.name, $1) > 0.12 OR
      similarity(coalesce(c.city, ''), $1) > 0.12 OR
      EXISTS (SELECT 1 FROM app.sports sp WHERE sp.club_id = c.id AND sp.is_active AND sp.name ILIKE '%' || $1 || '%')
    );
`;

export const GET_DISTINCT_PUBLIC_SPORTS = `
  SELECT DISTINCT s.name
  FROM app.sports s
  JOIN app.clubs c ON s.club_id = c.id
  WHERE s.is_active AND c.status = 'active' AND c.is_public
  ORDER BY s.name ASC;
`;

export const JOIN_CLUB_AS_MEMBER = `
  INSERT INTO app.members (club_id, user_id, member_code, first_name, last_name, email, phone, status)
  VALUES (
    $1, 
    $2, 
    'M-' || lpad(floor(random() * 900000 + 100000)::text, 6, '0'), 
    $3, 
    $4, 
    $5, 
    $6, 
    'active'
  )
  ON CONFLICT (club_id, user_id) 
  DO UPDATE SET status = 'active', updated_at = now()
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

