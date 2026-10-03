export const GET_ALL_PLANS = `
  SELECT p.id, p.name, p.code, p.description, p.color, p.tier_rank, p.duration_days,
         p.price, p.joining_fee, p.min_age, p.max_age,
         p.court_free, p.court_discount_percent, p.shop_discount_percent,
         p.bar_discount_percent, p.max_bookings_per_day, p.advance_booking_days,
         p.allows_social_play, p.is_public, p.is_active, p.sort_order,
         p.created_at, p.updated_at,
         COALESCE(
           json_agg(pb ORDER BY pb.sort_order ASC) FILTER (WHERE pb.id IS NOT NULL),
           '[]'
         ) AS benefits
  FROM app.plans p
  LEFT JOIN app.plan_benefits pb ON pb.plan_id = p.id AND pb.club_id = p.club_id
  WHERE p.club_id = $1 AND ($2::boolean IS NULL OR p.is_active = $2)
  GROUP BY p.id
  ORDER BY p.sort_order ASC, p.tier_rank DESC;
`;

export const GET_PLAN_BY_ID = `
  SELECT p.*,
         COALESCE(
           json_agg(pb ORDER BY pb.sort_order ASC) FILTER (WHERE pb.id IS NOT NULL),
           '[]'
         ) AS benefits
  FROM app.plans p
  LEFT JOIN app.plan_benefits pb ON pb.plan_id = p.id AND pb.club_id = p.club_id
  WHERE p.club_id = $1 AND p.id = $2
  GROUP BY p.id;
`;

export const CREATE_PLAN = `
  INSERT INTO app.plans (
    club_id, name, code, description, color, tier_rank, duration_days, price, joining_fee,
    min_age, max_age, court_free, court_discount_percent, shop_discount_percent,
    bar_discount_percent, max_bookings_per_day, advance_booking_days, allows_social_play,
    is_public, is_active, sort_order
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
  ) RETURNING *;
`;

export const UPDATE_PLAN = `
  UPDATE app.plans
  SET name                   = COALESCE($3, name),
      code                   = COALESCE($4, code),
      description            = COALESCE($5, description),
      color                  = COALESCE($6, color),
      tier_rank              = COALESCE($7, tier_rank),
      duration_days          = COALESCE($8, duration_days),
      price                  = COALESCE($9, price),
      joining_fee            = COALESCE($10, joining_fee),
      min_age                = COALESCE($11, min_age),
      max_age                = COALESCE($12, max_age),
      court_free             = COALESCE($13, court_free),
      court_discount_percent = COALESCE($14, court_discount_percent),
      shop_discount_percent  = COALESCE($15, shop_discount_percent),
      bar_discount_percent   = COALESCE($16, bar_discount_percent),
      max_bookings_per_day   = COALESCE($17, max_bookings_per_day),
      advance_booking_days   = COALESCE($18, advance_booking_days),
      allows_social_play     = COALESCE($19, allows_social_play),
      is_public              = COALESCE($20, is_public),
      is_active              = COALESCE($21, is_active),
      sort_order             = COALESCE($22, sort_order),
      updated_at             = now()
  WHERE club_id = $1 AND id = $2
  RETURNING *;
`;

export const DELETE_PLAN = `
  UPDATE app.plans
  SET is_active = false, updated_at = now()
  WHERE club_id = $1 AND id = $2
  RETURNING *;
`;

export const ADD_PLAN_BENEFIT = `
  INSERT INTO app.plan_benefits (club_id, plan_id, label, sort_order)
  VALUES ($1, $2, $3, $4)
  RETURNING *;
`;

export const DELETE_PLAN_BENEFIT = `
  DELETE FROM app.plan_benefits
  WHERE club_id = $1 AND plan_id = $2 AND id = $3
  RETURNING *;
`;

export const GET_PLAN_BENEFITS = `
  SELECT id, label, sort_order
  FROM app.plan_benefits
  WHERE club_id = $1 AND plan_id = $2
  ORDER BY sort_order ASC;
`;
