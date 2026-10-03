import { pool } from '../../config/database.js';
import * as queries from './auth.query.js';

export async function findUserByEmail(email) {
  const result = await pool.query(queries.FIND_USER_BY_EMAIL, [email]);
  return result.rows[0] || null;
}

export async function findUserById(id) {
  const result = await pool.query(queries.FIND_USER_BY_ID, [id]);
  return result.rows[0] || null;
}

export async function createUserTx(email, fullName, phone, passwordHash) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // Check if user exists
    const existing = await client.query(queries.FIND_USER_BY_EMAIL, [email]);
    if (existing.rows.length > 0) {
      const err = new Error("User with this email already exists");
      err.status = 409;
      throw err;
    }

    const userResult = await client.query(queries.INSERT_USER, [email, fullName, phone]);
    const user = userResult.rows[0];

    if (passwordHash) {
      await client.query(queries.INSERT_USER_CREDENTIALS, [user.id, passwordHash]);
    }

    await client.query("COMMIT");
    return user;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getUserClubs(userId) {
  // uses the SQL function app.user_clubs(p_user)
  const result = await pool.query(queries.FIND_USER_CLUBS, [userId]);
  return result.rows;
}
