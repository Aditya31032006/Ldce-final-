import { pool } from '../backend/src/config/database.js';

async function testProductsQuery() {
  const clubId = 'e93f757c-b8b7-46ad-8c0a-316ee3ec2406';
  const res = await pool.query(`
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
      COALESCE(MIN(pv.price), 0) AS min_price,
      COALESCE(MAX(pv.price), 0) AS max_price,
      COALESCE(SUM(pv.stock_qty), 0)::int AS total_stock
    FROM app.products p
    LEFT JOIN app.product_categories c ON c.id = p.category_id AND c.club_id = p.club_id
    LEFT JOIN app.product_variants pv ON pv.product_id = p.id AND pv.club_id = p.club_id
    WHERE p.club_id = $1 AND ($2::boolean IS NULL OR p.is_active = $2)
    GROUP BY p.id, c.name
    ORDER BY p.created_at DESC;
  `, [clubId, null]);
  console.log('Query executed successfully. Found products:', res.rows.length);
  await pool.end();
}

testProductsQuery();
