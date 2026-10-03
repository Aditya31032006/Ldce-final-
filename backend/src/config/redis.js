import Redis from 'ioredis';
import config from './config.js';

export const redisConnection = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  username: config.REDIS_USERNAME,
  password: config.REDIS_PASSWORD || undefined,
  tls: config.REDIS_TLS ? {} : undefined,
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

let hasWarned = false;
redisClient.on('error', (err) => {
  if (config.NODE_ENV === 'development') {
    if (!hasWarned) {
      console.log('ℹ️  Redis is not running on 127.0.0.1:6379. Memory fallback activated for OTP.');
      hasWarned = true;
    }
  } else {
    console.error('❌ Redis client connection error:', err.message);
  }
});


export default redisClient;
