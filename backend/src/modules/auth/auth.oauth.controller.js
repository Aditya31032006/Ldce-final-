import * as authService from './auth.service.js';
import * as authRepo from './auth.repository.js';
import { setAuthCookie } from '../../shared/utils/cookie.util.js';
import { STATUS_CODES, MESSAGES } from '../../constants/index.js';
import config from '../../config/config.js';

/**
 * Auth OAuth Controller
 * Layer 1: Controller for Google OAuth authentication flow, profile completeness verification, and redirection
 */

/**
 * Handles callback after successful Google OAuth authentication
 * Checks if user is missing fields not provided by Google (e.g. phone)
 * If fields are missing -> redirects to /setup-profile
 * If profile is complete -> redirects to /dashboard
 */
export async function googleAuthCallbackController(req, res, next) {
  try {
    const user = req.user;

    if (!user) {
      const failureUrl = new URL('/login', config.CLIENT_URL);
      failureUrl.searchParams.set('error', MESSAGES.AUTH.GOOGLE_AUTH_FAILED);
      return res.redirect(failureUrl.toString());
    }

    // Resolve role & clubId from user's club memberships (same logic as direct login)
    const userClubs = await authRepo.getUserClubs(user.id);
    let role = 'public';
    let resolvedClubId = null;

    if (userClubs && userClubs.length > 0) {
      const rolePriority = { owner: 1, manager: 2, front_desk: 3, bar_staff: 4, kitchen: 5, shop_staff: 6, member: 7 };
      const sorted = [...userClubs].sort((a, b) => (rolePriority[a.role] || 99) - (rolePriority[b.role] || 99));
      resolvedClubId = sorted[0].club_id;
      role = sorted[0].role;
    }

    // Generate JWT Access Token with correct role + clubId
    const token = await authService.generateTokenForUser(user, resolvedClubId, role);

    // Set secure HTTP-only cookie
    setAuthCookie(res, token);

    // Check if user has all required fields (Google doesn't provide phone)
    const profileStatus = authService.checkProfileCompletion(user);

    if (!profileStatus.isComplete) {
      // Profile is incomplete -> redirect to setup profile page where user adds remaining fields
      const setupUrl = new URL('/setup-profile', config.CLIENT_URL);
      setupUrl.searchParams.set('requiresSetup', 'true');
      setupUrl.searchParams.set('token', token);
      setupUrl.searchParams.set('email', user.email);
      setupUrl.searchParams.set('name', user.full_name || '');
      if (user.avatar_url) setupUrl.searchParams.set('avatar', user.avatar_url);

      return res.redirect(setupUrl.toString());
    }

    // Role-aware dashboard redirect
    const isStaff = !['public', 'member'].includes(role);
    const dashboardUrl = new URL(isStaff ? '/dashboard' : '/user/dashboard', config.CLIENT_URL);
    dashboardUrl.searchParams.set('auth', 'success');
    return res.redirect(dashboardUrl.toString());
  } catch (error) {
    console.error('Error in googleAuthCallbackController:', error);
    const errorUrl = new URL('/login', config.CLIENT_URL);
    errorUrl.searchParams.set('error', 'oauth_callback_error');
    return res.redirect(errorUrl.toString());
  }
}

/**
 * Handles Google OAuth authentication failure
 */
export function googleAuthFailureController(req, res) {
  if (req.accepts('html')) {
    const failureUrl = new URL('/login', config.CLIENT_URL);
    failureUrl.searchParams.set('error', MESSAGES.AUTH.GOOGLE_AUTH_FAILED);
    return res.redirect(failureUrl.toString());
  }

  return res.status(STATUS_CODES.UNAUTHORIZED).json({
    success: false,
    message: MESSAGES.AUTH.GOOGLE_AUTH_FAILED,
  });
}

/**
 * Provides OAuth configuration status
 */
export function getOAuthStatusController(req, res) {
  const isGoogleConfigured = Boolean(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET);
  return res.status(STATUS_CODES.OK).json({
    success: true,
    providers: {
      google: {
        enabled: isGoogleConfigured,
        clientId: isGoogleConfigured ? config.GOOGLE_CLIENT_ID : null,
        callbackUrl: config.GOOGLE_CALLBACK_URL,
      },
    },
  });
}
