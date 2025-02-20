import asyncHandler from '../middlewares/async';
import { ErrorResponse } from "../utils/errorResponse";
import { RiderUsecases } from "../usecases/rider";
import { comparePassword } from '../utils/hash';
import { addWallet, loginUser, resetLink, resetPass, updatePass, verifyOTPInput } from '../validators';
import { generateToken } from '../utils/jwt';
import crypto from 'crypto';
import passport from '../config/google';
import { NextFunction, Request, Response } from 'express';
import { sendOTP, sendResetLink } from '../services/email/sendEmail';
import { profile, registerRider, orderStatus } from '../validators/rider';
import { AppResponse } from '../middlewares/appResponse';
import { VendorUsecases } from '../usecases/vendor';
import { uploadImageToCloudinary, validateImage } from '../utils/cloudinary';
import { initializePayment } from '../services/payment/payment';
import { CustomerUsecases } from '../usecases/customer';

export const register = asyncHandler(async (req, res, next) => {
  const { error, value } = registerRider.validate(req.body);

  if (error) {
    console.error(error.message);
    throw next(new ErrorResponse(error.details[0].message, 400));
  }

  const { name, email, password, phoneNumber, address, vehicleNumber, vehicleType } = value;

  const riderExists = await RiderUsecases.riderByEmail(email);

  if (riderExists) {
    console.error('Rider Already Exists');
    throw next(new ErrorResponse('Rider already exists', 401));
  }

  const newRider = await RiderUsecases.create(value);

  const existingWallet = await RiderUsecases.riderWallet(newRider.rider.id);

  if (existingWallet) {
    throw next(new ErrorResponse('Wallet already exists for this customer.', 400));
  }

  const newWallet = await RiderUsecases.createNewWallet(newRider.rider.id);

  newRider.rider.walletId = newWallet.id;

  await newRider.rider.save();

  const sent = sendOTP(newRider.otp, email);

  return AppResponse(res, 201, newRider, "Rider registered. Please verify OTP to complete registration.")
});

export const login = asyncHandler(async (req, res, next) => {
  const { error, value } = loginUser.validate(req.body);

  if (error) {
    throw next(new ErrorResponse(error.details[0].message, 400));
  }

  const { email, password } = value;

  const user = await RiderUsecases.riderByEmail(email)

  if (!user || !user.password) {
    throw next(new ErrorResponse('Invalid credentials', 401));
  }

  const compare = await comparePassword(password, user.password);

  if (!compare) {
    throw next(new ErrorResponse('Invalid credentials', 401));
  }

  const token = await generateToken(email);
  user.token = token;
  await user.save();

  return res.status(200).json({ success: true, message: 'Rider has successfully logged in', data: user });
});

export const resendOTP = asyncHandler(async (req, res, next) => {
  const userId = req.params.id;

  const rider = await RiderUsecases.riderById(userId);

  const user = rider;

  if (!user) {
    console.error("User not found");
    throw next(new ErrorResponse("User not found", 404));
  }

  const newOTP = Array(6).fill(0).map(() => Math.floor(Math.random() * 10)).join("");

  const hashedOTP = crypto.createHash("sha256").update(newOTP).digest("hex");
  const expiry = new Date(Date.now() + 10 * 60 * 1000); 
  
  user.otp = hashedOTP;
  user.otpExpires = expiry;
  await user.save();

  const sent = sendOTP(newOTP, rider.email);
 
  return AppResponse(res, 200, newOTP, "New OTP has been sent")
});

export const verifyOTP = asyncHandler(async (req, res, next) => {
  const riderId = req.params.id;

  const { error, value } = verifyOTPInput.validate(req.body);
  if (error) {
    console.error(error.message);
    throw next(new ErrorResponse(error.details[0].message, 400));
  }

  const { otp } = value;

  const rider = await RiderUsecases.riderById(riderId);

  if (!rider) {
    console.error("rider not found");
    throw next(new ErrorResponse("rider not found", 404));
  }

  if (!rider.otpExpires || rider.otpExpires.getTime() < Date.now()) {
    console.error("OTP has expired");
    throw next(new ErrorResponse("OTP has expired", 400));
  }

  const hashedOTP = crypto.createHash("sha256").update(String(otp)).digest("hex");

  if (rider.otp !== hashedOTP) {
    console.error("Invalid OTP");
    throw next(new ErrorResponse("Invalid OTP", 400));
  }

  rider.isVerified = true;
  rider.otp = undefined; 
  rider.otpExpires = undefined; 
  await rider.save();

  return AppResponse(res, 200, null, "OTP verified successfully")
});

