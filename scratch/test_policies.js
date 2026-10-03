import { pool } from '../backend/src/config/database.js';

async function main() {
  const policies = await pool.query(
    "SELECT tablename, policyname, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'app' AND tablename IN ('products', 'product_variants', 'shop_orders', 'shop_order_items')"
  );
  console.log('Policies:\n', JSON.stringify(policies.rows, null, 2));

  // Also check ctx_role for adityangandhi
  const client = await pool.connect();
  await client.query('BEGIN');
  await client.query('SET LOCAL ROLE club_app');
  await client.query('SELECT app.set_context($1, $2)', ['b798763f-c50d-4277-a75c-321d07a77d26', 'e93f757c-b8b7-46ad-8c0a-316ee3ec2406']);
  const ctx = await client.query('SELECT app.ctx_user(), app.ctx_club(), app.ctx_role()');
  console.log('Context for Aditya:', ctx.rows[0]);
  
  const v = await client.query('SELECT id, stock_qty, track_stock, price FROM app.product_variants WHERE id = $1 AND club_id = $2', ['ed85ed78-ab0b-454b-a547-998d3e58a54e', 'e93f757c-b8b7-46ad-8c0a-316ee3ec2406']);
  console.log('Variant exists:', v.rows[0]);

  // Try creating an order as front_desk / member
  const ord = await client.query(`
    INSERT INTO app.shop_orders (club_id, guest_name, channel, fulfillment, status, created_by)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `, ['e93f757c-b8b7-46ad-8c0a-316ee3ec2406', 'Aditya N. Gandhi', 'pos', 'counter', 'pending', 'b798763f-c50d-4277-a75c-321d07a77d26']);
  console.log('Inserted order:', ord.rows[0]);

  const itm = await client.query(`
    INSERT INTO app.shop_order_items (club_id, order_id, variant_id, quantity)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `, ['e93f757c-b8b7-46ad-8c0a-316ee3ec2406', ord.rows[0].id, 'ed85ed78-ab0b-454b-a547-998d3e58a54e', 2]);
  console.log('Inserted order item:', itm.rows[0]);

  const finalOrd = await client.query('SELECT id, order_no, status, total, subtotal FROM app.shop_orders WHERE id = $1', [ord.rows[0].id]);
  console.log('Final order with recalculated totals:', finalOrd.rows[0]);
  
  await client.query('ROLLBACK');
  client.release();
  process.exit(0);
}

main().catch(console.error);
