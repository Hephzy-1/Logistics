import asyncHandler from '../middlewares/async';
import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from "../utils/errorResponse";
import { Vendor } from "../usecases/vendor";
import { addWallet, loginUser, resetLink, resetPass, updatePass, verifyOTPInput } from '../validators';
import { comparePassword, compareToken, hashToken } from '../utils/hash';
import { generateToken } from '../utils/jwt';
import crypto from 'crypto'; 
import { sendOTP, sendResetLink } from '../services/email/sendEmail';
import { profile, registerVendor, menus, orderStatus } from '../validators/vendor';
import { AppResponse } from '../middlewares/appResponse';
import { uploadImageToCloudinary, validateImage } from '../utils/cloudinary';
import { initializePayment } from '../services/payment/payment';

export const register = asyncHandler(async (req, res, next) => {
  const { error, value } = registerVendor.validate(req.body);

  if (error) {
    console.error(error.message);
    throw next(new ErrorResponse(error.details[0].message, 400));
  }

  const { email, ...data } = value;

  // Check all collections for existing email
  const vendorExists = await Vendor.vendorByEmail(email);

  if (vendorExists) {
    console.error('Vendor Already Exists');
    throw next(new ErrorResponse('Vendor already exists', 401));
  }

  const newVendor = await Vendor.create(value);

  const sent = sendOTP(newVendor.otp, email);

  console.log(newVendor.otp);

  return AppResponse(res, 201, newVendor, "Vendor registered. Please verify OTP to complete registration.");
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
  console.log(newOTP);
  
  return AppResponse(res, 200, vendor, "New OTP has been sent");
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

  return AppResponse(res, 200, vendor, "OTP verified successfully");
});

export const forgetPassword = asyncHandler(async (req, res, next) => {
  const { error, value } = resetLink.validate(req.body); 

  if (error) {
    console.error(error.message);
    throw next(new ErrorResponse(error.details[0].message, 400));
  }

  const { email } = value;

  const exists = await Vendor.vendorByEmail(email);
  console.log(exists);
  
  if (!exists) {
    throw next( new ErrorResponse("This vendor doesn't exists", 404));
  }

  const resetToken = await generateToken(email);
  const expiry = new Date(Date.now() + 1 *60 * 60 * 1000); // New expiration time: 1 hour

  const hashedToken = await hashToken(resetToken);
  console.log(hashedToken)

  exists.resetToken = hashedToken;
  exists.resetTokenExpires = expiry;
  await exists.save();

  const sendMail = await sendResetLink(resetToken, email, 'vendor');

  return AppResponse(res, 200, { resetToken, id: exists._id }, 'Reset link has been sent');
});

export const resetPassword = asyncHandler(async (req, res, next) => {
  const token = req.params.token;

  if (!token) {
    console.error('Token is required');
    throw next(new ErrorResponse("Reset Token is required", 401));
  }

  const { error, value } = resetPass.validate(req.body);

  if (error) {
    console.error(error.message);
    throw next(new ErrorResponse(error.details[0].message, 400));
  }

  const { id, newPassword, confirmPassword } = value;

  if (confirmPassword !== newPassword) {
    throw next(new ErrorResponse("Passwords don't match", 400));
  }

  const user = await Vendor.vendorById(id);

  console.log(user)

  if (!user || !user.resetToken) {
    throw next(new ErrorResponse('No user found', 404));
  }

  // Check if token has expired
  if (!user.resetTokenExpires || user.resetTokenExpires.getTime() < Date.now()) {
    console.error("Reset token has expired");
    throw next(new ErrorResponse("Reset token has expired", 402));
  }

  const hashedToken = await compareToken(token, user.resetToken)
  console.log(hashedToken);

  const update = await Vendor.updatePassword(user.id, newPassword);

  return AppResponse(res, 200, null, 'Password has been updated')
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

export const updateProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.params.id;

  if (!userId) {
    return next(new ErrorResponse('User ID is required', 400));
  }

  // Check if user exists
  const user = await Vendor.vendorById(userId);
  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  if (req.file) {
    if (!validateImage(req.file)) {
      return next(new ErrorResponse('Invalid image type', 400));
    }

    const imageUrl = await uploadImageToCloudinary(req.file);
    req.body.profilePic = imageUrl;
  }

  req.body.userId = userId;

  const userProfile = await Vendor.updateProfile(req.body);

  return res.status(204).json({
    success: true,
    message: 'Profile updated successfully',
    data: userProfile,
  });
});

