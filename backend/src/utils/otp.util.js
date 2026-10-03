import crypto from 'crypto';
import redisClient from '../config/redis.js';

// In-memory fallback in case Redis connection is unavailable in local dev
const inMemoryOtpStore = new Map();

/**
 * Generates a cryptographically random 6-digit numeric OTP.
 * @param {number} length 
 * @returns {string} 6-digit OTP string
 */
export function generateOtp(length = 6) {
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += crypto.randomInt(0, 10).toString();
  }
  return otp;
}

/**
 * Stores the OTP for a given email in Redis (with in-memory fallback)
 * @param {string} email 
 * @param {string} otp 
 * @param {number} ttlSeconds Default: 600 (10 minutes)
 */
export async function storeOtp(email, otp, ttlSeconds = 600) {
  const normalizedEmail = email.trim().toLowerCase();
  const redisKey = `otp:reset_password:${normalizedEmail}`;

  // Store in memory fallback
  inMemoryOtpStore.set(normalizedEmail, {
    otp: String(otp).trim(),
    expiresAt: Date.now() + ttlSeconds * 1000,
  });

  try {
    if (redisClient && redisClient.status === 'ready') {
      await redisClient.set(redisKey, String(otp).trim(), 'EX', ttlSeconds);
    }
  } catch (err) {
    console.warn(`⚠️ Could not save OTP in Redis (${err.message}). Using memory fallback.`);
  }

  return true;
}

/**
 * Verifies if the candidate OTP matches the stored OTP for the email
 * @param {string} email 
 * @param {string} candidateOtp 
 * @returns {Promise<boolean>}
 */
export async function verifyOtp(email, candidateOtp) {
  if (!candidateOtp) return false;
  const normalizedEmail = email.trim().toLowerCase();
  const redisKey = `otp:reset_password:${normalizedEmail}`;
  const cleanInput = String(candidateOtp).trim();

  // 1. Try Redis first
  try {
    if (redisClient && redisClient.status === 'ready') {
      const stored = await redisClient.get(redisKey);
      if (stored) {
        return stored.trim() === cleanInput;
      }
    }
  } catch (err) {
    console.warn(`⚠️ Redis read failed during verifyOtp (${err.message}). Checking memory fallback.`);
  }

  // 2. Check memory store fallback
  const memEntry = inMemoryOtpStore.get(normalizedEmail);
  if (memEntry) {
    if (Date.now() > memEntry.expiresAt) {
      inMemoryOtpStore.delete(normalizedEmail);
      return false;
    }
    return memEntry.otp === cleanInput;
  }

  return false;
}

/**
 * Removes/invalidates OTP after successful verification or password change
 * @param {string} email 
 */
export async function invalidateOtp(email) {
  const normalizedEmail = email.trim().toLowerCase();
  const redisKey = `otp:reset_password:${normalizedEmail}`;

  inMemoryOtpStore.delete(normalizedEmail);

  try {
    if (redisClient && redisClient.status === 'ready') {
      await redisClient.del(redisKey);
    }
  } catch (err) {
    console.warn(`⚠️ Failed to delete OTP key in Redis: ${err.message}`);
  }
}

export default {
  generateOtp,
  storeOtp,
  verifyOtp,
  invalidateOtp,
};
