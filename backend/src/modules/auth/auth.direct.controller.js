import * as authService from './auth.service.js';
import * as authRepo from './auth.repository.js';
import { setAuthCookie, clearAuthCookie } from '../../shared/utils/cookie.util.js';
import { STATUS_CODES, MESSAGES } from '../../constants/index.js';

/**
 * Auth Direct Controller
 * Layer 1: Controller for direct email/password registration, login, logout, and profile setup
 */

/**
 * Direct User Registration
 * When users register directly by entering all fields (fullName, email, phone, password)
 */
export async function directRegisterController(req, res, next) {
  try {
    const { email, fullName, phone, password, avatarUrl } = req.body;

    const user = await authService.registerDirectUser({
      email,
      fullName,
      phone,
      password,
      avatarUrl,
    });

    // Auto-login: issue JWT & set HTTP-only cookie
    const token = await authService.generateTokenForUser(user);
    setAuthCookie(res, token);

    // Remove password_hash from response if present
    delete user.password_hash;

    return res.status(STATUS_CODES.CREATED).json({
      success: true,
      message: MESSAGES.AUTH.SIGNUP_SUCCESS,
      user,
      token,
      isProfileComplete: true,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Direct Club / Cafe Facility Registration
 * Creates owner user + sets up club shell + assigns owner role via app.register_club
 */
export async function directRegisterClubController(req, res, next) {
  try {
    const { email, fullName, phone, password, clubName, slug, city, timezone, avatarUrl } = req.body;

    const result = await authService.registerClubOwnerUser({
      email,
      fullName,
      phone,
      password,
      clubName,
      slug,
      city,
      timezone,
      avatarUrl,
    });

    const token = await authService.generateTokenForUser(result.user, result.clubId, result.role);
    setAuthCookie(res, token);

    delete result.user.password_hash;
    const userClubs = await authRepo.getUserClubs(result.user.id);

    return res.status(STATUS_CODES.CREATED).json({
      success: true,
      message: 'Club registered successfully! You are now the Administrator.',
      user: result.user,
      clubId: result.clubId,
      role: result.role,
      slug: result.slug,
      clubs: userClubs,
      token,
      isProfileComplete: true,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Direct User Login (email + password)
 */
export async function directLoginController(req, res, next) {
  try {
    const { email, password, clubId } = req.body;

    const user = await authService.verifyDirectLogin(email, password);
    const userClubs = await authRepo.getUserClubs(user.id);

    let role = 'public';
    let resolvedClubId = clubId || null;

    if (clubId) {
      const clubContext = userClubs.find((c) => c.club_id === clubId);
      if (clubContext) {
        role = clubContext.role;
      } else {
        return res.status(STATUS_CODES.FORBIDDEN).json({
          success: false,
          message: MESSAGES.AUTH.CLUB_NOT_ASSOCIATED,
        });
      }
    } else if (userClubs.length > 0) {
      // Prioritize owner > manager > other staff > member
      const rolePriority = { owner: 1, manager: 2, front_desk: 3, bar_staff: 4, kitchen: 5, shop_staff: 6, member: 7 };
      const sorted = [...userClubs].sort((a, b) => (rolePriority[a.role] || 99) - (rolePriority[b.role] || 99));
      resolvedClubId = sorted[0].club_id;
      role = sorted[0].role;
    }

    const token = await authService.generateTokenForUser(user, resolvedClubId, role);
    setAuthCookie(res, token);

    delete user.password_hash;

    const profileStatus = authService.checkProfileCompletion(user);

    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: MESSAGES.AUTH.LOGIN_SUCCESS,
      user,
      role,
      clubId: resolvedClubId,
      clubs: userClubs,
      token,
      isProfileComplete: profileStatus.isComplete,
      missingFields: profileStatus.missingFields,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Direct User Logout
 */
export async function logoutController(req, res, next) {
  try {
    clearAuthCookie(res);
    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: MESSAGES.AUTH.LOGOUT_SUCCESS,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get Current Authenticated User Profile
 */
export async function getMeController(req, res, next) {
  try {
    const user = await authRepo.findUserById(req.user.id);
    if (!user) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: MESSAGES.AUTH.USER_NOT_FOUND,
      });
    }

    delete user.password_hash;
    const profileStatus = authService.checkProfileCompletion(user);
    const clubs = await authRepo.getUserClubs(user.id);

    return res.status(STATUS_CODES.OK).json({
      success: true,
      user,
      role: req.user.role || 'public',
      clubId: req.user.clubId || null,
      clubs,
      isProfileComplete: profileStatus.isComplete,
      missingFields: profileStatus.missingFields,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Setup Profile Controller
 * Called when a user (e.g. redirected from Google OAuth) adds remaining fields (phone, etc.)
 */
export async function setupProfileController(req, res, next) {
  try {
    const userId = req.user.id;
    const { phone, fullName, avatarUrl, password } = req.body;

    const updatedUser = await authService.setupUserProfile(userId, {
      phone,
      fullName,
      avatarUrl,
      password,
    });

    delete updatedUser.password_hash;
    const profileStatus = authService.checkProfileCompletion(updatedUser);

    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: 'Profile setup completed successfully!',
      user: updatedUser,
      isProfileComplete: profileStatus.isComplete,
    });
  } catch (error) {
    next(error);
  }
}
