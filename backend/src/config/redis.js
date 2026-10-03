import Redis from 'ioredis';
import config from './config.js';

export const redisConnection = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  username: config.REDIS_USERNAME,
  password: config.REDIS_PASSWORD || undefined,
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  enableReadyCheck: false,
  retryStrategy(times) {
    if (times > 3) {
      // Stop retrying after 3 failed attempts in dev to avoid noisy console spam
      return null;
    }
    return Math.min(times * 500, 2000);
  },
};

export const redisClient = new Redis(redisConnection);

redisClient.on('connect', () => {
  console.log('⚡ Redis client connected successfully.');
});

redisClient.on('error', (err) => {
  if (config.NODE_ENV === 'development') {
    // Graceful warning in development when local Redis is not running
    console.warn('⚠️ Redis notice:', err.message);
  } else {
    console.error('❌ Redis client connection error:', err.message);
  }
});

export default redisClient;
