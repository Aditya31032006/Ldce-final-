import { pool } from '../backend/src/config/database.js';

async function testRLS() {
  const users = await pool.query("SELECT id, email FROM app.users");
  console.log('Users:', users.rows);

  const members = await pool.query("SELECT id, user_id, club_id, status FROM app.members");
  console.log('Members in app.members table:', members.rows);

  for (const u of users.rows) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE club_app');
      const clubId = 'e93f757c-b8b7-46ad-8c0a-316ee3ec2406';
      await client.query('SELECT app.set_context($1, $2)', [u.id, clubId]);
      const ctx = await client.query('SELECT app.ctx_user(), app.ctx_club(), app.ctx_role(), app.ctx_member()');
      console.log(`\nUser ${u.email}:`, ctx.rows[0]);

      // Attempt insert into shop_orders with member_id = null
      try {
        const ins1 = await client.query(`
          INSERT INTO app.shop_orders (club_id, member_id, guest_name, channel, fulfillment, status, created_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
        `, [clubId, null, 'Test Customer', 'online', 'delivery', 'pending', u.id]);
        console.log(`Insert with null member_id succeeded for ${u.email}:`, ins1.rows[0]?.id);
      } catch (e1) {
        console.log(`Insert with null member_id FAILED for ${u.email}:`, e1.message);
      }

      // Attempt insert with member_id = ctx_member()
      try {
        const ins2 = await client.query(`
          INSERT INTO app.shop_orders (club_id, member_id, guest_name, channel, fulfillment, status, created_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
        `, [clubId, ctx.rows[0].ctx_member, 'Test Customer', 'online', 'delivery', 'pending', u.id]);
        console.log(`Insert with ctx_member succeeded for ${u.email}:`, ins2.rows[0]?.id);
      } catch (e2) {
        console.log(`Insert with ctx_member FAILED for ${u.email}:`, e2.message);
      }

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  }

  process.exit(0);
}

testRLS().catch(console.error);
