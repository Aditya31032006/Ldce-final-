import mongoose from 'mongoose';
import config from './config.js';
import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4'])
dns.setDefaultResultOrder('ipv4first');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

export const connectDB = async () => {
    let retries = 0;

    const connect = async () => {
        try {
            await mongoose.connect(config.DATABASE_URL, {
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });
            console.log('MongoDB connected successfully');

            mongoose.connection.on('error', (err) => {
                console.error('MongoDB connection error:', err);
            });

            mongoose.connection.on('disconnected', () => {
                console.warn('MongoDB disconnected. Attempting to reconnect...');
            });

            mongoose.connection.on('reconnected', () => {
                console.info('MongoDB reconnected');
            });
        } catch (error) {
            retries++;
            if (retries <= MAX_RETRIES) {
                console.warn(`MongoDB connection attempt ${retries}/${MAX_RETRIES} failed. Retrying in ${RETRY_DELAY_MS / 1000}s...`);
                await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
                return connect();
            }
            console.error('❌ MongoDB connection failed after max retries:', error);
            throw error;
        }
    };

    await connect();
};