import argon2 from 'argon2';
import * as authRepo from './auth.repository.js';
import { issueAccessToken } from '../../shared/utils/token.util.js';
import { sendWelcomeEmail } from '../../services/mail.service.js';
import { STATUS_CODES, MESSAGES } from '../../constants/index.js';

export async function registerUser({ email, fullName, phone, password }) {
  const hash = password ? await argon2.hash(password) : null;
  const user = await authRepo.createUserTx(email, fullName, phone, hash);

  // Send onboarding welcome email in background
  sendWelcomeEmail({
    toEmail: email,
    name: fullName || 'Member',
  }).catch((err) => {
    console.error('Failed to dispatch welcome email:', err.message);
  });

  return user;
}

export async function verifyLogin(email, password) {
  const user = await authRepo.findUserByEmail(email);
  if (!user) {
    const err = new Error(MESSAGES.AUTH.INVALID_CREDENTIALS);
    err.status = STATUS_CODES.UNAUTHORIZED;
    throw err;
  }
  
  if (!user.password_hash) {
    const err = new Error(MESSAGES.AUTH.GOOGLE_ACCOUNT_ONLY);
    err.status = STATUS_CODES.UNAUTHORIZED;
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

  return user;
}

export async function generateTokenForUser(user, clubId = null, role = null) {
  return issueAccessToken({
    id: user.id,
    clubId: clubId, 
    role: role || 'public',
  });
}
