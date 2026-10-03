import { pool } from '../backend/src/config/database.js';

async function inspect() {
  for (const t of ['products', 'product_variants', 'product_categories', 'shop_orders']) {
    const res = await pool.query(
      "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'app' AND table_name = $1 ORDER BY ordinal_position",
      [t]
    );
    console.log(`=== TABLE: ${t} ===`);
    console.table(res.rows);
  }
  await pool.end();
}

inspect();
