import express from 'express';
import { login, register, resendOTP, verifyOTP, forgetPassword, resetPassword, updatePassword, updateProfile, newMenu, updateMenu, getOrdersByVendor, updateAcceptedStatus, updateAvailability } from '../handlers/vendor';
import passport from '../config/google';
import { isOwner, protect } from '../middlewares';
import upload from '../utils/multer';
import { uploadProfilePic } from '../handlers/customer';
import { ErrorResponse } from '../utils/errorResponse';
import cache from '../middlewares/cache';

const route = express.Router();

route.post('/register', register);
route.post('/login', login);
route.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], state: 'vendor' }));
route.route('/otp/:id')
  .put(resendOTP)
  .post(verifyOTP)

route.post('/forget-password', forgetPassword);
route.put('/reset/:token', resetPassword);

route.use(protect);

route.put('/update-password/:id', updatePassword);
route.put('/update-profile', isOwner, upload.single('profilePic'), updateProfile);
route.post('/create-menu', newMenu);
route.put('/update-menu', updateMenu)
route.get('/getOrder', getOrdersByVendor);
route.put('/update-orderStatus', updateAcceptedStatus)
route.put('/available-order', updateAvailability)

export default route;