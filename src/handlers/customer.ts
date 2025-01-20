import asyncHandler from "../middlewares/async";
import { Request, Response, NextFunction } from 'express';
import { Customer } from "../usecases/customer";
import { ErrorResponse } from "../utils/errorResponse";
import { comparePassword, compareToken, hashToken } from "../utils/hash";
import { generateToken } from "../utils/jwt";
import { loginUser, resetLink, resetPass, updatePass, verifyOTPInput } from "../validators";
import crypto from 'crypto';
import { sendOTP, sendResetLink } from "../utils/sendEmail";
import cloudinary from "../utils/cloudinary";
import { profile, registerCustomer, addCart } from "../validators/customer";
import { Vendor } from "../usecases/vendor";
import { AppResponse } from "../middlewares/appResponse";

export const register = asyncHandler(async (req, res, next) => {
  const { error, value } = registerCustomer.validate(req.body);

  if (error) {
    console.error(error.message);
    throw next(new ErrorResponse(error.details[0].message, 400));
  }

  const { name, email, password, phoneNumber, address } = value;

  // Check all collections for existing email
  const customerExists = await Customer.customerByEmail(email);

  if (customerExists) {
    console.error('Customer Already Exists');
    throw next(new ErrorResponse('Customer already exists', 409));
  }

  const newCustomer = await Customer.create(value);

  const sent = await sendOTP(newCustomer.otp, email)

  console.log(newCustomer.otp);

  return AppResponse(res, 201, newCustomer.customer, "Customer registered. Please verify OTP to complete registration.")
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

  return AppResponse(res, 200, customer, 'Customer has successfully logged in')
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

  const sent = await sendOTP(newOTP, customer.email);

  console.log(newOTP);

  // Respond with success 
  return AppResponse(res, 200, customer, "New OTP has been sent")
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
  customer.otp = undefined; // Clear the OTP
  customer.otpExpires = undefined; // Clear OTP expiry
  await customer.save();

  return AppResponse(res, 200, customer, "OTP verified successfully")
});

export const forgetPassword = asyncHandler(async (req, res, next) => {
  const { error, value } = resetLink.validate(req.body); 

  if (error) {
    console.error(error.message);
    throw next(new ErrorResponse(error.details[0].message, 400));
  }

  const { email } = value;

  const exists = await Customer.customerByEmail(email);
  console.log(exists);
  
  if (!exists) {
    throw next( new ErrorResponse("This customer doesn't exists", 404));
  }

  const resetToken = await generateToken(email);
  const expiry = new Date(Date.now() + 1 *60 * 60 * 1000); // New expiration time: 1 hour

  const hashedToken = await hashToken(resetToken);
  console.log(hashedToken)

  exists.resetToken = hashedToken;
  exists.resetTokenExpires = expiry;
  await exists.save();

  const sendMail = await sendResetLink(resetToken, email, 'customer');

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

  const user = await Customer.customerById(id);

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

  const update = await Customer.updatePassword(user.id, newPassword);

  return AppResponse(res, 200, null, 'Password has been updated')
});

export const updatePassword = asyncHandler(async (req, res, next) => {
  const id = req.customer?.id;

  const { error, value } = updatePass.validate(req.body);

  if (error) {
    throw next(new ErrorResponse(error.details[0].message, 400));
  }

  const { oldPassword, newPassword, confirmPassword } = value;

  const user = await Customer.customerById(id);
  console.log(user);

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

  const update = await Customer.updatePassword(id, newPassword);
  
  return AppResponse(res, 200, null, 'Password has been updated');
});

export const uploadProfilePic = (file: Express.Multer.File): Promise<string> => {
  console.log('Uploading file to Cloudinary...');
  console.log('File buffer:', file.buffer);

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: 'image' },
      (error, result) => {
        if (error) {
          console.error('Cloudinary Error:', error);
          reject(new ErrorResponse('Image upload failed', 500));
        } else {
          console.log('Cloudinary Upload Result:', result);
          resolve(result?.secure_url || '');
        }
      }
    );
    uploadStream.end(file.buffer);
  });
};


export const updateProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  req.body.userId = req.customer?._id;

  if (!req.body.userId) {
    return next(new ErrorResponse('User ID is required', 400));
  }

  // Check if user exists
  const user = await Customer.customerById(req.body.userId);
  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  if (req.file) {
    req.body.profilePic = await uploadProfilePic(req.file);
  }

  const userProfile = await Customer.updateProfile(req.body);

  return AppResponse(res, 203, userProfile, 'Profile updated successfully');
});

