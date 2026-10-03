import argon2 from 'argon2';
import crypto from 'crypto';

/**
 * Hashes a plaintext password using Argon2id
 * @param {string} password - Plaintext password
 * @returns {Promise<string>} Hashed password
 */
export const hashPassword = async (password) => {
  try {
    if (!password) throw new Error("Password must not be empty");
    return await argon2.hash(password);
  } catch (error) {
    console.error("Error in hashPassword:", error);
    throw error;
  }
};

/**
 * Verifies a plaintext password against a stored hash
 * @param {string} password - Plaintext password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if matching, false otherwise
 */
export const verifyPassword = async (password, hash) => {
  try {
    if (!password || !hash) return false;
    return await argon2.verify(hash, password);
  } catch (error) {
    console.error("Error in verifyPassword:", error);
    return false;
  }
};

/**
 * Generate a random secure temporary password
 * @param {number} [length=10]
 * @returns {string}
 */
export const generateRandomPassword = (length = 10) => {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghijkmnpqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '@#$!%*';
  const allChars = uppercase + lowercase + numbers + symbols;

  let password = '';
  password += uppercase[crypto.randomInt(0, uppercase.length)];
  password += lowercase[crypto.randomInt(0, lowercase.length)];
  password += numbers[crypto.randomInt(0, numbers.length)];
  password += symbols[crypto.randomInt(0, symbols.length)];

  for (let i = 4; i < length; i++) {
    password += allChars[crypto.randomInt(0, allChars.length)];
  }

  return password.split('').sort(() => 0.5 - Math.random()).join('');
};

/**
 * Generates a cryptographically secure 6-digit numeric OTP
 * @param {number} [length=6]
 * @returns {string}
 */
export const generateOtp = (length = 6) => {
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += crypto.randomInt(0, 10).toString();
  }
  return otp;
};

export default {
  hashPassword,
  verifyPassword,
  generateRandomPassword,
  generateOtp,
};
