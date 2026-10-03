import { pool } from '../backend/src/config/database.js';

async function testOrdersQuery() {
  const clubId = 'e93f757c-b8b7-46ad-8c0a-316ee3ec2406';
  const query = `
    SELECT 
      o.id,
      o.club_id,
      o.order_no,
      o.member_id,
      o.guest_name,
      o.guest_phone,
      o.channel,
      o.fulfillment,
      o.status,
      o.delivery_address,
      o.delivery_fee,
      o.discount_percent,
      o.subtotal,
      o.discount_total,
      o.tax_total,
      o.total,
      o.placed_at,
      o.completed_at,
      o.notes,
      o.created_by,
      o.created_at,
      COALESCE(u.full_name, o.guest_name, 'Customer') AS customer_name,
      u.email AS customer_email,
      COALESCE(u.phone, o.guest_phone) AS customer_phone,
      COALESCE(
        json_agg(
          json_build_object(
            'id', i.id,
            'item_name', i.item_name,
            'quantity', i.quantity,
            'unit_price', i.unit_price,
            'line_total', i.line_total
          )
        ) FILTER (WHERE i.id IS NOT NULL),
        '[]'::json
      ) AS items,
      COUNT(i.id)::int AS item_count
    FROM app.shop_orders o
    LEFT JOIN app.members m ON o.member_id = m.id
    LEFT JOIN app.users u ON m.user_id = u.id OR o.created_by = u.id
    LEFT JOIN app.shop_order_items i ON i.order_id = o.id AND i.club_id = o.club_id
    WHERE o.club_id = $1 AND ($2::uuid IS NULL OR (o.created_by = $2 OR m.user_id = $2))
    GROUP BY o.id, u.full_name, u.email, u.phone
    ORDER BY o.placed_at DESC
    LIMIT 100;
  `;

  const res1 = await pool.query(query, [clubId, null]);
  console.log('Orders query for owner (all orders): executed. Rows:', res1.rows.length);

  const res2 = await pool.query(query, [clubId, '80017516-c78f-4643-8217-710106e9a0b3']);
  console.log('Orders query for customer (filtered): executed. Rows:', res2.rows.length);

  await pool.end();
}

testOrdersQuery();
