import { app } from './src/app.js';
import { config } from './src/config/env.js';
import { pool } from './src/config/database.js';

async function startServer() {
  try {
    // Check DB connection
    const client = await pool.connect();
    client.release();
    console.log('Successfully connected to the database.');

    app.listen(config.port, () => {
      console.log(`Server is running on port ${config.port} in ${config.nodeEnv} mode.`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
