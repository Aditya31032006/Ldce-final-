import { pool } from '../../config/database.js';

async function setupBarPolicies() {
  const client = await pool.connect();
  try {
    console.log('Setting up Bar / POS RLS policies and seeds...');
    await client.query('BEGIN');

    // 1. Members and users can view dining tables of the club
    await client.query(`
      DROP POLICY IF EXISTS p_member_read ON app.dining_tables;
      DROP POLICY IF EXISTS p_all_write ON app.dining_tables;
      CREATE POLICY p_all_write ON app.dining_tables FOR ALL
        USING (club_id = (SELECT app.ctx_club()))
        WITH CHECK (club_id = (SELECT app.ctx_club()));
    `);

    // 2. Bar order items policies
    await client.query(`
      DROP POLICY IF EXISTS p_member_read ON app.bar_order_items;
      DROP POLICY IF EXISTS p_member_insert ON app.bar_order_items;
      CREATE POLICY p_member_insert ON app.bar_order_items FOR INSERT
        WITH CHECK (club_id = (SELECT app.ctx_club()));
      CREATE POLICY p_member_read ON app.bar_order_items FOR SELECT
        USING (club_id = (SELECT app.ctx_club()));
    `);

    // 3. Members can create and read bar orders
    await client.query(`
      DROP POLICY IF EXISTS p_member_insert ON app.bar_orders;
      DROP POLICY IF EXISTS p_member_read ON app.bar_orders;
      DROP POLICY IF EXISTS p_member_update ON app.bar_orders;
      CREATE POLICY p_member_insert ON app.bar_orders FOR INSERT
        WITH CHECK (club_id = (SELECT app.ctx_club()));
      CREATE POLICY p_member_read ON app.bar_orders FOR SELECT
        USING (
          club_id = (SELECT app.ctx_club()) AND (
            app.ctx_role() = ANY ('{owner,manager,front_desk,bar_staff,kitchen}'::text[])
            OR member_id = (SELECT app.ctx_member())
            OR opened_by = (SELECT app.ctx_user())
            OR (SELECT app.ctx_role()) IN ('member', 'public')
          )
        );
      CREATE POLICY p_member_update ON app.bar_orders FOR UPDATE
        USING (
          club_id = (SELECT app.ctx_club()) AND (
            app.ctx_role() = ANY ('{owner,manager,front_desk,bar_staff,kitchen}'::text[])
            OR member_id = (SELECT app.ctx_member())
            OR opened_by = (SELECT app.ctx_user())
          )
        );
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
