import express from 'express';
import { login, oAuth, register, resendOTP, verifyOTP, forgetPassword, resetPassword, updatePassword } from '../handlers/rider';
import passport from '../config/google';
import { protect, isOwner } from '../middlewares';
import upload from '../utils/multer';

const route = express.Router();

route.post('/register', register);
route.post('/login', login);
route.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
route.get('/google/callback', oAuth);
route.route('/otp/:id')
  .put(resendOTP) // resend otp
  .post(verifyOTP);

route.post('/forget-password', forgetPassword);
route.put('/reset/:resetToken', resetPassword);

route.use(protect);

route.put('/update-password/:id', updatePassword);
route.put('/update-profile', isOwner, upload.single('profilePic'))

export default route;