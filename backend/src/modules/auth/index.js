import authRouter from './auth.route.js';

export { authRouter };
export * as authDirectController from './auth.direct.controller.js';
export * as authOAuthController from './auth.oauth.controller.js';
export * as authController from './auth.controller.js';
export * as authService from './auth.service.js';
export * as authRepository from './auth.repository.js';
export * as authQuery from './auth.query.js';

export default authRouter;
