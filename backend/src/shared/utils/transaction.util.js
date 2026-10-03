import { pool } from '../../config/database.js';

export async function withTenantTransaction(userId, clubId, callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Switch role to club_app for RLS
    await client.query('SET LOCAL ROLE club_app');
    
    // Set context variables for RLS
    await client.query('SELECT app.set_context($1, $2)', [userId || null, clubId || null]);
    
    const result = await callback(client);
    
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
