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

    let resolvedRole = req.user.role || 'public';
    let resolvedClubId = req.user.clubId || null;

    if (clubs.length > 0) {
      const rolePriority = { owner: 1, manager: 2, admin: 3, front_desk: 4, shop_staff: 5, bar_staff: 6, kitchen: 7, member: 8, public: 99 };
      const sorted = [...clubs].sort((a, b) => (rolePriority[a.role] || 99) - (rolePriority[b.role] || 99));

      if (!resolvedClubId || resolvedRole === 'public') {
        resolvedClubId = sorted[0].club_id;
        resolvedRole = sorted[0].role;
      } else {
        const activeClub = clubs.find(c => c.club_id === resolvedClubId);
        if (activeClub && activeClub.role) {
          resolvedRole = activeClub.role;
        }
      }
    }

    return res.status(STATUS_CODES.OK).json({
      success: true,
      user,
      role: resolvedRole,
      clubId: resolvedClubId,
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

/**
 * Update Profile Avatar
 */
export async function updateAvatarController(req, res, next) {
  try {
    const avatarUrl = req.body.avatarUrl || req.body.avatar_url || req.body.avatar || req.body.image || req.body.base64;
    if (!avatarUrl) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'No avatar image data provided in request body',
      });
    }
    const targetUserId = (req.body.userId && ['owner', 'admin', 'manager'].includes(req.user.role))
      ? req.body.userId
      : req.user.id;
    const updatedUser = await authService.updateUserAvatar(targetUserId, avatarUrl);
    delete updatedUser.password_hash;
    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: 'Profile picture updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
}


/**
 * Delete Profile Avatar
 */
export async function deleteAvatarController(req, res, next) {
  try {
    const updatedUser = await authService.deleteUserAvatar(req.user.id);
    delete updatedUser.password_hash;
    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: 'Profile picture removed successfully',
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Request OTP for Password Reset
 */
export async function requestPasswordResetOtpController(req, res, next) {
  try {
    // If authenticated, we can use req.user.email; else from body
    const email = req.user?.email || req.body.email;
    if (!email) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'Account email is required to request OTP',
      });
    }

    const result = await authService.requestPasswordResetOtp(email);
    return res.status(STATUS_CODES.OK).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Reset Password using OTP
 */
export async function resetPasswordWithOtpController(req, res, next) {
  try {
    const email = req.user?.email || req.body.email;
    const { otp, newPassword } = req.body;

    if (!email) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'Email is required',
      });
    }
    if (!otp) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'Verification OTP code is required',
      });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'New password must be at least 6 characters long',
      });
    }

    const result = await authService.resetPasswordWithOtp({
      email,
      otp,
      newPassword,
    });

    return res.status(STATUS_CODES.OK).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Set password for OAuth user who does not have a local password yet
 */
export async function setPasswordController(req, res, next) {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const updatedUser = await authService.setUserPasswordForOAuth(req.user.id, password);
    delete updatedUser.password_hash;

    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: 'Password created successfully! You can now log in using email & password.',
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Change password for authenticated user by verifying old password
 */
export async function changePasswordController(req, res, next) {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'Current password is required',
      });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'New password must be at least 6 characters long',
      });
    }

    const updatedUser = await authService.changeUserPassword(req.user.id, oldPassword, newPassword);
    delete updatedUser.password_hash;

    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: 'Password changed successfully!',
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
}
