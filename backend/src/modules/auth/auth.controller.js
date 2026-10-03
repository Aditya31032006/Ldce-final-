import * as authService from './auth.service.js';
import * as authRepo from './auth.repository.js';
import { setAuthCookie, clearAuthCookie } from '../../shared/utils/cookie.util.js';
import { STATUS_CODES, MESSAGES } from '../../constants/index.js';
import config from '../../config/config.js';

export async function registerController(req, res, next) {
  try {
    const { email, fullName, phone, password } = req.body;
    if (!email || !fullName || !password) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        message: "Email, fullName, and password are required"
      });
    }

    const user = await authService.registerUser({ email, fullName, phone, password });
    
    // Auto-login after registration
    const token = await authService.generateTokenForUser(user);
    setAuthCookie(res, token);
    
    // omit password_hash from response
    delete user.password_hash;
    
    return res.status(STATUS_CODES.CREATED).json({
      success: true,
      message: MESSAGES.AUTH.SIGNUP_SUCCESS,
      user,
      token,
    });
  } catch (error) {
    next(error);
  }
}

export async function loginController(req, res, next) {
  try {
    const { email, password, clubId } = req.body;
    if (!email || !password) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        message: "Email and password are required"
      });
    }

    const user = await authService.verifyLogin(email, password);
    
    let role = 'public';
    let resolvedClubId = clubId || null;

    if (clubId) {
      // Validate if user belongs to this club and get their role
      const userClubs = await authRepo.getUserClubs(user.id);
      const clubContext = userClubs.find(c => c.club_id === clubId);
      if (clubContext) {
        role = clubContext.role;
      } else {
        return res.status(STATUS_CODES.FORBIDDEN).json({
          message: MESSAGES.AUTH.CLUB_NOT_ASSOCIATED
        });
      }
    }

    const token = await authService.generateTokenForUser(user, resolvedClubId, role);
    setAuthCookie(res, token);

    delete user.password_hash;
    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: MESSAGES.AUTH.LOGIN_SUCCESS,
      user,
      role,
      clubId: resolvedClubId,
      token,
    });
  } catch (error) {
    next(error);
  }
}

export async function logoutController(req, res, next) {
  try {
    clearAuthCookie(res);
    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: MESSAGES.AUTH.LOGOUT_SUCCESS
    });
  } catch (error) {
    next(error);
  }
}

export async function getMeController(req, res, next) {
  try {
    const user = await authRepo.findUserById(req.user.id);
    if (!user) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        message: MESSAGES.AUTH.USER_NOT_FOUND
      });
    }
    return res.status(STATUS_CODES.OK).json({
      user,
      role: req.user.role,
      clubId: req.user.clubId
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Handles callback after successful Google OAuth authentication
 */
export async function googleCallbackController(req, res, next) {
  try {
    if (!req.user) {
      return res.redirect(`${config.CLIENT_URL}/login?error=${encodeURIComponent(MESSAGES.AUTH.GOOGLE_AUTH_FAILED)}`);
    }

    const token = await authService.generateTokenForUser(req.user);
    setAuthCookie(res, token);

    // Redirect to frontend dashboard or return auth state
    const redirectUrl = new URL('/dashboard', config.CLIENT_URL);
    redirectUrl.searchParams.set('auth', 'success');
    return res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return res.redirect(`${config.CLIENT_URL}/login?error=oauth_error`);
  }
}
