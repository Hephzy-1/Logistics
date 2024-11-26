import { NextFunction, Request, Response } from "express";
import asyncHandler from "../middlewares/async";
import { loginUser, registerUser, verifyOTPInput } from "../validators/auth";
import { ErrorResponse } from "../utils/errorResponse";
import { Customer } from "../usecases/customer";
import { Vendor } from "../usecases/vendor";
import { Rider } from "../usecases/rider";
import { comparePassword } from "../utils/hash";
import { generateToken } from "../utils/jwt";
import passport from 'passport';
import crypto from "crypto";

export const register = asyncHandler(async (req, res, next) => {
  const { error, value } = registerUser.validate(req.body);

  if (error) {
    console.error(error.message);
    throw next(new ErrorResponse(error.details[0].message, 400));
  }

  const { name, email, password, phoneNumber, role } = value;

  // Check all collections for existing email
  const [customerExists, vendorExists, riderExists] = await Promise.all([
    Customer.customerByEmail(email),
    Vendor.vendorByEmail(email),
    Rider.riderByEmail(email)
  ]);

  if (customerExists || vendorExists || riderExists) {
    console.error('User Already Exists');
    throw next(new ErrorResponse('User already exists', 401));
  }

  let newUser;
  let roleModel;
  if (role === 'customer') {
    roleModel = Customer;
  } else if (role === 'vendor') {
    roleModel = Vendor;
  } else if (role === 'rider') {
    roleModel = Rider;
  }

  if (!roleModel) {
    throw next(new ErrorResponse('Invalid role specified', 400));
  }

  newUser = await roleModel.create(value);

  return res.status(201).json({
    success: true,
    message: "User registered. Please verify OTP to complete registration.",
    data: newUser
  });
});

export const verifyOTP = asyncHandler(async (req, res, next) => {
  const userId = req.params.id;

  const { error, value } = verifyOTPInput.validate(req.body);
  if (error) {
    console.error(error.message);
    throw next(new ErrorResponse(error.details[0].message, 400));
  }

  const { otp } = value;

  // Check all collections for the user
  const [customer, vendor, rider] = await Promise.all([
    Customer.customerById(userId),
    Vendor.vendorById(userId),
    Rider.riderById(userId)
  ]);

  // Find the user in any collection
  const user = customer || vendor || rider;

  if (!user) {
    console.error("User not found");
    throw next(new ErrorResponse("User not found", 404));
  }

  // Check if OTP has expired
  if (!user.otpExpires || user.otpExpires.getTime() < Date.now()) {
    console.error("OTP has expired");
    throw next(new ErrorResponse("OTP has expired", 400));
  }

  // Hash the provided OTP
  const hashedOTP = crypto.createHash("sha256").update(String(otp)).digest("hex");

  // Compare the hashed OTP with the stored OTP
  console.log(hashedOTP)
  console.log(user.otp)
  // console.log(user[otp])
  if (user.otp !== hashedOTP) {
    console.error("Invalid OTP");
    throw next(new ErrorResponse("Invalid OTP", 400));
  }

  // Mark the user as verified
  user.isVerified = true;
  user.otp = null; // Clear the OTP
  user.otpExpires = null; // Clear OTP expiry
  await user.save();

  res.status(200).json({
    success: true,
    message: "OTP verified successfully",
  });
});

export const resendOTP = asyncHandler(async (req, res, next) => {
  const userId = req.params.id;

  // Check all collections for the user
  const [customer, vendor, rider] = await Promise.all([
    Customer.customerById(userId),
    Vendor.vendorById(userId),
    Rider.riderById(userId)
  ]);

  const user = customer || vendor || rider;

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

  // Respond with success 
  res.status(200).json({
    success: true,
    message: "New OTP has been sent",
    otp: newOTP,
    data: user.otp 
  });
});

export const login = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = loginUser.validate(req.body);

  if (error) {
    throw next(new ErrorResponse(error.details[0].message, 400));
  }

  const { email, password } = value;

  const user = (await Promise.all([
    Customer.customerByEmail(email),
    Vendor.vendorByEmail(email),
    Rider.riderByEmail(email)
  ])).find(user => user);

  if (!user) {
    throw next(new ErrorResponse('Invalid credentials', 401));
  }

  if (user.password) {
    const compare = await comparePassword(password, user.password );

    if (!compare) {
      throw next(new ErrorResponse('Invalid credentials', 401));
    }
  } else {
    throw next(new ErrorResponse('Invalid credentials', 401));
  }

  const token = await generateToken(email);
  user.token = token;
  await user.save();

  return res.status(200).json({ success: true, message: 'User has successfully logged in', data: user });
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
