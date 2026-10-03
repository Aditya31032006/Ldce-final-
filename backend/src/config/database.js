import pg from 'pg';
import { config } from './env.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});
