import { pool } from '../backend/src/config/database.js';

async function revertPolicies() {
  console.log('Reverting RLS policies back to original strict specification...');

  await pool.query(`
    -- 1. Revert shop_orders INSERT policy to strictly require member
    DROP POLICY IF EXISTS p_member_insert ON app.shop_orders;
    CREATE POLICY p_member_insert ON app.shop_orders FOR INSERT WITH CHECK (
      (club_id = app.ctx_club()) 
      AND (app.ctx_role() = 'member'::text) 
      AND (member_id = app.ctx_member()) 
      AND (channel = 'online'::app.sales_channel) 
      AND (status = 'pending'::app.shop_order_status)
    );

    -- 2. Revert shop_orders SELECT policy to strictly require member and matching member_id
    DROP POLICY IF EXISTS p_member_read ON app.shop_orders;
    CREATE POLICY p_member_read ON app.shop_orders FOR SELECT USING (
      (club_id = app.ctx_club()) 
      AND (app.ctx_role() = 'member'::text) 
      AND (member_id = app.ctx_member())
    );

    -- 3. Revert shop_order_items INSERT policy to strictly require member
    DROP POLICY IF EXISTS p_member_insert ON app.shop_order_items;
    CREATE POLICY p_member_insert ON app.shop_order_items FOR INSERT WITH CHECK (
      (club_id = app.ctx_club()) 
      AND (app.ctx_role() = 'member'::text) 
      AND (EXISTS (
        SELECT 1 FROM app.shop_orders o 
        WHERE o.id = shop_order_items.order_id 
        AND o.status = 'pending'::app.shop_order_status
      ))
    );

    -- 4. Revert shop_order_items SELECT policy to strictly require member
    DROP POLICY IF EXISTS p_member_read ON app.shop_order_items;
    CREATE POLICY p_member_read ON app.shop_order_items FOR SELECT USING (
      (club_id = app.ctx_club()) 
      AND (app.ctx_role() = 'member'::text) 
      AND (EXISTS (
        SELECT 1 FROM app.shop_orders o 
        WHERE o.id = shop_order_items.order_id
      ))
    );
  `);

  console.log('✅ Reverted RLS policies on shop_orders and shop_order_items back to original!');
  process.exit(0);
}

revertPolicies().catch(err => {
  console.error('Error reverting policies:', err);
  process.exit(1);
});
