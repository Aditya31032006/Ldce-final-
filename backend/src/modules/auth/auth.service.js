import argon2 from 'argon2';
import * as authRepo from './auth.repository.js';
import { issueAccessToken } from '../../shared/utils/token.util.js';
import { sendWelcomeEmail } from '../../services/mail.service.js';
import { STATUS_CODES, MESSAGES } from '../../constants/index.js';

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

  // Dispatch welcome onboarding email asynchronously
  sendWelcomeEmail({
    toEmail: user.email,
    name: user.full_name,
  }).catch((err) => {
    console.error('Failed to dispatch welcome email:', err.message);
  });

  return user;
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

    // Send Welcome Email
    sendWelcomeEmail({
      toEmail: email,
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
