import { app } from './src/app.js';
import { config } from './src/config/config.js';
import { pool } from './src/config/database.js';

async function startServer() {
  try {
    // Verify PostgreSQL connection
    const client = await pool.connect();
    client.release();
    console.log('Successfully connected to the database.');

    const desiredPort = Number(config.port) || 3000;
    const server = app.listen(desiredPort, () => {
      console.log(`Server is running on port ${desiredPort} in ${config.nodeEnv} mode.`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        const fallbackPort = desiredPort === 3000 ? 5000 : desiredPort + 1;
        console.warn(`⚠️ Port ${desiredPort} is already in use. Retrying on port ${fallbackPort}...`);
        app.listen(fallbackPort, () => {
          console.log(`Server is running on fallback port ${fallbackPort} in ${config.nodeEnv} mode.`);
        });
      } else {
        console.error('Failed to start server:', err);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
