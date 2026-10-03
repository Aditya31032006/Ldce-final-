/**
 * Auth Controllers Index
 * Aggregates and re-exports both controllers:
 * 1. auth.direct.controller.js - For direct registration and login with all fields
 * 2. auth.oauth.controller.js  - For Google OAuth registration, login, and setup-profile redirect
 */

export * from './auth.direct.controller.js';
export * from './auth.oauth.controller.js';

// Aliases for unified naming
export {
  directRegisterController as registerController,
  directLoginController as loginController,
} from './auth.direct.controller.js';

export {
  googleAuthCallbackController as googleCallbackController,
  googleAuthCallbackController,
  googleAuthFailureController,
  getOAuthStatusController,
} from './auth.oauth.controller.js';
