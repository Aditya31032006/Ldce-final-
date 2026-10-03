import dotenv from 'dotenv';
dotenv.config();

const app_config = {
  // Server Config
  PORT: process.env.PORT || 3000,
  port: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  nodeEnv: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  // Database Config
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:QueryCure@localhost:5432/odooXLDCE',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:QueryCure@localhost:5432/odooXLDCE',

  // JWT Secret
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret-key-for-dev-only',
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-key-for-dev-only',

  // SMTP Mail Config
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  MAIL_FROM: process.env.MAIL_FROM || '"Sports Club Platform" <no-reply@sportsclub.com>',
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || '"Sports Club Platform" <no-reply@sportsclub.com>',
  },

  // Google OAuth Config
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
  },

  // Redis & Upstash Config
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || '',
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || '',
  REDIS_HOST: process.env.REDIS_HOST || (process.env.UPSTASH_REDIS_REST_URL ? new URL(process.env.UPSTASH_REDIS_REST_URL).hostname : '127.0.0.1'),
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  REDIS_USERNAME: process.env.REDIS_USERNAME || 'default',
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || process.env.UPSTASH_REDIS_REST_TOKEN || '',
  REDIS_TLS: process.env.REDIS_TLS === 'true' || Boolean(process.env.UPSTASH_REDIS_REST_URL),

  // Razorpay
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || 'rzp_test_SQOga2rRgYRMaJ',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || 'qBFMLno35AFDV70XGKVhXgYq',
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_SQOga2rRgYRMaJ',
    keySecret: process.env.RAZORPAY_KEY_SECRET || 'qBFMLno35AFDV70XGKVhXgYq',
  },
};


if (!app_config.DATABASE_URL) {
  console.warn('⚠️ WARNING: DATABASE_URL is not set.');
}

export const config = Object.freeze(app_config);
export default config;
