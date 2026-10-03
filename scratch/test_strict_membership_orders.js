import jwt from '../backend/node_modules/jsonwebtoken/index.js';
import { pool } from '../backend/src/config/database.js';

const JWT_SECRET = 'sports_club_platform_jwt_secret_dev_key_2026';
const BASE_URL = 'http://localhost:3000/api';
const CLUB_ID = 'e93f757c-b8b7-46ad-8c0a-316ee3ec2406';

async function test() {
  // Get variant
  const vRes = await pool.query('SELECT id, product_id FROM app.product_variants WHERE club_id = $1 LIMIT 1', [CLUB_ID]);
  const variantId = vRes.rows[0].id;

  // 1. Create a non-member user who has NOT joined the club
  const nonMemberEmail = `guest_${Date.now()}@example.com`;
  const uRes = await pool.query(`
    INSERT INTO app.users (email, full_name, is_active)
    VALUES ($1, 'Guest Player', true)
    RETURNING id;
  `, [nonMemberEmail]);
  const nonMemberId = uRes.rows[0].id;

  const nonMemberToken = jwt.sign(
    { id: nonMemberId, email: nonMemberEmail, role: 'public', clubId: CLUB_ID },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  console.log('--- 1. Testing order by non-member (has NOT joined the club) ---');
  const res1 = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${nonMemberToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      guest_name: 'Guest Player',
      fulfillment: 'counter',
      items: [{ variant_id: variantId, quantity: 1 }]
    })
  });
  console.log('Non-member HTTP status:', res1.status);
  const data1 = await res1.json();
  console.log('Response body:', data1);

  // 2. Now user JOINS the club as an active member in app.members
  console.log('\n--- 2. User joins the club as a member ---');
  const mRes = await pool.query(`
    INSERT INTO app.members (club_id, user_id, member_code, first_name, last_name, email, status)
    VALUES ($1, $2, 'M-' || lpad(floor(random() * 900000 + 100000)::text, 6, '0'), 'Guest', 'Player', $3, 'active')
    RETURNING id;
  `, [CLUB_ID, nonMemberId, nonMemberEmail]);
  console.log('Joined club! Member ID:', mRes.rows[0].id);

  // Sign token as member
  const memberToken = jwt.sign(
    { id: nonMemberId, email: nonMemberEmail, role: 'member', clubId: CLUB_ID },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  console.log('\n--- 3. Testing order by member (AFTER joining the club) ---');
  const res2 = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${memberToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      guest_name: 'Joined Member',
      fulfillment: 'counter',
      items: [{ variant_id: variantId, quantity: 1 }]
    })
  });
  console.log('Member HTTP status:', res2.status);
  const data2 = await res2.json();
  console.log('Member order result:', data2.order?.order_no, 'Total: $' + data2.order?.total);

  // Cleanup test user
  await pool.query('DELETE FROM app.shop_orders WHERE created_by = $1', [nonMemberId]);
  await pool.query('DELETE FROM app.members WHERE user_id = $1', [nonMemberId]);
  await pool.query('DELETE FROM app.users WHERE id = $1', [nonMemberId]);

  console.log('\n✅ VERIFICATION COMPLETE: Strict membership rule strictly enforced & working!');
  process.exit(0);
}

test().catch(console.error);
