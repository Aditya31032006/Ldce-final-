import jwt from 'jsonwebtoken';
import config from '../config/config.js';

export const COOKIE_NAME = 'token';

/**
 * Returns options for setting HTTP-only authentication cookies
 * @param {number} maxAgeMs - Expiry in milliseconds (default 7 days)
 */
export function getAccessCookieOptions(maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
    const isProd = process.env.NODE_ENV === 'production';
    return {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: maxAgeMs,
        path: '/',
    };
}

/**
 * Signs a JWT containing vendor identity
 * @param {Object} vendor - Vendor document or object
 * @param {string} [expiresIn="7d"] - Token lifetime
 */
export function signToken(vendor, expiresIn = '7d') {
    const payload = {
        id: vendor._id || vendor.id,
        email: vendor.email,
        name: vendor.name,
    };
    return jwt.sign(payload, config.JWT_SECRET, { expiresIn });
}

/**
 * Verifies a JWT token
 * @param {string} token
 */
export function verifyToken(token) {
    try {
        return jwt.verify(token, config.JWT_SECRET);
    } catch (error) {
        throw error;
    }
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
    res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
    });
}