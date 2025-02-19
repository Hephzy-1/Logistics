import express from 'express';
import { login, register, resendOTP, verifyOTP, forgetPassword, resetPassword, updatePassword, updateProfile, newMenu, updateMenu, getOrdersByVendor, updateAcceptedStatus, updateAvailability, createWallet, addToWallet } from '../handlers/vendor';
import passport from '../config/google';
import { isOwner, protect } from '../middlewares';
import upload from '../utils/multer';
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
route.put('/update-profile/:id', 
  upload.single('profilePic'),
  (err: any, req: express.Request, res: express.Response, next:express.NextFunction) => {
    if (err) {
      // Multer or other middleware error handling
      console.error('File upload error:', err);
      return next(new ErrorResponse(err.message, 400));  
    }
    next();
  },
  updateProfile
);
route.route('/menu') 
  .post(newMenu)
  .put(updateMenu)
route.get('/getOrder', cache, getOrdersByVendor);
route.put('/update-orderStatus', updateAcceptedStatus)
route.put('/available-order', updateAvailability)
route.route('/wallet')
  .post(createWallet)
  .put(addToWallet);
// route.route('/transactions')
//   .put(verifyAddToWallet)

export default route;