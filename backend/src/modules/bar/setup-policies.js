import { pool } from '../../config/database.js';

async function setupBarPolicies() {
  const client = await pool.connect();
  try {
    console.log('Setting up Bar / POS RLS policies and seeds...');
    await client.query('BEGIN');

    // 1. Members can view dining tables of the club
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dining_tables' AND policyname = 'p_member_read') THEN
          CREATE POLICY p_member_read ON app.dining_tables FOR SELECT
            USING (club_id = (SELECT app.ctx_club()) AND app.ctx_role() IN ('member', 'public') AND is_active);
        END IF;
      END $$;
    `);

    // 2. Members can read items of their own bar orders
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bar_order_items' AND policyname = 'p_member_read') THEN
          CREATE POLICY p_member_read ON app.bar_order_items FOR SELECT
            USING (
              club_id = (SELECT app.ctx_club()) AND app.ctx_role() = 'member'
              AND EXISTS (
                SELECT 1 FROM app.bar_orders o 
                WHERE o.id = bar_order_items.order_id 
                AND o.member_id = (SELECT app.ctx_member())
              )
            );
        END IF;
      END $$;
    `);

    // 3. Members can create bar orders for themselves
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bar_orders' AND policyname = 'p_member_insert') THEN
          CREATE POLICY p_member_insert ON app.bar_orders FOR INSERT
            WITH CHECK (
              club_id = (SELECT app.ctx_club()) AND app.ctx_role() = 'member'
              AND member_id = (SELECT app.ctx_member())
            );
        END IF;
      END $$;
    `);

    // 4. Members can create order items for their own open orders
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bar_order_items' AND policyname = 'p_member_insert') THEN
          CREATE POLICY p_member_insert ON app.bar_order_items FOR INSERT
            WITH CHECK (
              club_id = (SELECT app.ctx_club()) AND app.ctx_role() = 'member'
              AND EXISTS (
                SELECT 1 FROM app.bar_orders o 
                WHERE o.id = bar_order_items.order_id 
                AND o.member_id = (SELECT app.ctx_member())
                AND o.status = 'open'
              )
            );
        END IF;
      END $$;
    `);

    // 5. Update plans bar_discount_percent if 0 so Gold Pro gets 15% bar discount
    await client.query(`
      UPDATE app.plans
      SET bar_discount_percent = 15.00
      WHERE name ILIKE '%Gold%' AND bar_discount_percent = 0;
    `);

    await client.query(`
      UPDATE app.plans
      SET bar_discount_percent = 10.00
      WHERE name ILIKE '%Standard%' AND bar_discount_percent = 0;
    `);

    await client.query('COMMIT');
    console.log('✅ Bar RLS policies updated successfully.');
    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to update policies:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

setupBarPolicies();