export const getAllVerifiedVendorsMenu = asyncHandler( async (req, res, next) => {
  const verifiedVendors = await Vendor.verifiedVendorsMenu();

  if (!verifiedVendors) throw next(new ErrorResponse('No Vendors found', 404));

  return AppResponse(res, 200, verifiedVendors, 'Here is the all the verified vendors menu');
});

export const getAllVerifiedVendors = asyncHandler(async (req, res, next) => {
  const verifiedVendors = await Vendor.verifiedVendors();

  if (!verifiedVendors) throw next(new ErrorResponse('No vendors found', 400));

  return AppResponse(res, 200, verifiedVendors, 'Here is the all the verified vendors');
});

export const getSpecificVendorById = asyncHandler(async (req, res, next) => {
  const vendorId = req.params.vendorId;

  const vendor = await Vendor.vendorById(vendorId);

  if (!vendor) {
    throw next(new ErrorResponse('Vendor not found', 404));
  }
  
  return AppResponse(res, 200, vendor, 'Here is the specific vendor')
});

export const getVendorByBusinessName = asyncHandler(async (req, res, next) => {
  const business = req.params.businessName; 
  
  const verifiedBusiness = await Vendor.vendorByBusinessName(business);

  if (!verifiedBusiness || !verifiedBusiness.isVerified) throw next(new ErrorResponse('No Business found', 400));

  return AppResponse(res, 200, null, 'Here is the business info')
});

export const addItemToCart = asyncHandler(async (req, res, next) => {

  const { error, value } = addCart.validate(req.body);

  if (error) {
    throw next(new ErrorResponse(error.details[0].message, 400))
  }
  const { item, quantity } = value;

  value.customerId = req.customer?._id;

  let cart = await Customer.customerCart(value.customerId);

  if (cart) {
    
    const existingItem = cart.items.find((i:any) => i.menuItem.toString() === item.menuItem);

    if (existingItem) {
      
      existingItem.quantity += quantity;
    } else {
      console.log(item);
      cart.items.push({ menuItem: item, quantity });
    }

    cart = await cart.save();
  } else {
    
    const vendorId = await Vendor.vendorIdFromMenu(item);
    console.log(vendorId)

    if (!vendorId) {
      return next(new ErrorResponse("Vendor not found for the given menu item.", 404));
    }

    const cartItems: any = {
      customerId: value.customerId,
      vendorId,
      items: [{ menuItem: item, quantity }], 
    }

    cart = await Customer.createNewCart(cartItems);
  }

  return AppResponse(res, 200, cart, "Item(s) added to cart successfully");
});

export const getCart = asyncHandler(async (req, res, next) => {
  const customerId = req.customer?._id;

  const cart = Customer.customerCart(customerId);

  if (!cart) throw next(new ErrorResponse('No item in cart', 400));

  return AppResponse(res, 200, cart, 'Here is the retrieved cart')
})

export const clearCart = asyncHandler(async (req, res, next) => {
  const customerId = req.customer?._id.toString();

  if (!customerId) {
    return next(new ErrorResponse("Customer ID is required.", 400));
  }

  const result = await Customer.clearCart(customerId);

  if (!result) {
    return next(new ErrorResponse("Failed to clear cart.", 500));
  }

  return AppResponse(res, 200, null, "Cart cleared successfully");
});

export const createOrderFromCart = asyncHandler(async (req, res, next) => {
  const customerId = req.customer?._id.toString();

  const groupedCarts = await Customer.customerCart(customerId);

  if (!groupedCarts || groupedCarts.length === 0) {
    return next(new ErrorResponse("Your cart is empty.", 400));
  }

  const orders = await Promise.all(
    groupedCarts.map(async (group) => {
      const { vendorId, items } = group;

      const totalPrice = items.reduce((sum: number, item: any) => sum + item.quantity * item.price, 0);

      const orderItem = items.map((item: any) => ({
        menuItem: item.menuItem,
        quantity: item.quantity,
        totalPrice: item.quantity * item.price,
      }))

      const order: any = {
        customerId,
        vendorId,
        items: orderItem,
        totalPrice,
      }

      return Customer.createNewOrder(order);
    })
  );

  await Customer.clearCart(customerId);

  return AppResponse(res, 201, orders, "Orders created successfully.");
});