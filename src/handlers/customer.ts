import { NextFunction, Request, Response } from "express";
import asyncHandler from "../middlewares/async";
import { Customer } from "../usecases/customer";
import { ErrorResponse } from "../utils/errorResponse";
import { comparePassword } from "../utils/hash";
import { generateToken } from "../utils/jwt";
import { loginUser, registerUser, verifyOTPInput } from "../validators/auth";
import passport from '../config/google';
import crypto from 'crypto';
import { sendOTP } from "../utils/sendEmail";

export const register = asyncHandler(async (req, res, next) => {
  const { error, value } = registerUser.validate(req.body);

  if (error) {
    console.error(error.message);
    throw next(new ErrorResponse(error.details[0].message, 400));
  }

  const { name, email, password, phoneNumber } = value;

  // Check all collections for existing email
  const customerExists = await Customer.customerByEmail(email);

  if (customerExists) {
    console.error('Customer Already Exists');
    throw next(new ErrorResponse('Customer already exists', 401));
  }

  const newCustomer = await Customer.create(value);

  const sent = sendOTP(newCustomer.otp, email)

  return res.status(201).json({
    success: true,
    message: "Customer registered. Please verify OTP to complete registration.",
    data: newCustomer,
    email: sent
  });
});

export const login = asyncHandler(async (req, res, next) => {
  const { error, value } = loginUser.validate(req.body);

  if (error) {
    throw next(new ErrorResponse(error.details[0].message, 400));
  }

  const { email, password } = value;

  const customer = await Customer.customerByEmail(email);

  if (!customer || !customer.password) {
    throw next(new ErrorResponse('Invalid credentials', 401));
  }

  const compare = await comparePassword(password, customer.password);

  if (!compare) {
    throw next(new ErrorResponse('Invalid credentials', 401));
  }

  const token = await generateToken(email);
  customer.token = token;
  await customer.save();

  return res.status(200).json({ success: true, message: 'Customer has successfully logged in', data: customer });
});

export const resendOTP = asyncHandler(async (req, res, next) => {
  const customerId = req.params.id;

  // Check all collections for the customer
  const customer = await Customer.customerById(customerId);

  if (!customer) {
    console.error("Customer not found");
    throw next(new ErrorResponse("Customer not found", 404));
  }

  // Generate a new OTP
  const newOTP = Array(6).fill(0).map(() => Math.floor(Math.random() * 10)).join("");

  const hashedOTP = crypto.createHash("sha256").update(newOTP).digest("hex");
  const expiry = new Date(Date.now() + 10 * 60 * 1000); // New expiration time: 10 minutes

  // Update customer with new OTP and expiry
  customer.otp = hashedOTP;
  customer.otpExpires = expiry;
  await customer.save();

  const sent = sendOTP(newOTP, customer.email);

  // Respond with success 
  res.status(200).json({
    success: true,
    message: "New OTP has been sent",
    otp: newOTP,
    data: customer.otp ,
    emailSent: sent
  });
});

export const verifyOTP = asyncHandler(async (req, res, next) => {
  const customerId = req.params.id;

  const { error, value } = verifyOTPInput.validate(req.body);
  if (error) {
    console.error(error.message);
    throw next(new ErrorResponse(error.details[0].message, 400));
  }

  const { otp } = value;

  // Check customer collection for the customer
  const customer = await Customer.customerById(customerId);

  if (!customer) {
    console.error("customer not found");
    throw next(new ErrorResponse("customer not found", 404));
  }

  // Check if OTP has expired
  if (!customer.otpExpires || customer.otpExpires.getTime() < Date.now()) {
    console.error("OTP has expired");
    throw next(new ErrorResponse("OTP has expired", 400));
  }

  // Hash the provided OTP
  const hashedOTP = crypto.createHash("sha256").update(String(otp)).digest("hex");

  // Compare the hashed OTP with the stored OTP
  console.log(hashedOTP)
  console.log(customer.otp)
  // console.log(customer[otp])
  if (customer.otp !== hashedOTP) {
    console.error("Invalid OTP");
    throw next(new ErrorResponse("Invalid OTP", 400));
  }

  // Mark the customer as verified
  customer.isVerified = true;
  customer.otp = null; // Clear the OTP
  customer.otpExpires = null; // Clear OTP expiry
  await customer.save();

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