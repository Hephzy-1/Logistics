// src/config/passport.ts
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { comparePassword } from '../utils/hash';
import Customer from '../models/customer';
import environment from './env';
import Vendor from '../models/vendor';
import Rider from '../models/rider';

passport.use(
  new GoogleStrategy(
    {
      clientID: environment.CLIENT_ID!,
      clientSecret: environment.CLIENT_SECRET!,
      callbackURL: 'http://localhost:4080/api/v1/auth/google/callback',
    },
    async (token: string, tokenSecret: string, profile: any, done: any) => {
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

        // Decide model based on some explicit logic (update this logic as per your app's requirement)
        const email = profile.emails?.[0]?.value;
        const role = profile._json?.role; // Example: custom field in Google user info
        let Model;

        if (role === 'customer') Model = Customer;
        else if (role === 'vendor') Model = Vendor;
        else if (role === 'rider') Model = Rider;
        else {
          return done(null, false, { message: 'Invalid user role' });
        }

        // Create a new user if none exists
        const newUser = new Model({
          googleId: profile.id,
          email,
          name: profile.displayName || 'Anonymous',
          isVerified: profile.email_verified || false,
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