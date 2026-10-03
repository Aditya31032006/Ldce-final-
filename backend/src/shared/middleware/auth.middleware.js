import { verifyJwt } from '../utils/token.util.js';
import { STATUS_CODES, MESSAGES } from '../../constants/index.js';
import * as authRepo from '../../modules/auth/auth.repository.js';

/**
 * Authentication Middleware
 * Extracts JWT token from cookies or Authorization header, validates signature,
 * and attaches user session context to req.user.
 */
export async function verifyToken(req, res, next) {
  try {
    let token = req.cookies?.token;

    if (!token && req.headers?.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      return res.status(STATUS_CODES.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.AUTH.UNAUTHORIZED || 'Authentication required',
      });
    }

    const payload = verifyJwt(token);
    if (!payload || !payload.id) {
      return res.status(STATUS_CODES.UNAUTHORIZED).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    // Verify user is still active in database
    const user = await authRepo.findUserById(payload.id);
    if (!user) {
      return res.status(STATUS_CODES.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.AUTH.USER_NOT_FOUND,
      });
    }

    if (!user.is_active) {
      return res.status(STATUS_CODES.FORBIDDEN).json({
        success: false,
        message: MESSAGES.AUTH.ACCOUNT_INACTIVE,
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: payload.role || 'public',
      clubId: payload.clubId || null,
    };

    next();
  } catch (err) {
    return res.status(STATUS_CODES.UNAUTHORIZED).json({
      success: false,
      message: 'Invalid or expired token',
      error: err.message,
    });
  }
}

/**
 * Role-Based Access Control Middleware
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(STATUS_CODES.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.AUTH.UNAUTHORIZED,
      });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(STATUS_CODES.FORBIDDEN).json({
        success: false,
        message: MESSAGES.AUTH.FORBIDDEN,
      });
    }
    next();
  };
}

// Aliases
export const authenticate = verifyToken;
export default { verifyToken, requireRole, authenticate };
