import express from 'express';
import { login, register, resendOTP, verifyOTP, forgetPassword, resetPassword, updatePassword, getAllOrders, acceptPickup, updateDeliveredStatus, createWallet } from '../handlers/rider';
import passport from '../config/google';
import { protect, isOwner } from '../middlewares';
import upload from '../utils/multer';
import { paystackWebhookHandler } from '../handlers/customer';

const route = express.Router();

route.post('/register', register);
route.post('/login', login);
route.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], state: 'rider' }));
route.route('/otp/:id')
  .put(resendOTP) 
  .post(verifyOTP);

route.post('/forget-password', forgetPassword);
route.put('/reset/:resetToken', resetPassword);

route.use(protect);

route.put('/update-password/:id', updatePassword);
route.put('/update-profile', isOwner, upload.single('profilePic'));
route.get('/get-orders', getAllOrders)
route.put('/pickup', acceptPickup)
route.put('/delivered', updateDeliveredStatus)
route.route('/wallet')
  .post(createWallet)
  .put(paystackWebhookHandler)

export default route;