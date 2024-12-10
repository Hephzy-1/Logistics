import express from 'express';
import { login, oAuth, register, resendOTP, verifyOTP } from '../handlers/rider';
import passport from '../config/google';

const route = express.Router();

route.post('/register', register);
route.post('/login', login);
route.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
route.get('/google/callback', oAuth);
route.route('/otp/:id')
  .put(resendOTP)
  .post(verifyOTP)

export default route;