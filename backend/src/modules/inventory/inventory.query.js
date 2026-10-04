export const GET_PRODUCTS = `
  SELECT 
    p.id, 
    p.club_id, 
    p.category_id, 
    c.name::text AS category_name,
    p.brand_id, 
    p.name, 
    p.description, 
    p.image_url, 
    p.is_online, 
    p.is_active, 
    p.created_at,
    COALESCE(
      json_agg(
        json_build_object(
          'id', pv.id,
          'sku', pv.sku,
          'barcode', pv.barcode,
          'size', pv.size,
          'color', pv.color,
          'price', pv.price,
          'mrp', pv.mrp,
          'cost_price', pv.cost_price,
          'track_stock', pv.track_stock,
          'stock_qty', pv.stock_qty,
          'reorder_level', pv.reorder_level,
          'is_active', pv.is_active
        ) ORDER BY pv.price ASC
      ) FILTER (WHERE pv.id IS NOT NULL),
      '[]'::json
    ) AS variants,
    COALESCE(MIN(pv.price), 0) AS price,
    COALESCE(MIN(pv.price), 0) AS min_price,
    COALESCE(MAX(pv.price), 0) AS max_price,
    COALESCE(MIN(pv.mrp), 0) AS mrp,
    COALESCE(SUM(pv.stock_qty), 0)::int AS stock_qty,
    COALESCE(MIN(pv.sku), '') AS sku
  FROM app.products p
  LEFT JOIN app.product_categories c ON c.id = p.category_id AND c.club_id = p.club_id
  LEFT JOIN app.product_variants pv ON pv.product_id = p.id AND pv.club_id = p.club_id
  WHERE p.club_id = $1 AND ($2::boolean IS NULL OR p.is_active = $2)
    AND (
      $3::text IS NULL OR $3::text = '' OR
      p.name ILIKE '%' || $3 || '%' OR
      p.description ILIKE '%' || $3 || '%' OR
      c.name::text ILIKE '%' || $3 || '%' OR
      EXISTS (
        SELECT 1 FROM app.product_variants sub_pv
        WHERE sub_pv.product_id = p.id AND (sub_pv.sku ILIKE '%' || $3 || '%' OR sub_pv.barcode ILIKE '%' || $3 || '%')
      ) OR
      similarity(p.name, $3) > 0.15 OR
      similarity(COALESCE(c.name::text, ''), $3) > 0.15
    )
  GROUP BY p.id, c.name
  ORDER BY 
    CASE WHEN $3::text IS NOT NULL AND $3::text != '' 
      THEN similarity(p.name, $3)
      ELSE 0
    END DESC,
    p.created_at DESC;
`;

export const GET_PRODUCT_CATEGORIES = `
  SELECT id, name, sort_order, is_active
  FROM app.product_categories
  WHERE club_id = $1 AND is_active = true
  ORDER BY sort_order ASC, name ASC;
`;

export const FIND_PRODUCT_CATEGORY_BY_NAME = `
  SELECT id, name FROM app.product_categories
  WHERE club_id = $1 AND name = $2 LIMIT 1;
`;

export const INSERT_PRODUCT_CATEGORY = `
  INSERT INTO app.product_categories (club_id, name)
  VALUES ($1, $2)
  RETURNING id, name;
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

export const UPDATE_PRODUCT = `
  UPDATE app.products
  SET name = COALESCE($3, name),
      description = COALESCE($4, description),
      category_id = COALESCE($5, category_id),
      image_url = COALESCE($6, image_url),
      is_online = COALESCE($7, is_online),
      is_active = COALESCE($8, is_active),
      updated_at = now()
  WHERE id = $1 AND club_id = $2
  RETURNING *;
`;

export const UPDATE_VARIANT_STOCK = `
  UPDATE app.product_variants
  SET stock_qty = COALESCE($3, stock_qty),
      price = COALESCE($4, price),
      mrp = COALESCE($5, mrp),
      is_active = COALESCE($6, is_active),
      updated_at = now()
  WHERE product_id = $1 AND club_id = $2
  RETURNING *;
`;

export const DELETE_PRODUCT = `
  DELETE FROM app.products WHERE id = $1 AND club_id = $2 RETURNING id;
`;

export const GET_PURCHASE_ORDERS = 'SELECT * FROM app.purchase_orders WHERE club_id = $1 ORDER BY created_at DESC;';