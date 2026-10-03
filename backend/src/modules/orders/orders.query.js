export const LOCK_VARIANT = `
  SELECT id, stock_qty, track_stock, price
  FROM app.product_variants
  WHERE id = $1 AND club_id = $2 FOR UPDATE;
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
