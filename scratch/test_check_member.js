import { pool } from '../backend/src/config/database.js';

async function check() {
  const c = await pool.query("SELECT conname, contype, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'app.members'::regclass");
  console.log('members constraints:', c.rows);
  const indexes = await pool.query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'members' AND schemaname = 'app'");
  console.log('members indexes:', indexes.rows);
  process.exit(0);
}

check().catch(console.error);
