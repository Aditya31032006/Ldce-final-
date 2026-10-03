import { config } from 'dotenv';
config();

const app_config = {
    PORT: process.env.PORT || 3000,
    DATABASE_URL: process.env.MONGODB_URI,
    JWT_SECRET: process.env.JWT_SECRET || 'prixo_default_secret_key_123',
    
    // SMTP Mail Config
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_SECURE: process.env.SMTP_SECURE,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    MAIL_FROM: process.env.MAIL_FROM,

    // Google OAuth Config
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',

    // Redis Config
    REDIS_HOST: process.env.REDIS_HOST || '127.0.0.1',
    REDIS_PORT: Number(process.env.REDIS_PORT || 6379),
    REDIS_USERNAME: process.env.REDIS_USERNAME || 'default',
    REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
};

export default Object.freeze(app_config);