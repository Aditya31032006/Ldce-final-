import { pool } from '../backend/src/config/database.js';

async function check() {
  try {
    const res = await pool.query(`
      SELECT table_name, column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_schema = 'app' 
        AND column_name LIKE '%avatar%' OR column_name LIKE '%image%'
      ORDER BY table_name, column_name;
    `);
    console.log('Columns matching avatar/image:');
    console.table(res.rows);

    const userCol = await pool.query(`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_schema = 'app' AND table_name = 'users';
    `);
    console.log('Users table columns:');
    console.table(userCol.rows);

    await pool.end();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

check();
