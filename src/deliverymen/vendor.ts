import express from 'express';
import { login, oAuth, register, resendOTP, verifyOTP, forgetPassword, resetPassword, updatePassword } from '../handlers/vendor';
import passport from '../config/google';
import { protectVendor } from '../middlewares';

const route = express.Router();

route.post('/register', register);
route.post('/login', login);
route.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
route.get('/google/callback', oAuth);
route.route('/otp/:id')
  .put(resendOTP)
  .post(verifyOTP)

route.post('/forget-password', forgetPassword);
route.put('/reset/:id/:token', resetPassword);

route.use(protectVendor);

route.put('/update-password/:id', updatePassword);

export default route;