export const newMenu = asyncHandler(async (req, res, next) => {
  console.log(req.vendor)
  const { error, value } = menus.validate(req.body);

  if (error) return next(new ErrorResponse(error.details[0].message, 400));

  // if (!req.file) {
  //   return next(new ErrorResponse("Picture is required", 400));
  // }

  req.body.vendorId = req.vendor?._id; 
  // req.body.picture = await uploadProfilePic(req.file);
  console.log(req.body)

  const createdMenu = await Vendor.createNewMenu(req.body);

  return AppResponse(res, 201, createdMenu, "Menu created successfully");
});

export const updateMenu = asyncHandler(async (req, res, next) => {
  req.body.vendorId = req.vendor?._id;

  if (!req.body.vendorId) {
    return next(new ErrorResponse('Vendor ID is required', 400));
  }

  const menu = await Vendor.menuById(req.params.menuId);
  if (!menu) {
    return next(new ErrorResponse('Menu not found', 404));
  }

  const updatedMenu = await Vendor.MenuUpdate(req.body);

  return AppResponse(res, 200, updatedMenu, 'Menu updated successfully');
});

export const getOrdersByVendor = asyncHandler(async (req, res, next) => {
  const vendorId = req.vendor?._id as string;
  const orders = await Vendor.vendorOrders(vendorId);

  if (!orders || orders.length === 0) {
    throw next(new ErrorResponse('No orders found', 404));
  }

  return AppResponse(res, 200, orders, `Orders for vendor ${vendorId} retrieved successfully.`);
});

export const updateAcceptedStatus = asyncHandler(async (req, res, next) => {
  const vendorId = req.vendor?._id as string;

  const { error, value } = orderStatus.validate(req.body);

  if (error) {
    throw next(new ErrorResponse(error.details[0].message, 400));
    
  }
  const { orderId, status } = value;

  const order = await Vendor.orderByIdAndVendor(orderId, vendorId);

  if (!order) {
    throw next(new ErrorResponse("Order not found or does not belong to this vendor", 404));
  }

  if (order.orderStatus !== 'new') {
    throw next(new ErrorResponse("Only new orders can be updated", 400));
  }

  order.acceptedStatus = status === 'yes' ? 'accepted' : 'declined';
  await order.save();

  return AppResponse(res, 200, order, `Order status updated to ${status}.`);
});

export const updateAvailability = asyncHandler(async (req, res, next) => {
  const vendorId = req.vendor?._id as string;

  const { error, value } = orderStatus.validate(req.body);

  if (error) {
    throw next(new ErrorResponse(error.details[0].message, 400));
    
  }
  const { orderId, status } = value;

  const order = await Vendor.orderByIdAndVendor(orderId, vendorId);

  if (!order) {
    throw next(new ErrorResponse("Order not found or does not belong to this vendor", 404));
  }

  if (order.orderStatus !== 'new') {
    throw next(new ErrorResponse("Only new orders can be updated", 400));
  }

  order.availableForPickup = status === 'yes' ? true : false;
  await order.save();

  return AppResponse(res, 200, order, `Order status updated to ${status}.`);
});

export const getAllOrders = asyncHandler(async (req, res, next) => {
  const orders = await Vendor.newOrders();

  if (!orders || orders.length === 0) {
    throw next(new ErrorResponse('No orders found', 404));
  }

  return AppResponse(res, 200, orders, "All new orders retrieved successfully.");
});

export const createWallet = asyncHandler(async (req, res, next) => {
  const userId = req.vendor?._id as string;

  const existingWallet = await Vendor.vendorWallet(userId);
  if (existingWallet) {
    throw next(new ErrorResponse('Wallet already exists for this customer.', 400));
  }

  const wallet: any = {
    vendorId: userId
  };

  const newWallet = await Vendor.createNewWallet(wallet);

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
      vendorId: user.id
    }

    const pendingTransaction = await Vendor.createNewTransaction(dataValues);

    const paymentResponse = await initializePayment(
      user.email,
      amount,
      user.id,
      'vendor',
      pendingTransaction.id
    );

    // Update transaction with payment reference
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