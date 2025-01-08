import express from 'express';
import { login, register, resendOTP, verifyOTP, forgetPassword, resetPassword, updatePassword, updateProfile, getAllVerifiedVendors, getAllVerifiedVendorsMenu } from '../handlers/customer';
import passport from '../config/google';
import { isOwner, protect } from '../middlewares';
import upload from '../utils/multer';

export const route = express.Router();

route.post('/register', register);
route.post('/login', login);
route.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false, state: 'customer' }));
route.route('/otp/:id')
  .put(resendOTP)
  .post(verifyOTP)
route.post('/forget-password', forgetPassword);
route.put('/reset/:token', resetPassword);

route.use(protect)

route.put('/update-password', updatePassword);
route.put('/update-profile/:id', isOwner, upload.single('profilePic'), updateProfile);
route.get('/get-vendors', getAllVerifiedVendors);
route.get('get-menus', getAllVerifiedVendorsMenu);

export default route;