import { pool } from '../../config/database.js';
import * as queries from './auth.query.js';

/**
 * Auth Repository
 * Layer 3: Direct database access methods using raw parameterized PostgreSQL queries
 */

/**
 * Finds user and associated credentials by email
 */
export async function findUserByEmail(email) {
  const result = await pool.query(queries.FIND_USER_BY_EMAIL, [email.trim().toLowerCase()]);
  return result.rows[0] || null;
}

/**
 * Finds user and credentials status by user ID
 */
export async function findUserById(id) {
  const result = await pool.query(queries.FIND_USER_BY_ID, [id]);
  return result.rows[0] || null;
}

/**
 * Creates a user within transaction (supports both positional and object arguments for compatibility)
 */
export async function createUserTx(arg1, arg2, arg3 = null, arg4 = null, arg5 = null) {
  if (typeof arg1 === 'object' && arg1 !== null) {
    return createUserWithCredentialsTx(arg1);
  }
  return createUserWithCredentialsTx({
    email: arg1,
    fullName: arg2,
    phone: arg3,
    passwordHash: arg4,
    avatarUrl: arg5,
  });
}

/**
 * Creates a direct user with hashed password in a single atomic transaction
 */
export async function createUserWithCredentialsTx({
  email,
  fullName,
  phone = null,
  passwordHash = null,
  avatarUrl = null,
  emailVerifiedAt = null,
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check email uniqueness within transaction
    const existing = await client.query(queries.FIND_USER_BY_EMAIL, [email.trim().toLowerCase()]);
    if (existing.rows.length > 0) {
      const err = new Error('User with this email already exists');
      err.status = 409;
      throw err;
    }

    // Insert user into app.users
    const userResult = await client.query(queries.INSERT_USER, [
      email.trim().toLowerCase(),
      fullName.trim(),
      phone ? phone.trim() : null,
      avatarUrl || null,
      emailVerifiedAt || null,
    ]);
    const user = userResult.rows[0];

    // Insert user credentials into app.user_credentials
    if (passwordHash) {
      await client.query(queries.INSERT_USER_CREDENTIALS, [user.id, passwordHash]);
    }

    await client.query('COMMIT');
    return user;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Creates a new user registered via Google OAuth (without password, phone initially null)
 */
export async function createOAuthUserTx({ email, fullName, avatarUrl = null }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(queries.FIND_USER_BY_EMAIL, [email.trim().toLowerCase()]);
    if (existing.rows.length > 0) {
      await client.query('COMMIT');
      return existing.rows[0];
    }

    const emailVerifiedAt = new Date();
    const userResult = await client.query(queries.INSERT_USER, [
      email.trim().toLowerCase(),
      fullName.trim(),
      null, // phone is not provided by OAuth
      avatarUrl || null,
      emailVerifiedAt,
    ]);
    const user = userResult.rows[0];

    await client.query('COMMIT');
    return user;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Syncs an existing OAuth user login (e.g. updating avatar and last login)
 */
export async function syncOAuthUser(userId, { avatarUrl = null } = {}) {
  const result = await pool.query(queries.UPDATE_GOOGLE_USER_SYNC, [userId, avatarUrl]);
  return result.rows[0] || null;
}

/**
 * Updates user profile fields (e.g., adding phone during setup profile)
 */
export async function updateUserProfile(userId, { fullName = null, phone = null, avatarUrl = null } = {}) {
  const result = await pool.query(queries.UPDATE_USER_PROFILE, [
    userId,
    fullName ? fullName.trim() : null,
    phone ? phone.trim() : null,
    avatarUrl || null,
  ]);
  return result.rows[0] || null;
}

/**
 * Sets or updates user password in app.user_credentials
 */
export async function setUserPassword(userId, passwordHash) {
  const result = await pool.query(queries.INSERT_USER_CREDENTIALS, [userId, passwordHash]);
  return result.rows[0] || null;
}

/**
 * Updates last_login_at timestamp
 */
export async function updateLastLogin(userId) {
  await pool.query(queries.UPDATE_USER_LAST_LOGIN, [userId]);
}

/**
 * Retrieves clubs associated with a given user
 */
export async function getUserClubs(userId) {
  try {
    const result = await pool.query(queries.FIND_USER_CLUBS, [userId]);
    return result.rows || [];
  } catch (err) {
    console.warn('Could not fetch user clubs:', err.message);
    return [];
  }
}

/**
 * Checks if user is a platform admin
 */
export async function isPlatformAdmin(userId) {
  try {
    const result = await pool.query(queries.CHECK_PLATFORM_ADMIN, [userId]);
    return result.rows.length > 0;
  } catch (err) {
    return false;
  }
}
