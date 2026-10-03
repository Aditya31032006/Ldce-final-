export const LOCK_VARIANT = `
  SELECT id, stock_qty, track_stock, price
  FROM app.product_variants
  WHERE id = $1 AND club_id = $2;
`;

export const INSERT_SHOP_ORDER = `
  INSERT INTO app.shop_orders (
    club_id, member_id, guest_name, guest_phone, channel, fulfillment, delivery_address, status, created_by
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
  ) RETURNING *;
`;

export const INSERT_SHOP_ORDER_ITEM = `
  INSERT INTO app.shop_order_items (
    club_id, order_id, variant_id, quantity
  ) VALUES (
    $1, $2, $3, $4
  ) RETURNING *;
`;

export const GET_SHOP_ORDERS = `
  SELECT 
    o.id,
    o.club_id,
    o.order_no,
    o.member_id,
    o.guest_name,
    o.guest_phone,
    o.channel,
    o.fulfillment,
    o.status,
    o.delivery_address,
    o.delivery_fee,
    o.discount_percent,
    o.subtotal,
    o.discount_total,
    o.tax_total,
    o.total,
    o.placed_at,
    o.completed_at,
    o.notes,
    o.created_by,
    o.created_at,
    COALESCE(u_creator.full_name, u_member.full_name, o.guest_name, 'Customer') AS customer_name,
    COALESCE(u_creator.email, u_member.email) AS customer_email,
    COALESCE(u_creator.phone, u_member.phone, o.guest_phone) AS customer_phone,
    COALESCE(
      json_agg(
        json_build_object(
          'id', i.id,
          'item_name', i.item_name,
          'quantity', i.quantity,
          'unit_price', i.unit_price,
          'line_total', i.line_total
        )
      ) FILTER (WHERE i.id IS NOT NULL),
      '[]'::json
    ) AS items,
    COUNT(i.id)::int AS item_count
  FROM app.shop_orders o
  LEFT JOIN app.members m ON o.member_id = m.id
  LEFT JOIN app.users u_creator ON o.created_by = u_creator.id
  LEFT JOIN app.users u_member ON m.user_id = u_member.id
  LEFT JOIN app.shop_order_items i ON i.order_id = o.id AND i.club_id = o.club_id
  WHERE o.club_id = $1 AND ($2::uuid IS NULL OR (o.created_by = $2 OR m.user_id = $2))
  GROUP BY o.id, u_creator.full_name, u_creator.email, u_creator.phone, u_member.full_name, u_member.email, u_member.phone
  ORDER BY o.placed_at DESC
  LIMIT 100;
`;

export const UPDATE_SHOP_ORDER_STATUS = `
  UPDATE app.shop_orders
  SET 
    status = $1::app.shop_order_status,
    completed_at = CASE WHEN $1::text = 'completed' THEN NOW() ELSE completed_at END,
    updated_at = NOW()
  WHERE id = $2::uuid AND club_id = $3::uuid
  RETURNING *;
`;



