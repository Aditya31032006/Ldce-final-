import { Router } from 'express';
import {
  directRegisterController,
  directRegisterClubController,
  directLoginController,
  logoutController,
  getMeController,
  setupProfileController,
} from './auth.direct.controller.js';
import {
  googleAuthCallbackController,
  googleAuthFailureController,
  getOAuthStatusController,
} from './auth.oauth.controller.js';
import { verifyToken } from '../../shared/middleware/auth.middleware.js';
import {
  directSignupValidation,
  clubSignupValidation,
  directLoginValidation,
  setupProfileValidation,
} from '../../validation/index.js';
import passport from '../../config/passport.js';
import config from '../../config/config.js';

const router = Router();

// ==========================================
// 1. Direct Authentication (All Fields Manual)
// ==========================================

// Register as Normal Player / Member
router.post('/register', directSignupValidation, directRegisterController);

// Register as Club / Cafe Facility Owner & Admin (executes app.register_club)
router.post('/register-club', clubSignupValidation, directRegisterClubController);

// Login directly using email & password
router.post('/login', directLoginValidation, directLoginController);

// Logout and clear auth cookies
router.post('/logout', logoutController);

// ==========================================
// 2. Google OAuth Flow
// ==========================================

// OAuth configuration status endpoint
router.get('/oauth/config', getOAuthStatusController);

if (config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET) {
  // Initiate Google OAuth consent screen
  router.get(
    '/google',
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      session: false,
    })
  );

  // Google OAuth callback endpoint
  router.get(
    '/google/callback',
    passport.authenticate('google', {
      session: false,
      failureRedirect: '/api/auth/google/failure',
    }),
    googleAuthCallbackController
  );

  // Google OAuth failure redirect handler
  router.get('/google/failure', googleAuthFailureController);
} else {
  // Graceful fallback when Google credentials are not set
  router.get('/google', (req, res) => {
    res.status(501).json({
      success: false,
      message: 'Google OAuth is not configured on this server.',
    });
  });

  router.get('/google/callback', (req, res) => {
    res.redirect(`${config.CLIENT_URL}/login?error=google_auth_not_configured`);
  });

  router.get('/google/failure', googleAuthFailureController);
}

// ==========================================
// 3. Protected Routes & Profile Setup
// ==========================================

// Current authenticated user session details
router.get('/me', verifyToken, getMeController);

// Profile Setup for completing remaining fields (phone, etc.) after Google OAuth
router.post('/setup-profile', verifyToken, setupProfileValidation, setupProfileController);
router.put('/setup-profile', verifyToken, setupProfileValidation, setupProfileController);
router.put('/profile', verifyToken, setupProfileValidation, setupProfileController);

export default router;
