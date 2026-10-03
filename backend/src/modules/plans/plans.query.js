export const GET_ALL_PLANS = `
  SELECT id, name, code, description, color, tier_rank, duration_days, price, joining_fee, 
         min_age, max_age, court_free, court_discount_percent, shop_discount_percent, 
         bar_discount_percent, max_bookings_per_day, advance_booking_days, allows_social_play, 
         is_public, is_active, sort_order
  FROM app.plans
  WHERE club_id = $1 AND ($2::boolean IS NULL OR is_active = $2)
  ORDER BY sort_order ASC, tier_rank DESC;
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