export function oAuth(req: Request, res: Response, next: NextFunction) {
  passport.authenticate(
    'google',
    { scope: ['profile', 'email'], session: false },
    async (err: any, user: any, info: any) => {
      if (err) {
        console.error('Error during authentication:', err);
        return next(new ErrorResponse('Authentication failed', 500));
      }

      if (!user) {
        console.log('No user found:', info?.message);
        return next(new ErrorResponse(info?.message || 'Authentication failed', 404));
      }

      try {
        const { email, name, isVerified } = user;
        if (!email || !name) {
          return next(new ErrorResponse('Missing essential user fields', 400));
        }

        const token = await generateToken(email);
        user.token = token;
        await user.save();

        return AppResponse(res, 200, {
            user,
            token,
          }, 'Authentication successful');
      } catch (error: any) {
        console.error('Error during user response handling:', error);
        return next(new ErrorResponse(error.message, 500));
      }
    }
  )(req, res, next);
}

export const forgetPassword = asyncHandler(async (req, res, next) => {
  const { error, value } = resetLink.validate(req.body); 

  if (error) {
    console.error(error.message);
    throw next(new ErrorResponse(error.details[0].message, 400));
  }

  const { email } = value;

  const exists = await RiderUsecases.riderByEmail(email);
  
  if (!exists) {
    throw next( new ErrorResponse("This Rider doesn't exists", 404));
  }

  const resetToken = await generateToken(email);
  const expiry = new Date(Date.now() + 1 *60 * 60 * 1000); 

  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

  exists.resetToken = hashedToken;
  exists.resetTokenExpires = expiry;
  await exists.save();

  const sendMail = await sendResetLink(resetToken, email, 'Rider');

  return AppResponse(res, 200, resetToken, 'Reset link has been sent')
});

