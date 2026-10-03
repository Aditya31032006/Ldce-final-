import { pool } from '../backend/src/config/database.js';

async function inspect() {
  const res = await pool.query(
    "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'app' AND table_name = 'products' ORDER BY ordinal_position"
  );
  console.log('=== TABLE: products ===');
  console.table(res.rows);
  await pool.end();
}

inspect();
