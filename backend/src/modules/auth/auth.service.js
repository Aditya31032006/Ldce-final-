import argon2 from 'argon2';
import * as authRepo from './auth.repository.js';
import { issueAccessToken } from '../../shared/utils/token.util.js';

export async function registerUser({ email, fullName, phone, password }) {
  const hash = password ? await argon2.hash(password) : null;
  const user = await authRepo.createUserTx(email, fullName, phone, hash);
  return user;
}

export async function verifyLogin(email, password) {
  const user = await authRepo.findUserByEmail(email);
  if (!user) {
    const err = new Error("Invalid credentials");
    err.status = 401;
    throw err;
  }
  
  if (!user.password_hash) {
    const err = new Error("Please login with Google");
    err.status = 401;
    throw err;
  }

  const isValid = await argon2.verify(user.password_hash, password);
  if (!isValid) {
    const err = new Error("Invalid credentials");
    err.status = 401;
    throw err;
  }

  if (!user.is_active) {
    const err = new Error("Account is inactive");
    err.status = 403;
    throw err;
  }

  return user;
}

export async function generateTokenForUser(user, clubId = null, role = null) {
  // If no specific club is targeted yet, we might not set it.
  // The user can choose a club later.
  return issueAccessToken({
    id: user.id,
    clubId: clubId, 
    role: role || 'public', // default role
  });
}
