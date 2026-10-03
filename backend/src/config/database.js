import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  options: '-c search_path=app,public',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
  // Client checked out from pool
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle PostgreSQL client:', err.message);
});

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

/**
 * Connects and verifies database readiness with automatic retries.
 */
export async function connectDB() {
  let retries = 0;

  const attempt = async () => {
    try {
      const client = await pool.connect();
      const res = await client.query('SELECT NOW() as current_time');
      client.release();
      console.log('✅ PostgreSQL connected successfully at:', res.rows[0].current_time);
    } catch (error) {
      retries++;
      if (retries <= MAX_RETRIES) {
        console.warn(`⚠️ PostgreSQL connection attempt ${retries}/${MAX_RETRIES} failed. Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        return attempt();
      }
      console.error('❌ PostgreSQL connection failed after max retries:', error.message);
      throw error;
    }
  };

  await attempt();
}

/**
 * Convenience query helper
 */
export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (config.NODE_ENV === 'development' && duration > 200) {
    console.warn(`Slow query executed in ${duration}ms: ${text.slice(0, 100)}`);
  }
  return res;
}

export default pool;
