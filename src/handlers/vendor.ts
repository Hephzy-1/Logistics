import asyncHandler from '../middlewares/async';
import { ErrorResponse } from "../utils/errorResponse";
import { Vendor } from "../usecases/vendor";
import { loginUser, registerUser, resetLink, resetPass, updatePass, verifyOTPInput } from '../validators/auth';
import { comparePassword } from '../utils/hash';
import { generateToken } from '../utils/jwt';
import crypto from 'crypto'; 
import { NextFunction, Request, Response } from 'express';
import passport from 'passport';
import { sendOTP, sendResetLink } from '../utils/sendEmail';

export const register = asyncHandler(async (req, res, next) => {
  const { error, value } = registerUser.validate(req.body);

  if (error) {
    console.error(error.message);
    throw next(new ErrorResponse(error.details[0].message, 400));
  }

  const { name, email, password, phoneNumber, role } = value;

  // Check all collections for existing email
  const vendorExists = await Vendor.vendorByEmail(email);

  if (vendorExists) {
    console.error('Vendor Already Exists');
    throw next(new ErrorResponse('Vendor already exists', 401));
  }

  const newvendor = await Vendor.create(value);

  const sent = sendOTP(newvendor.otp, email);

  return res.status(201).json({
    success: true,
    message: "Vendor registered. Please verify OTP to complete registration.",
    data: newvendor,
    sent
  });
});

export const login = asyncHandler(async (req, res, next) => {
  const { error, value } = loginUser.validate(req.body);

  if (error) {
    throw next(new ErrorResponse(error.details[0].message, 400));
  }

  const { email, password } = value;

  const vendor = await Vendor.vendorByEmail(email);

  if (!vendor || !vendor.password) {
    throw next(new ErrorResponse('Invalid credentials', 401));
  }

  const compare = await comparePassword(password, vendor.password);

  if (!compare) {
    throw next(new ErrorResponse('Invalid credentials', 401));
  }

  const token = await generateToken(email);
  vendor.token = token;
  await vendor.save();

  return res.status(200).json({ success: true, message: 'Vendor has successfully logged in', data: vendor });
});

export const resendOTP = asyncHandler(async (req, res, next) => {
  const vendorId = req.params.id;

  // Check all collections for the vendor
  const vendor = await Vendor.vendorById(vendorId);

  if (!vendor) {
    console.error("Vendor not found");
    throw next(new ErrorResponse("Vendor not found", 404));
  }

  // Generate a new OTP
  const newOTP = Array(6).fill(0).map(() => Math.floor(Math.random() * 10)).join("");

  const hashedOTP = crypto.createHash("sha256").update(newOTP).digest("hex");
  const expiry = new Date(Date.now() + 10 * 60 * 1000); // New expiration time: 10 minutes

  // Update vendor with new OTP and expiry
  vendor.otp = hashedOTP;
  vendor.otpExpires = expiry;
  await vendor.save();

  const sent = sendOTP(newOTP, vendor.email);

  // Respond with success 
  res.status(200).json({
    success: true,
    message: "New OTP has been sent",
    otp: newOTP,
    data: vendor.otp,
    sent 
  });
});

export const verifyOTP = asyncHandler(async (req, res, next) => {
  const vendorId = req.params.id;

  const { error, value } = verifyOTPInput.validate(req.body);
  if (error) {
    console.error(error.message);
    throw next(new ErrorResponse(error.details[0].message, 400));
  }

  const { otp } = value;

  // Check vendor collection for the vendor
  const vendor = await Vendor.vendorById(vendorId);

  if (!vendor) {
    console.error("vendor not found");
    throw next(new ErrorResponse("vendor not found", 404));
  }

  // Check if OTP has expired
  if (!vendor.otpExpires || vendor.otpExpires.getTime() < Date.now()) {
    console.error("OTP has expired");
    throw next(new ErrorResponse("OTP has expired", 400));
  }

  // Hash the provided OTP
  const hashedOTP = crypto.createHash("sha256").update(String(otp)).digest("hex");

  // Compare the hashed OTP with the stored OTP
  console.log(hashedOTP)
  console.log(vendor.otp)
  // console.log(vendor[otp])
  if (vendor.otp !== hashedOTP) {
    console.error("Invalid OTP");
    throw next(new ErrorResponse("Invalid OTP", 400));
  }

  // Mark the vendor as verified
  vendor.isVerified = true;
  vendor.otp = undefined; // Clear the OTP
  vendor.otpExpires = undefined; // Clear OTP expiry
  await vendor.save();

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
        const token = generateToken(email);
        user.token = token;
        await user.save();

        // Respond with user data
        res.status(200).json({
          success: true,
          message: 'Authentication successful',
          data: {
            user,
            token,
          },
        });
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

  const exists = await Vendor.vendorByEmail(email);
  
  if (!exists) {
    throw next( new ErrorResponse("This Vendor doesn't exists", 404));
  }

  const resetToken = await generateToken(email);
  const expiry = new Date(Date.now() + 1 *60 * 60 * 1000); // New expiration time: 1 hour


  exists.resetToken = resetToken;
  exists.resetTokenExpires = expiry;
  await exists.save();

  const sendMail = await sendResetLink(resetToken, email, exists.id, 'Vendor');

  return res.status(200).json({
    success: true,
    message: 'Reset link has been sent',
    token: resetToken,
    sentMail: sendMail
  });
});

export const resetPassword = asyncHandler(async (req, res, next) => {
  const { id, token } = req.params;

  if (!token) {
    console.error('Token is required');
    throw next(new ErrorResponse("Reset Token is required", 401));
  }

  const user = await Vendor.vendorById(id);

  if (!user) {
    throw next(new ErrorResponse('No user found', 404));
  }

  if (user.resetToken !== token) {
    
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

  const update = await Vendor.updatePassword(id, newPassword);

  return res.status(203).json({
    success: true,
    message: 'Password has been updated',
    data: update
  })
});

export const updatePassword = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const { error, value } = updatePass.validate(req.body);

  if (error) {
    throw next(new ErrorResponse(error.details[0].message, 400));
  }

  const { oldPassword, newPassword, confirmPassword } = value;

  const user = await Vendor.vendorById(id);

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

  const update = await Vendor.updatePassword(id, newPassword);
  
  return res.status(203).json({
    success: true,
    message: 'Password has been updated',
    data: update
  })
});