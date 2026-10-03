import { config } from '../../config/env.js';

export const COOKIE_NAME = 'token';

export function getAccessCookieOptions(maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
    const isProd = config.nodeEnv === 'production';
    return {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: maxAgeMs,
        path: '/',
    };
}

export function getClearCookieOptions() {
    const isProd = config.nodeEnv === 'production';
    return {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        path: '/',
    };
}

export function setAuthCookie(res, token) {
    res.cookie(COOKIE_NAME, token, getAccessCookieOptions());
}

export function clearAuthCookie(res) {
    res.clearCookie(COOKIE_NAME, getClearCookieOptions());
}
