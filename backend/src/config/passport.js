import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import config from './config.js';
import * as authService from '../modules/auth/auth.service.js';
import * as authRepo from '../modules/auth/auth.repository.js';

if (config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.GOOGLE_CLIENT_ID,
        clientSecret: config.GOOGLE_CLIENT_SECRET,
        callbackURL: config.GOOGLE_CALLBACK_URL,
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const { user } = await authService.handleGoogleAuthUser(profile);
          return done(null, user);
        } catch (error) {
          console.error('Error during Google OAuth authentication:', error);
          return done(error, null);
        }
      }
    )
  );
} else {
  console.warn('⚠️ Google OAuth credentials missing in configuration. Google auth routes will be disabled.');
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await authRepo.findUserById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
