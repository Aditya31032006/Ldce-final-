import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import config from './config.js';
import * as authRepo from '../modules/auth/auth.repository.js';
import { sendWelcomeEmail } from '../services/mail.service.js';

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
          const email = profile.emails?.[0]?.value?.toLowerCase();
          const name = profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim() || 'Google User';

          if (!email) {
            return done(new Error('No email found in Google profile'), null);
          }

          let user = await authRepo.findUserByEmail(email);

          if (!user) {
            // Create new user for first-time Google sign-in
            user = await authRepo.createUserTx(email, name, null, null);

            // Queue/Send welcome email asynchronously
            sendWelcomeEmail({
              toEmail: email,
              name: user.full_name || name,
            }).catch((err) => {
              console.error('Failed to send welcome email for Google user:', err.message);
            });
          }

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
