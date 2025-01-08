import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import Customer from '../models/customer';
import Vendor from '../models/vendor';
import Rider from '../models/rider';
import environment from './env';
import { ErrorResponse } from '../utils/errorResponse';

passport.use(
  new GoogleStrategy(
    {
      clientID: environment.CLIENT_ID!,
      clientSecret: environment.CLIENT_SECRET!,
      callbackURL: 'http://localhost:5000/api/v1/oauth/google/callback', // Unified callback URL
      passReqToCallback: true, // Enables passing the request to the callback
    },
    async (req, token, tokenSecret, profile, done) => {
      try {
        console.log('Google profile:', profile);

        // Get role from the state parameter passed during the OAuth request
        const role = req.query.state as string; // Retrieve the role passed via state

        if (!role) {
          throw new ErrorResponse('Invalid role in request URL', 400);
        }

        // Find user across the correct model based on the role
        let user;
        if (role === 'customer') {
          user = await Customer.findOne({ googleId: profile.id });
        } else if (role === 'vendor') {
          user = await Vendor.findOne({ googleId: profile.id });
        } else if (role === 'rider') {
          user = await Rider.findOne({ googleId: profile.id });
        } else {
          throw new ErrorResponse('Unknown role', 400); // If role is invalid
        }

        // If user found, return it
        if (user) {
          return done(null, user);
        }

        // Create a new user if none exists
        const email = profile.emails?.[0]?.value;
        const Model = role === 'customer' ? Customer : role === 'vendor' ? Vendor : Rider;
        const newUser = new Model({
          googleId: profile.id,
          email,
          name: profile.displayName || 'Anonymous',
          isVerified: profile.emails?.[0]?.verified || true,
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