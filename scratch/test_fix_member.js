import { pool } from '../backend/src/config/database.js';

async function testFix() {
  const userId = '5a8b6306-71f8-4dae-acc7-004e9a94882d'; // eagleofdarkness31@gmail.com
  const clubId = 'e93f757c-b8b7-46ad-8c0a-316ee3ec2406'; // Dead Pixels

  // 1. Ensure user is in app.members
  const memRes = await pool.query(`
    INSERT INTO app.members (club_id, user_id, member_code, first_name, last_name, email, status)
    SELECT $1, u.id, 'M-' || lpad(floor(random() * 900000 + 100000)::text, 6, '0'), 
           coalesce(split_part(u.full_name, ' ', 1), 'Member'),
           coalesce(split_part(u.full_name, ' ', 2), 'Customer'),
           u.email, 'active'
    FROM app.users u
    WHERE u.id = $2
    ON CONFLICT (club_id, user_id) WHERE user_id IS NOT NULL DO UPDATE SET status = 'active'
    RETURNING id;
  `, [clubId, userId]);
  console.log('Member id created/ensured:', memRes.rows[0]?.id);

  // 2. Now run transaction as club_app with set_context
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE club_app');
    await client.query('SELECT app.set_context($1, $2)', [userId, clubId]);
    const ctx = await client.query('SELECT app.ctx_user(), app.ctx_club(), app.ctx_role(), app.ctx_member()');
    console.log('Context after member created:', ctx.rows[0]);

    // 3. Now insert shop_order with member_id = ctx_member() and fulfillment = 'counter'
    const ord = await client.query(`
      INSERT INTO app.shop_orders (
        club_id, member_id, guest_name, channel, fulfillment, status, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      ) RETURNING id, order_no, member_id, status, channel;
    `, [clubId, ctx.rows[0].ctx_member, 'Eagle Customer', 'online', 'counter', 'pending', userId]);
    console.log('Order successfully inserted:', ord.rows[0]);

    // 4. Insert order item
    const variantId = 'ed85ed78-ab0b-454b-a547-998d3e58a54e';
    const itm = await client.query(`
      INSERT INTO app.shop_order_items (
        club_id, order_id, variant_id, quantity
      ) VALUES ($1, $2, $3, $4) RETURNING id, item_name, unit_price, line_total;
    `, [clubId, ord.rows[0].id, variantId, 1]);
    console.log('Order item successfully inserted:', itm.rows[0]);

    await client.query('ROLLBACK');
    console.log('Test succeeded without any RLS violation!');
  } finally {
    client.release();
  }

  process.exit(0);
}

testFix().catch(console.error);
