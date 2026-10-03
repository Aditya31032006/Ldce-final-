import { pool } from '../backend/src/config/database.js';

async function testQuery() {
  const users = await pool.query("SELECT id, email FROM app.users");
  for (const u of users.rows) {
    const res = await pool.query(`
      SELECT DISTINCT ON (club_id) club_id, slug, name, role
      FROM (
        SELECT c.id AS club_id, c.slug, c.name, 'owner'::text AS role
        FROM app.clubs c
        WHERE c.owner_user_id = $1
        UNION ALL
        SELECT club_id, slug, name, role
        FROM app.user_clubs($1)
      ) combined
      ORDER BY club_id, CASE WHEN role = 'owner' THEN 1 WHEN role = 'manager' THEN 2 WHEN role = 'front_desk' THEN 3 WHEN role = 'shop_staff' THEN 4 ELSE 5 END
    `, [u.id]);
    console.log(`User ${u.email}:`, res.rows);
  }
  await pool.end();
}

testQuery();
