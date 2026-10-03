import { pool } from '../backend/src/config/database.js';

async function checkCatConstraints() {
  const res = await pool.query(`
    SELECT conname, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = 'app' AND c.conrelid = 'app.product_categories'::regclass;
  `);
  console.log('Category constraints:', res.rows);
  await pool.end();
}

checkCatConstraints();
