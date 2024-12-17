// src/config/passport.ts
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import Customer from '../models/customer';
import Vendor from '../models/vendor';
import Rider from '../models/rider';
import environment from './env';

passport.use(
  new GoogleStrategy(
    {
      clientID: environment.CLIENT_ID!,
      clientSecret: environment.CLIENT_SECRET!,
      callbackURL: 'http://localhost:4080/api/v1/auth/google/callback',
      passReqToCallback: true, // Enables passing the request to the callback
    },
    async (req, token, tokenSecret, profile, done) => {
      try {
        console.log('Google profile:', profile);

        // Find user across all models
        const user =
          (await Customer.findOne({ googleId: profile.id })) ||
          (await Vendor.findOne({ googleId: profile.id })) ||
          (await Rider.findOne({ googleId: profile.id }));

        if (user) {
          return done(null, user);
        }

        // Determine model based on the URL path
        const path = req.baseUrl; // Get the base URL
        let Model;

        if (path.includes('/customer')) {
          Model = Customer;
        } else if (path.includes('/vendor')) {
          Model = Vendor;
        } else if (path.includes('/rider')) {
          Model = Rider;
        } else {
          return done(null, false, { message: 'Invalid user role in URL path' });
        }

        // Create a new user if none exists
        const email = profile.emails?.[0]?.value;
        const newUser = new Model({
          googleId: profile.id,
          email,
          name: profile.displayName || 'Anonymous',
          isVerified: profile.emails?.[0]?.verified,
        });

        await newUser.save();
        return done(null, newUser);
      } catch (error) {
        console.error('Error during Google authentication:', error);
        return done(error);
      }
    }
  )
);

export default passport;
