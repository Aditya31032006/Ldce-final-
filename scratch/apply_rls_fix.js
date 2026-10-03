import { pool } from '../backend/src/config/database.js';

async function applyRLSPolicyFix() {
  console.log('Applying robust RLS policies for shop_orders and shop_order_items...');

  await pool.query(`
    -- 1. Update shop_orders INSERT policy to support member & public authenticated customers
    DROP POLICY IF EXISTS p_member_insert ON app.shop_orders;
    CREATE POLICY p_member_insert ON app.shop_orders FOR INSERT WITH CHECK (
      (club_id = app.ctx_club()) 
      AND (app.ctx_role() = ANY (ARRAY['member'::text, 'public'::text])) 
      AND (member_id IS NULL OR member_id = app.ctx_member()) 
      AND (channel = 'online'::app.sales_channel) 
      AND (status = 'pending'::app.shop_order_status)
    );

    -- 2. Update shop_orders SELECT policy so members & creators can read their orders
    DROP POLICY IF EXISTS p_member_read ON app.shop_orders;
    CREATE POLICY p_member_read ON app.shop_orders FOR SELECT USING (
      (club_id = app.ctx_club()) 
      AND (
        (app.ctx_role() = 'member'::text AND member_id = app.ctx_member())
        OR (created_by = app.ctx_user())
      )
    );

    -- 3. Update shop_order_items INSERT policy
    DROP POLICY IF EXISTS p_member_insert ON app.shop_order_items;
    CREATE POLICY p_member_insert ON app.shop_order_items FOR INSERT WITH CHECK (
      (club_id = app.ctx_club()) 
      AND (app.ctx_role() = ANY (ARRAY['member'::text, 'public'::text])) 
      AND (EXISTS (
        SELECT 1 FROM app.shop_orders o 
        WHERE o.id = shop_order_items.order_id 
        AND o.status = 'pending'::app.shop_order_status
      ))
    );

    -- 4. Update shop_order_items SELECT policy
    DROP POLICY IF EXISTS p_member_read ON app.shop_order_items;
    CREATE POLICY p_member_read ON app.shop_order_items FOR SELECT USING (
      (club_id = app.ctx_club()) 
      AND (EXISTS (
        SELECT 1 FROM app.shop_orders o 
        WHERE o.id = shop_order_items.order_id 
        AND (
          (app.ctx_role() = 'member'::text AND o.member_id = app.ctx_member())
          OR (o.created_by = app.ctx_user())
        )
      ))
    );
  `);

  console.log('✅ RLS Policies updated successfully in database!');
  process.exit(0);
}

applyRLSPolicyFix().catch(err => {
  console.error('Error applying policy fix:', err);
  process.exit(1);
});