export const resetPassword = asyncHandler(async (req, res, next) => {
  const token = req.params.resetToken;

  if (!token) {
    console.error('Token is required');
    throw next(new ErrorResponse("Reset Token is required", 401));
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await RiderUsecases.riderByResetToken(hashedToken);

  if (!user) {
    throw next(new ErrorResponse('No user found', 404));
  }

  // Check if token has expired
  if (!user.resetTokenExpires || user.resetTokenExpires.getTime() < Date.now()) {
    console.error("Reset token has expired");
    throw next(new ErrorResponse("Reset token has expired", 400));
  }

  const { error, value } = resetPass.validate(req.body);

  if (error) {
    console.error(error.message);
    throw next(new ErrorResponse(error.details[0].message, 400));
  }

  const { newPassword, confirmPassword } = value;

  if (confirmPassword !== newPassword) {
    throw next(new ErrorResponse("Passwords don't match", 400));
  }

  const update = await RiderUsecases.updatePassword(user.id, newPassword);

  return res.status(203).json({
    success: true,
    message: 'Password has been updated',
    data: update
  })
});

export const updatePassword = asyncHandler(async (req, res, next) => {
  const id = req.rider?.id;

  const { error, value } = updatePass.validate(req.body);

  if (error) {
    throw next(new ErrorResponse(error.details[0].message, 400));
  }

  const { oldPassword, newPassword, confirmPassword } = value;

  const user = await RiderUsecases.riderById(id);

  if (!user || !user.password) {
    throw next(new ErrorResponse('User password not found', 404));
  }

  const compare = await comparePassword(oldPassword, user.password);

  if (!compare) {
    throw next(new ErrorResponse('Invalid password', 400));
  }

  if (confirmPassword !== newPassword) {
    throw next(new ErrorResponse("Passwords don't match", 400));
  }

  const update = await RiderUsecases.updatePassword(id, newPassword);
  
  return AppResponse(res, 200, update,  'Password has been updated')
});

export const updateProfile = asyncHandler(async (req, res, next) => {
  
  const { error, value } = profile.validate(req.body);

  if (error) throw next(new ErrorResponse(error.details[0].message, 400));

  req.body.userId = req.rider?._id;

  if (!req.body.userId) {
    next (new ErrorResponse('User ID is required', 400));
  }
 
  // Check if user exists
  const user = await RiderUsecases.riderById(req.body.userId);
  if (!user) {
    next (new ErrorResponse('User not found', 404));
  }

  if (req.file) {
  
      if (!validateImage(req.file)) {
        throw next(new ErrorResponse('Invalid image type', 400));
      }
      
      const imageUrl = await uploadImageToCloudinary(req.file)
      req.body.profilePic = imageUrl
    }

  const userProfile = await RiderUsecases.updateProfile(req.body);

  return res.status(204).json({ 
    success: true, 
    message: 'Profile updated successfully', 
    data: userProfile 
  });
});

export const getAllOrders = asyncHandler(async (req, res, next) => {
  const orders = await RiderUsecases.allOrders();

  if (!orders || orders.length === 0) {
    throw next(new ErrorResponse('No orders found', 404));
  }

  return AppResponse(res, 200, orders, "All orders retrieved successfully.");
});

export const acceptPickup = asyncHandler(async (req, res, next) => {
  const riderId = req.rider?._id as string;

  const { error, value } = orderStatus.validate(req.body);

  if (error) {
    throw next(new ErrorResponse(error.details[0].message, 400));
    
  }
  const { orderId, status } = value;

  const order = await RiderUsecases.orderByIdAndRider(orderId, riderId);

  if (!order) {
    throw next(new ErrorResponse("Order not found or does not belong to this vendor", 404));
  }

  if (order.orderStatus !== 'new') {
    throw next(new ErrorResponse("Only new orders can be updated", 400));
  }

  order.pickedUp = status === 'true' ? true : false;

  if (order.pickedUp !== true) {
    throw next(new ErrorResponse("Order wasn't picked up", 400))
  }

  order.availableForPickup = false;
  order.orderStatus = 'in-transit';
  await order.save();

  return AppResponse(res, 200, order, `Order status updated to ${status}.`);
});

export const updateDeliveredStatus = asyncHandler(async (req, res, next) => {
  const riderId = req.rider?._id as string;

  const { error, value } = orderStatus.validate(req.body);

  if (error) {
    throw next(new ErrorResponse(error.details[0].message, 400));
    
  }
  const { orderId, status } = value;

  const order = await RiderUsecases.orderByIdAndRider(orderId, riderId);

  if (!order) {
    throw next(new ErrorResponse("Order not found or does not belong to this vendor", 404));
  }

  if (order.orderStatus !== 'in-transit') {
    throw next(new ErrorResponse("Only in transit orders can be updated", 400));
  }

  order.deliveredStatus = status === 'true' ? true : false;
  await order.save();

  return AppResponse(res, 200, order, `Order status updated to ${status}.`);
});

export const createWallet = asyncHandler(async (req, res, next) => {
  const userId = req.rider?._id as string;

  const existingWallet = await RiderUsecases.riderWallet(userId);
  if (existingWallet) {
    throw next(new ErrorResponse('Wallet already exists for this customer.', 400));
  }

  const wallet: any = {
    riderId: userId
  };

  const newWallet = await RiderUsecases.createNewWallet(wallet);

  return AppResponse(res, 201, newWallet, 'New wallet has been created');
});

export const addToWallet = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = addWallet.validate(req.body);

  if (error) {
    throw next(new ErrorResponse(error.details[0].message, 400));
  }

  const { amount } = value;
  const user = req.customer;

  if (!user) {
    throw next(new ErrorResponse('User not found', 404));
  }

  try {
    const dataValues: any = {
      amount,
      type: 'credit',
      date: new Date(),
      status: 'pending',
      riderId: user.id
    }

    const pendingTransaction = await RiderUsecases.createNewTransaction(dataValues);

    const paymentResponse = await initializePayment(
      user.email,
      amount,
      user.id,
      'rider',
      pendingTransaction.id
    );

    pendingTransaction.reference = paymentResponse.data.reference;
    await pendingTransaction.save();

    return AppResponse(
      res,
      200,
      {
        ...paymentResponse.data,
        transactionId: pendingTransaction._id
      },
      'Transaction initialized'
    );
  } catch (err: any) {
    return next(new ErrorResponse(err.message, 500));
  }
});

export const payAmountToRider = asyncHandler(async (req, res, next) => {
  const riderId = req.rider?._id as string; 
  const { orderId } = req.body;
  const order = await VendorUsecases.getOrder(riderId)
  
  if (!order || !order.riderId) {
    throw next(new ErrorResponse('Order not found.', 404));
  }

  if (order.orderStatus !== 'delivered' || order.confirmDeliverdByCustomer !== true) {
    throw next(new ErrorResponse('Order has not been delivered or confirmed by customer', 400));
  }

  const riderWallet = await RiderUsecases.riderWallet(String(order.riderId));
  if (!riderWallet) {
    throw next(new ErrorResponse('Vendor wallet not found.', 404));
  }

  const customerTransactions = await CustomerUsecases.customerTransactionByOrderId(orderId)

  if (!customerTransactions || customerTransactions.status !== 'pending') {
    throw next(new ErrorResponse("Transaction hasn't been made", 400));
  }

  riderWallet.balance += order.deliveryFee;

  const riderTransactValues: any = {
    amount: order.deliveryFee,
    type: 'credit',
    date: new Date(),
    description: `Payment for delivery of Order ID: ${orderId}`,
    status: 'completed'
  }

  const riderTransaction = await RiderUsecases.createNewTransaction(riderTransactValues);

  return AppResponse(res, 200, riderTransaction , 'Payment has been made');
});