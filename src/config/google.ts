// src/config/passport.ts
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import Customer from '../models/customer';
import Vendor from '../models/vendor';
import Rider from '../models/rider';
import environment from './env';
import { ErrorResponse } from '../utils/errorResponse';

const getModel = (path: string) => {
  if (path.includes('/customer')) {
    return Customer;
  } else if (path.includes('/vendor')) {
    return Vendor;
  } else if (path.includes('/rider')) {
    return Rider;
  } else {
    throw new ErrorResponse('Invalid path', 400);
  }
};

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
        const Model = getModel(req.baseUrl);

        // Create a new user if none exists
        const email = profile.emails?.[0]?.value;
        const newUser = new Model({
          googleId: profile.id,
          email,
          name: profile.displayName || 'Anonymous',
          isVerified: profile.emails?.[0]?.verified || false,
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
