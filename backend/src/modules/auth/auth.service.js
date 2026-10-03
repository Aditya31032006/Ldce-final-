import argon2 from 'argon2';
import * as authRepo from './auth.repository.js';
import { issueAccessToken } from '../../shared/utils/token.util.js';
import { STATUS_CODES, MESSAGES } from '../../constants/index.js';
import { generateOtp, storeOtp, verifyOtp, invalidateOtp } from '../../utils/otp.util.js';
import { addWelcomeEmailJob, addOtpEmailJob } from '../../jobs/emailQueue.js';
import { hashPassword, verifyPassword } from '../../utils/password.util.js';

/**
 * Auth Service
 * Layer 2: Business logic for direct registration/login, OAuth onboarding, and profile completion
 */

/**
 * Checks whether user profile has all required fields.
 * If phone is missing (common with Google OAuth), profile is marked incomplete.
 */
export function checkProfileCompletion(user) {
  if (!user) {
    return { isComplete: false, missingFields: ['phone'] };
  }

  const missingFields = [];
  const hasPhone = typeof user.phone === 'string' && user.phone.trim().length >= 7;
  if (!hasPhone) {
    missingFields.push('phone');
  }

  const hasName = typeof user.full_name === 'string' && user.full_name.trim().length >= 2;
  if (!hasName) {
    missingFields.push('full_name');
  }

  return {
    isComplete: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Direct User Registration (when user enters all fields)
 */
export async function registerDirectUser({ email, fullName, phone, password, avatarUrl = null }) {
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await authRepo.findUserByEmail(normalizedEmail);
  if (existing) {
    const error = new Error(MESSAGES.AUTH.ALREADY_EXISTS);
    error.status = STATUS_CODES.CONFLICT;
    throw error;
  }

  const hash = await argon2.hash(password);

  const user = await authRepo.createUserWithCredentialsTx({
    email: normalizedEmail,
    fullName: fullName.trim(),
    phone: phone ? phone.trim() : null,
    passwordHash: hash,
    avatarUrl: avatarUrl || null,
    emailVerifiedAt: new Date(),
  });

  // Dispatch welcome onboarding email asynchronously via BullMQ
  addWelcomeEmailJob({
    email: user.email,
    name: user.full_name,
  }).catch((err) => {
    console.error('Failed to dispatch welcome email:', err.message);
  });

  return user;
}

/**
  * Direct Club / Cafe Facility Owner Registration
  * Registers the owner user and executes app.register_club stored procedure
  */
export async function registerClubOwnerUser({
  email,
  fullName,
  phone,
  password,
  clubName,
  slug,
  city = null,
  timezone = 'Asia/Kolkata',
  avatarUrl = null,
}) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');

  const existing = await authRepo.findUserByEmail(normalizedEmail);
  if (existing) {
    const error = new Error('An account with this email already exists. Please log in.');
    error.status = STATUS_CODES.CONFLICT;
    throw error;
  }

  const hash = await argon2.hash(password);

  const { user, clubId, slug: createdSlug } = await authRepo.createClubOwnerWithCredentialsTx({
    email: normalizedEmail,
    fullName: fullName.trim(),
    phone: phone.trim(),
    passwordHash: hash,
    clubName: clubName.trim(),
    slug: normalizedSlug,
    city: city ? city.trim() : null,
    timezone: timezone || 'Asia/Kolkata',
    avatarUrl: avatarUrl || null,
  });

  // Dispatch welcome onboarding email asynchronously via BullMQ
  addWelcomeEmailJob({
    email: user.email,
    name: user.full_name,
    clubName: clubName.trim(),
  }).catch((err) => {
    console.error('Failed to dispatch welcome email:', err.message);
  });

  return {
    user,
    clubId,
    slug: createdSlug,
    role: 'owner',
  };
}

/**
 * Direct User Login (email + password)
 */
export async function verifyDirectLogin(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await authRepo.findUserByEmail(normalizedEmail);

  if (!user) {
    const err = new Error(MESSAGES.AUTH.INVALID_CREDENTIALS);
    err.status = STATUS_CODES.UNAUTHORIZED;
    throw err;
  }

  if (!user.password_hash) {
    const err = new Error(MESSAGES.AUTH.GOOGLE_ACCOUNT_ONLY);
    err.status = STATUS_CODES.BAD_REQUEST;
    throw err;
  }

  const isValid = await argon2.verify(user.password_hash, password);
  if (!isValid) {
    const err = new Error(MESSAGES.AUTH.INVALID_CREDENTIALS);
    err.status = STATUS_CODES.UNAUTHORIZED;
    throw err;
  }

  if (!user.is_active) {
    const err = new Error(MESSAGES.AUTH.ACCOUNT_INACTIVE);
    err.status = STATUS_CODES.FORBIDDEN;
    throw err;
  }

  // Update last login
  await authRepo.updateLastLogin(user.id);

  return user;
}

/**
 * Handles user authenticated via Google OAuth.
 * Creates new user if not found, or syncs existing user details.
 */
export async function handleGoogleAuthUser(profile) {
  const email = profile.emails?.[0]?.value?.trim().toLowerCase();
  const fullName = profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim() || 'Google User';
  const avatarUrl = profile.photos?.[0]?.value || null;

  if (!email) {
    throw new Error('Google profile did not provide an email address');
  }

  let user = await authRepo.findUserByEmail(email);
  let isNewUser = false;

  if (!user) {
    // New Google OAuth User Registration
    user = await authRepo.createOAuthUserTx({
      email,
      fullName,
      avatarUrl,
    });
    isNewUser = true;

    // Send Welcome Email via BullMQ
    addWelcomeEmailJob({
      email,
      name: fullName,
    }).catch((err) => {
      console.error('Failed to send welcome email for Google user:', err.message);
    });
  } else {
    // Existing user logging in via Google: sync avatar & last login
    user = await authRepo.syncOAuthUser(user.id, { avatarUrl });
  }

  return { user, isNewUser };
}

/**
 * Completes user profile after OAuth registration (or direct registration updates)
 */
export async function setupUserProfile(userId, { phone, fullName, avatarUrl, password }) {
  const user = await authRepo.findUserById(userId);
  if (!user) {
    const err = new Error(MESSAGES.AUTH.USER_NOT_FOUND);
    err.status = STATUS_CODES.NOT_FOUND;
    throw err;
  }

  // Update profile fields
  const updatedUser = await authRepo.updateUserProfile(userId, {
    phone,
    fullName: fullName || user.full_name,
    avatarUrl: avatarUrl || user.avatar_url,
  });

  // Optionally set a local password if provided
  if (password && password.trim().length >= 6) {
    const passwordHash = await argon2.hash(password.trim());
    await authRepo.setUserPassword(userId, passwordHash);
  }

  return updatedUser;
}

/**
 * Updates user profile picture (avatar_url)
 */
export async function updateUserAvatar(userId, avatarUrl) {
  const user = await authRepo.findUserById(userId);
  if (!user) {
    const err = new Error(MESSAGES.AUTH.USER_NOT_FOUND);
    err.status = STATUS_CODES.NOT_FOUND;
    throw err;
  }
  await authRepo.updateUserAvatar(userId, avatarUrl);
  return await authRepo.findUserById(userId);
}

/**
 * Deletes user profile picture (sets avatar_url to null)
 */
export async function deleteUserAvatar(userId) {
  const user = await authRepo.findUserById(userId);
  if (!user) {
    const err = new Error(MESSAGES.AUTH.USER_NOT_FOUND);
    err.status = STATUS_CODES.NOT_FOUND;
    throw err;
  }
  await authRepo.updateUserAvatar(userId, null);
  return await authRepo.findUserById(userId);
}

/**
 * Issues JWT access token for user
 */
export async function generateTokenForUser(user, clubId = null, role = null) {
  return issueAccessToken({
    id: user.id,
    clubId: clubId || null,
    role: role || 'public',
  });
}

// Aliases for compatibility
export const registerUser = registerDirectUser;
export const verifyLogin = verifyDirectLogin;

/**
 * Sets password for OAuth user who doesn't have a local password yet
 */
export async function setUserPasswordForOAuth(userId, password) {
  if (!password || password.length < 6) {
    const err = new Error("Password must be at least 6 characters long");
    err.status = STATUS_CODES.BAD_REQUEST;
    throw err;
  }
  const passwordHash = await hashPassword(password);
  await authRepo.setUserPassword(userId, passwordHash);
  const updatedUser = await authRepo.findUserById(userId);
  return updatedUser;
}

/**
 * Changes user password by verifying their old password first
 */
export async function changeUserPassword(userId, oldPassword, newPassword) {
  if (!oldPassword) {
    const err = new Error("Current password is required");
    err.status = STATUS_CODES.BAD_REQUEST;
    throw err;
  }
  if (!newPassword || newPassword.length < 6) {
    const err = new Error("New password must be at least 6 characters long");
    err.status = STATUS_CODES.BAD_REQUEST;
    throw err;
  }

  const credentials = await authRepo.getUserCredentials(userId);
  if (!credentials || !credentials.password_hash) {
    const err = new Error("No existing password found. Please use Add New Password.");
    err.status = STATUS_CODES.BAD_REQUEST;
    throw err;
  }

  const isOldValid = await verifyPassword(oldPassword, credentials.password_hash);
  if (!isOldValid) {
    const err = new Error("Current password is incorrect");
    err.status = STATUS_CODES.BAD_REQUEST;
    throw err;
  }

  const newHash = await hashPassword(newPassword);
  await authRepo.setUserPassword(userId, newHash);
  const updatedUser = await authRepo.findUserById(userId);
  return updatedUser;
}


/**
 * Requests an OTP for resetting user password
 */
export async function requestPasswordResetOtp(email) {
  if (!email) {
    const err = new Error("Email is required");
    err.status = STATUS_CODES.BAD_REQUEST;
    throw err;
  }
  const normalizedEmail = email.trim().toLowerCase();
  const user = await authRepo.findUserByEmail(normalizedEmail);
  if (!user) {
    const err = new Error(MESSAGES.AUTH.USER_NOT_FOUND || "User not found");
    err.status = STATUS_CODES.NOT_FOUND;
    throw err;
  }

  // Generate 6-digit numeric OTP and store in Redis with 10min TTL
  const otp = generateOtp(6);
  await storeOtp(normalizedEmail, otp, 600);

  // Dispatch email job via BullMQ
  await addOtpEmailJob({
    email: normalizedEmail,
    otp,
    purpose: 'Password Reset',
  });

  return {
    success: true,
    message: `Verification OTP has been sent to ${normalizedEmail}`,
    email: normalizedEmail,
  };
}

/**
 * Verifies OTP and resets user password using Argon2
 */
export async function resetPasswordWithOtp({ email, otp, newPassword }) {
  if (!email || !otp || !newPassword) {
    const err = new Error("Email, OTP code, and new password are required");
    err.status = STATUS_CODES.BAD_REQUEST;
    throw err;
  }

  if (newPassword.length < 6) {
    const err = new Error("Password must be at least 6 characters long");
    err.status = STATUS_CODES.BAD_REQUEST;
    throw err;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const isValidOtp = await verifyOtp(normalizedEmail, otp);
  if (!isValidOtp) {
    const err = new Error("Invalid or expired verification code");
    err.status = STATUS_CODES.BAD_REQUEST;
    throw err;
  }

  const user = await authRepo.findUserByEmail(normalizedEmail);
  if (!user) {
    const err = new Error(MESSAGES.AUTH.USER_NOT_FOUND || "User not found");
    err.status = STATUS_CODES.NOT_FOUND;
    throw err;
  }

  // Hash new password using Argon2
  const passwordHash = await hashPassword(newPassword);
  await authRepo.setUserPassword(user.id, passwordHash);

  // Remove OTP from Redis
  await invalidateOtp(normalizedEmail);

  return {
    success: true,
    message: "Password has been updated successfully",
  };
}

