export const GET_PRODUCTS = `
  SELECT id, category_id, brand_id, name, description, image_url, is_online, is_active
  FROM app.products
  WHERE club_id = $1 AND ($2::boolean IS NULL OR is_active = $2);
`;

export const GET_PRODUCT_VARIANTS = `
  SELECT id, product_id, sku, barcode, size, color, price, mrp, track_stock, stock_qty, reorder_level, is_active
  FROM app.product_variants
  WHERE club_id = $1 AND product_id = $2;
`;

export const INSERT_PRODUCT = `
  INSERT INTO app.products (
    club_id, category_id, brand_id, name, description, image_url, is_online, is_active
  ) VALUES (
    $1, $2, $3, $4, $5, $6, coalesce($7, true), coalesce($8, true)
  ) RETURNING *;
`;

export const INSERT_VARIANT = `
  INSERT INTO app.product_variants (
    club_id, product_id, sku, barcode, size, color, price, mrp, track_stock, stock_qty, reorder_level, is_active
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, coalesce($9, true), coalesce($10, 0), coalesce($11, 0), coalesce($12, true)
  ) RETURNING *;
`;

export const GET_PURCHASE_ORDERS = 'SELECT * FROM app.purchase_orders WHERE club_id = $1;';