import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import config from './config.js';
import { Vendor } from '../modules/vendors/vendor.model.js';
import { addWelcomeEmailJob } from '../jobs/emailQueue.js';

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
          const googleId = profile.id;

          if (!email) {
            return done(new Error('No email found in Google profile'), null);
          }

          let vendor = await Vendor.findOne({ googleId });

          if (!vendor) {
            vendor = await Vendor.findOne({ email });

            if (vendor) {
              vendor.googleId = googleId;
              await vendor.save();
            } else {
              vendor = await Vendor.create({
                name,
                email,
                googleId,
              });

              // Queue Welcome Onboarding Email for new Google user
              addWelcomeEmailJob({
                name: vendor.name,
                email: vendor.email,
              }).catch((err) => {
                console.error('Failed to queue welcome email for Google user:', err.message);
              });
            }
          }

          return done(null, vendor);
        } catch (error) {
          console.error('Error during Google OAuth authentication:', error);
          return done(error, null);
        }
      }
    )
  );
} else {
  console.warn('⚠️ Google OAuth credentials missing in configuration.');
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await Vendor.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;