import asyncHandler from '../middlewares/async';
import { ErrorResponse } from "../utils/errorResponse";
import { Rider } from "../usecases/rider";
import { comparePassword } from '../utils/hash';
import { loginUser, resetLink, resetPass, updatePass, verifyOTPInput } from '../validators';
import { generateToken } from '../utils/jwt';
import crypto from 'crypto';
import passport from '../config/google';
import { NextFunction, Request, Response } from 'express';
import { sendOTP, sendResetLink } from '../utils/sendEmail';
import { uploadProfilePic } from './customer';
import { profile, registerRider, orderStatus } from '../validators/rider';
import { AppResponse } from '../middlewares/appResponse';

export const register = asyncHandler(async (req, res, next) => {
  const { error, value } = registerRider.validate(req.body);

  if (error) {
    console.error(error.message);
    throw next(new ErrorResponse(error.details[0].message, 400));
  }

  const { name, email, password, phoneNumber, address, vehicleNumber, vehicleType } = value;

  // Check all collections for existing email
  const riderExists = await Rider.riderByEmail(email);

  if (riderExists) {
    console.error('Rider Already Exists');
    throw next(new ErrorResponse('Rider already exists', 401));
  }

  const newUser = await Rider.create(value);

  const sent = sendOTP(newUser.otp, email);

  return res.status(201).json({
    success: true,
    message: "Rider registered. Please verify OTP to complete registration.",
    data: newUser,
    sent
  });
});

export const login = asyncHandler(async (req, res, next) => {
  const { error, value } = loginUser.validate(req.body);

  if (error) {
    throw next(new ErrorResponse(error.details[0].message, 400));
  }

  const { email, password } = value;

  const user = await Rider.riderByEmail(email)

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

  // Check all collections for the user
  const rider = await Rider.riderById(userId);

  const user = rider;

  if (!user) {
    console.error("User not found");
    throw next(new ErrorResponse("User not found", 404));
  }

  // Generate a new OTP
  const newOTP = Array(6).fill(0).map(() => Math.floor(Math.random() * 10)).join("");

  const hashedOTP = crypto.createHash("sha256").update(newOTP).digest("hex");
  const expiry = new Date(Date.now() + 10 * 60 * 1000); // New expiration time: 10 minutes

  // Update user with new OTP and expiry
  user.otp = hashedOTP;
  user.otpExpires = expiry;
  await user.save();

  const sent = sendOTP(newOTP, rider.email);

  // Respond with success 
  res.status(200).json({
    success: true,
    message: "New OTP has been sent",
    otp: newOTP,
    data: user.otp,
    sent 
  });
});

export const verifyOTP = asyncHandler(async (req, res, next) => {
  const riderId = req.params.id;

  const { error, value } = verifyOTPInput.validate(req.body);
  if (error) {
    console.error(error.message);
    throw next(new ErrorResponse(error.details[0].message, 400));
  }

  const { otp } = value;

  // Check rider collection for the rider
  const rider = await Rider.riderById(riderId);

  if (!rider) {
    console.error("rider not found");
    throw next(new ErrorResponse("rider not found", 404));
  }

  // Check if OTP has expired
  if (!rider.otpExpires || rider.otpExpires.getTime() < Date.now()) {
    console.error("OTP has expired");
    throw next(new ErrorResponse("OTP has expired", 400));
  }

  // Hash the provided OTP
  const hashedOTP = crypto.createHash("sha256").update(String(otp)).digest("hex");

  // Compare the hashed OTP with the stored OTP
  console.log(hashedOTP)
  console.log(rider.otp)
  // console.log(rider[otp])
  if (rider.otp !== hashedOTP) {
    console.error("Invalid OTP");
    throw next(new ErrorResponse("Invalid OTP", 400));
  }

  // Mark the rider as verified
  rider.isVerified = true;
  rider.otp = undefined; // Clear the OTP
  rider.otpExpires = undefined; // Clear OTP expiry
  await rider.save();

  res.status(200).json({
    success: true,
    message: "OTP verified successfully",
  });
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
        // Ensure required fields exist
        const { email, name, isVerified } = user;
        if (!email || !name) {
          return next(new ErrorResponse('Missing essential user fields', 400));
        }

        // Generate and save token if needed
        const token = await generateToken(email);
        user.token = token;
        await user.save();

        // Respond with user data
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

  const exists = await Rider.riderByEmail(email);
  
  if (!exists) {
    throw next( new ErrorResponse("This Rider doesn't exists", 404));
  }

  const resetToken = await generateToken(email);
  const expiry = new Date(Date.now() + 1 *60 * 60 * 1000); // New expiration time: 1 hour

  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

  exists.resetToken = hashedToken;
  exists.resetTokenExpires = expiry;
  await exists.save();

  const sendMail = await sendResetLink(resetToken, email, 'Rider');

  return res.status(200).json({
    success: true,
    message: 'Reset link has been sent',
    token: resetToken,
    sentMail: sendMail
  });
});

export const resetPassword = asyncHandler(async (req, res, next) => {
  const token = req.params.resetToken;

  if (!token) {
    console.error('Token is required');
    throw next(new ErrorResponse("Reset Token is required", 401));
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await Rider.riderByResetToken(hashedToken);

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

  const update = await Rider.updatePassword(user.id, newPassword);

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

  const user = await Rider.riderById(id);

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

  const update = await Rider.updatePassword(id, newPassword);
  
  return res.status(203).json({
    success: true,
    message: 'Password has been updated',
    data: update
  })
});

export const updateProfile = asyncHandler(async (req, res, next) => {
  
  const { error, value } = profile.validate(req.body);

  if (error) throw next(new ErrorResponse(error.details[0].message, 400));

  req.body.userId = req.rider?._id;

  if (!req.body.userId) {
    next (new ErrorResponse('User ID is required', 400));
  }
 
  // Check if user exists
  const user = await Rider.riderById(req.body.userId);
  if (!user) {
    next (new ErrorResponse('User not found', 404));
  }

  if (req.file) {
    req.body.profilePic = await uploadProfilePic(req.file);
  }

  const userProfile = await Rider.updateProfile(req.body);

  return res.status(204).json({ 
    success: true, 
    message: 'Profile updated successfully', 
    data: userProfile 
  });
});

export const getAllOrders = asyncHandler(async (req, res, next) => {
  const orders = await Rider.allOrders();

  if (!orders || orders.length === 0) {
    throw next(new ErrorResponse('No orders found', 404));
  }

  return AppResponse(res, 200, orders, "All orders retrieved successfully.");
});

export const acceptPickup = asyncHandler(async (req, res, next) => {
  const vendorId = req.vendor?._id as string;

  const { error, value } = orderStatus.validate(req.body);

  if (error) {
    throw next(new ErrorResponse(error.details[0].message, 400));
    
  }
  const { orderId, status } = value;

  const order = await Rider.orderByIdAndVendor(orderId, vendorId);

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
  const vendorId = req.vendor?._id as string;

  const { error, value } = orderStatus.validate(req.body);

  if (error) {
    throw next(new ErrorResponse(error.details[0].message, 400));
    
  }
  const { orderId, status } = value;

  const order = await Rider.orderByIdAndVendor(orderId, vendorId);

  if (!order) {
    throw next(new ErrorResponse("Order not found or does not belong to this vendor", 404));
  }

  if (order.orderStatus !== 'new') {
    throw next(new ErrorResponse("Only new orders can be updated", 400));
  }

  order.deliveredStatus = status === 'true' ? true : false;
  await order.save();

  return AppResponse(res, 200, order, `Order status updated to ${status}.`);
});