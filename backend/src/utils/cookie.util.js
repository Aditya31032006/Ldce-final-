import jwt from 'jsonwebtoken';
import config from '../config/config.js';

export const COOKIE_NAME = 'token';

/**
 * Returns options for setting HTTP-only authentication cookies
 * @param {number} maxAgeMs - Expiry in milliseconds (default 7 days)
 */
export function getAccessCookieOptions(maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
  const isProd = config.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: maxAgeMs,
    path: '/',
  };
}

/**
 * Returns options for clearing HTTP-only authentication cookies
 */
export function getClearCookieOptions() {
  const isProd = config.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  };
}

/**
 * Signs a JWT containing user identity
 * @param {Object} user - User document or payload object
 * @param {string} [expiresIn="7d"] - Token lifetime
 */
export function signToken(user, expiresIn = '7d') {
  const payload = {
    id: user.id || user._id,
    email: user.email,
    name: user.full_name || user.name,
    role: user.role || 'public',
    clubId: user.clubId || user.club_id || null,
  };
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn });
}

/**
 * Verifies a JWT token
 * @param {string} token
 */
export function verifyToken(token) {
  return jwt.verify(token, config.JWT_SECRET);
}

/**
 * Helper to set HTTP-only authentication cookie on response
 * @param {Object} res - Express response object
 * @param {string} token - Signed JWT token
 */
export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, getAccessCookieOptions());
}

/**
 * Helper to clear HTTP-only authentication cookie on response
 * @param {Object} res - Express response object
 */
export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, getClearCookieOptions());
}

export default {
  COOKIE_NAME,
  getAccessCookieOptions,
  getClearCookieOptions,
  signToken,
  verifyToken,
  setAuthCookie,
  clearAuthCookie,
};
