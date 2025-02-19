import asyncHandler from "../middlewares/async";
import { Request, Response, NextFunction } from 'express';
import { CustomerUsecases } from "../usecases/customer";
import { ErrorResponse } from "../utils/errorResponse";
import { comparePassword, compareToken, hashToken } from "../utils/hash";
import { generateToken } from "../utils/jwt";
import { loginUser, resetLink, resetPass, updatePass, verifyOTPInput, addWallet } from "../validators";
import crypto from 'crypto';
import { sendOTP, sendResetLink } from "../services/email/sendEmail";
import { uploadImageToCloudinary, validateImage } from "../utils/cloudinary";
import { profile, registerCustomer, addCart, removeCart } from "../validators/customer";
import { VendorUsecases } from "../usecases/vendor";
import { AppResponse } from "../middlewares/appResponse";
import { RiderUsecases } from "../usecases/rider";
import { orderStatus } from "../validators/vendor";
import { initializePayment, } from '../services/payment/payment';
import environment from "../config/env";


export const register = asyncHandler(async (req, res, next) => {
  const { error, value } = registerCustomer.validate(req.body);

  if (error) {
    console.error(error.message);
    throw next(new ErrorResponse(error.details[0].message, 400));
  }

  const { name, email, password, phoneNumber, address } = value;

  const customerExists = await CustomerUsecases.customerByEmail(email);

  if (customerExists) {
    console.error('Customer Already Exists');
    throw next(new ErrorResponse('Customer already exists', 409));
  }

  const newCustomer = await CustomerUsecases.create(value);

  const existingWallet = await CustomerUsecases.customerWallet(newCustomer.customer.id);

  if (existingWallet) {
    throw next(new ErrorResponse('Wallet already exists for this customer.', 400));
  }

  const newWallet = await CustomerUsecases.createNewWallet(newCustomer.customer.id);

  newCustomer.customer.walletId = newWallet.id;

  await newCustomer.customer.save();

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

  const customer = await CustomerUsecases.customerByEmail(email);

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

  const customer = await CustomerUsecases.customerById(customerId);

  if (!customer) {
    console.error("Customer not found");
    throw next(new ErrorResponse("Customer not found", 404));
  }

  const newOTP = Array(6).fill(0).map(() => Math.floor(Math.random() * 10)).join("");

  const hashedOTP = crypto.createHash("sha256").update(newOTP).digest("hex");
  const expiry = new Date(Date.now() + 10 * 60 * 1000); 

  customer.otp = hashedOTP;
  customer.otpExpires = expiry;
  await customer.save();

  const sent = await sendOTP(newOTP, customer.email);

  console.log(newOTP);
 
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

  const customer = await CustomerUsecases.customerById(customerId);

  if (!customer) {
    console.error("customer not found");
    throw next(new ErrorResponse("customer not found", 404));
  }

  if (!customer.otpExpires || customer.otpExpires.getTime() < Date.now()) {
    console.error("OTP has expired");
    throw next(new ErrorResponse("OTP has expired", 400));
  }

  const hashedOTP = crypto.createHash("sha256").update(String(otp)).digest("hex");

  if (customer.otp !== hashedOTP) {
    console.error("Invalid OTP");
    throw next(new ErrorResponse("Invalid OTP", 400));
  }

  customer.isVerified = true;
  customer.otp = undefined; 
  customer.otpExpires = undefined; 
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

  const exists = await CustomerUsecases.customerByEmail(email);
  
  if (!exists) {
    throw next( new ErrorResponse("This customer doesn't exists", 404));
  }

  const resetToken = await generateToken(email);
  const expiry = new Date(Date.now() + 1 *60 * 60 * 1000); 

  const hashedToken = await hashToken(resetToken);

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

  const user = await CustomerUsecases.customerById(id);

  if (!user || !user.resetToken) {
    throw next(new ErrorResponse('No user found', 404));
  }

  if (!user.resetTokenExpires || user.resetTokenExpires.getTime() < Date.now()) {
    console.error("Reset token has expired");
    throw next(new ErrorResponse("Reset token has expired", 402));
  }

  const hashedToken = await compareToken(token, user.resetToken);

  const update = await CustomerUsecases.updatePassword(user.id, newPassword);

  return AppResponse(res, 200, null, 'Password has been updated')
});

export const updatePassword = asyncHandler(async (req, res, next) => {
  const id = req.customer?.id;

  const { error, value } = updatePass.validate(req.body);

  if (error) {
    throw next(new ErrorResponse(error.details[0].message, 400));
  }

  const { oldPassword, newPassword, confirmPassword } = value;

  const user = await CustomerUsecases.customerById(id);
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

  const update = await CustomerUsecases.updatePassword(id, newPassword);
  
  return AppResponse(res, 200, null, 'Password has been updated');
});

export const updateProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  req.body.userId = req.customer?._id;

  if (!req.body.userId) {
    return next(new ErrorResponse('User ID is required', 400));
  }

  const user = await CustomerUsecases.customerById(req.body.userId);
  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  if (req.file) {

    if (!validateImage(req.file)) {
      throw next(new ErrorResponse('Invalid image type', 400));
    }
    
    const imageUrl = await uploadImageToCloudinary(req.file)
    req.body.profilePic = imageUrl
  }
  
  const userProfile = await CustomerUsecases.updateProfile(req.body);

  return AppResponse(res, 203, userProfile, 'Profile updated successfully');
});

export const getAllVerifiedVendorsMenu = asyncHandler( async (req, res, next) => {
  const verifiedVendors = await VendorUsecases.verifiedVendorsMenu();

  if (!verifiedVendors) throw next(new ErrorResponse('No Vendors found', 404));

  return AppResponse(res, 200, verifiedVendors, 'Here is the all the verified vendors menu');
});

export const getAllVerifiedVendors = asyncHandler(async (req, res, next) => {
  const verifiedVendors = await VendorUsecases.verifiedVendors();

  if (!verifiedVendors) throw next(new ErrorResponse('No vendors found', 400));

  return AppResponse(res, 200, verifiedVendors, 'Here is the all the verified vendors');
});

export const getSpecificVendorById = asyncHandler(async (req, res, next) => {
  const vendorId = req.params.vendorId;

  const vendor = await VendorUsecases.vendorById(vendorId);

  if (!vendor) {
    throw next(new ErrorResponse('Vendor not found', 404));
  }
  
  return AppResponse(res, 200, vendor, 'Here is the specific vendor')
});

export const getVendorByBusinessName = asyncHandler(async (req, res, next) => {
  const business = req.params.businessName; 
  
  const verifiedBusiness = await VendorUsecases.vendorByBusinessName(business);

  if (!verifiedBusiness || !verifiedBusiness.isVerified) throw next(new ErrorResponse('No Business found', 400));

  return AppResponse(res, 200, null, 'Here is the business info')
});

export const addItemToCart = asyncHandler(async (req, res, next) => {
  const { error, value } = addCart.validate(req.body);

  if (error) {
    return next(new ErrorResponse(error.details[0].message, 400));
  }

  const { item, quantity } = value;
  value.customerId = req.customer?._id;

  const vendorId = await VendorUsecases.vendorIdFromMenu(item);
  if (!vendorId) {
    return next(new ErrorResponse("Vendor not found for the given menu item.", 404));
  }

  let cart = await CustomerUsecases.customerCart(value.customerId);

  if (cart) {

    const existingItem = cart.items.find((i: any) => i.menuItem._id.toString() === item);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {

      cart.items.push({ menuItem: item, quantity });
    }

    if (!cart.vendorId.some((id: any) => id.toString() === vendorId.toString())) {
      cart.vendorId.push(vendorId); 
    }

    cart = await cart.populate('items.menuItem', 'price');
    cart.totalPrice = cart.items.reduce((sum: number, currentItem: any) => {
      const itemTotalPrice = currentItem.menuItem.price * currentItem.quantity;
      return sum + itemTotalPrice;
    }, 0);

    cart = await cart.save();
  } else {

    const cartItems: any = {
      customerId: value.customerId,
      vendorId: [vendorId], 
      items: [{ menuItem: item, quantity }],
      totalPrice: item.price * quantity,
    };

    cart = await CustomerUsecases.createNewCart(cartItems);
  }

  return AppResponse(res, 200, cart, "Item(s) added to cart successfully");
});

export const getCart = asyncHandler(async (req, res, next) => {
  const customerId = req.customer?._id as string;

  const cartVendors = await CustomerUsecases.groupedCart(customerId);

  if (!cartVendors || cartVendors.length === 0) {
    return next(new ErrorResponse('No items in cart', 400));
  }

  const grandTotal = cartVendors.reduce(
    (sum: number, vendor) => sum + vendor.totalPrice,
    0
  );

  const responseData = {
    vendors: cartVendors,
    grandTotal
  };

  return AppResponse(res, 200, responseData, 'Here is the retrieved cart');
});

export const removeItemFromCart = asyncHandler(async (req, res, next) => {
  const { error, value } = removeCart.validate(req.body);

  if (error) {
    return next(new ErrorResponse(error.details[0].message, 400));
  }

  const { item } = value;
  value.customerId = req.customer?._id;

  let cart = await CustomerUsecases.customerCart(value.customerId);

  if (cart) {
    const existingItem = cart.items.find((i) => i.menuItem._id.toString() === item);
    if (existingItem) {
      if (existingItem.quantity > 1) {
        existingItem.quantity -= 1;
      } else {
        cart.items = cart.items.filter((i) => i.menuItem._id.toString() !== item);
      }
    }

    cart = await cart.populate('items.menuItem', 'price');
    cart.totalPrice = cart.items.reduce((sum: number, currentItem: any) => {
      const itemTotalPrice = currentItem.menuItem.price * currentItem.quantity;
      return sum + itemTotalPrice;
    }, 0);

    cart = await cart.save();
  } else {
    return next(new ErrorResponse("Cart not found.", 404));
  }

  return AppResponse(res, 200, cart, "Item removed from cart successfully");
});

export const clearCart = asyncHandler(async (req, res, next) => {
  const customerId = req.customer?._id as string;

  if (!customerId) {
    return next(new ErrorResponse("Customer ID is required.", 400));
  }

  const result = await CustomerUsecases.clearCart(customerId);

  if (!result) {
    return next(new ErrorResponse("Failed to clear cart.", 500));
  }

  return AppResponse(res, 200, null, "Cart cleared successfully");
});

export const createOrderFromCart = asyncHandler(async (req, res, next) => {
  const customerId = req.customer?._id as string;

  const cartItemsGroupedByVendor = await CustomerUsecases.groupedCart(customerId);

  if (!cartItemsGroupedByVendor || cartItemsGroupedByVendor.length === 0) {
    return next(new ErrorResponse("Your cart is empty.", 400));
  }

  const orders = await Promise.all(
    cartItemsGroupedByVendor.map(async (vendorCart) => {
      const { vendorId, items, totalPrice } = vendorCart;

      const orderItems = items.map((item: any) => ({
        menuItem: item.menuItem._id,
        quantity: item.quantity,
        price: item.price 
      }));

      const order: any = {
        customerId,
        vendorId,
        items: orderItems,
        totalPrice,
      };

      return CustomerUsecases.createNewOrder(order);
    })
  );

  await CustomerUsecases.clearCart(customerId);

  return AppResponse(res, 201, orders, "Orders created successfully.");
});

export const getOrdersByCustomer = asyncHandler(async (req, res, next) => {
  const customerId = req.customer?._id as string;
  const orders = await CustomerUsecases.customerOrders(customerId);

  if (!orders || orders.length === 0) {
    throw next(new ErrorResponse('No orders found', 404));
  }

  return AppResponse(res, 200, orders, `Orders for customer ${customerId} retrieved successfully.`);
});

export const updateDeliveredStatus = asyncHandler(async (req, res, next) => {
  const customerId = req.customer?._id as string;

  const { error, value } = orderStatus.validate(req.body);

  if (error) {
    throw next(new ErrorResponse(error.details[0].message, 400));
    
  }
  const { orderId, status } = value;

  const order = await CustomerUsecases.orderByIdAndCustomer(orderId, customerId);

  if (!order) {
    throw next(new ErrorResponse("Order not found or does not belong to this vendor", 404));
  }

  if (order.orderStatus !== 'delivered') {
    throw next(new ErrorResponse("Only delivered orders can be updated", 400));
  }

  order.confirmDeliverdByCustomer = status === 'true' ? true : false;
  await order.save();

  return AppResponse(res, 200, order, `Order status updated to ${status}.`);
});

export const createWallet = asyncHandler(async (req, res, next) => {
  const userId = req.customer?._id as string;

  const existingWallet = await CustomerUsecases.customerWallet(userId);
  if (existingWallet) {
    throw next(new ErrorResponse('Wallet already exists for this customer.', 400));
  }

  const wallet: any = {
    customerId: userId
  };

  const newWallet = await CustomerUsecases.createNewWallet(wallet);

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
      customerId: user.id
    }

    const pendingTransaction = await CustomerUsecases.createNewTransaction(dataValues);

    const paymentResponse = await initializePayment(
      user.email,
      amount, 
      user.id,
      'customer',
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

export const payOrderAmountToVendor = asyncHandler(async (req, res, next) => {
  const customerId = req.customer?._id as string; 
  const { orderId } = req.body;
  const order = await VendorUsecases.getOrder(orderId)
  
  if (!order || !order.vendorId) {
    throw next(new ErrorResponse('Order not found.', 404));
  }

  const vendorWallet = await VendorUsecases.vendorWallet(String(order.vendorId));
  if (!vendorWallet) {
    throw next(new ErrorResponse('Vendor wallet not found.', 404));
  }

  const customerWallet = await CustomerUsecases.customerWallet(customerId)

  if (!customerWallet) {
    throw next(new ErrorResponse('Customer Wallet not found', 404));
  }

  if (customerWallet.balance < order.totalPrice) {
    throw next(new ErrorResponse('Insufficient balance', 400));
  }

  customerWallet.balance -= order.totalPrice;

  const customerTransactValues: any = {
    amount: order.totalPrice,
    type: 'debit',
    date: new Date(),
    description: `Payment for Order ID: ${orderId}`,
    status: 'completed'
  }

  const customerTransaction = CustomerUsecases.createNewTransaction(customerTransactValues)

  vendorWallet.balance += order.totalPrice;
  
  const vendorTransactValues: any = {
    amount: order.totalPrice,
    type: 'credit',
    date: new Date(),
    description: `Payment for Order ID: ${orderId}`,
    status: 'completed'
  }

  const vendorTransaction = await VendorUsecases.createNewTransaction(vendorTransactValues)

  return AppResponse(res, 200, { customerTransaction, vendorTransaction }, 'Payment has been made');
});

export const payOrderAmountToRider = asyncHandler(async (req, res, next) => {
  const customerId = req.customer?._id as string; 
  const { orderId } = req.body;
  const order = await VendorUsecases.getOrder(orderId)
  
  if (!order || !order.riderId) {
    throw next(new ErrorResponse('Order not found.', 404));
  }

  const riderWallet = await RiderUsecases.riderWallet(String(order.riderId));
  if (!riderWallet) {
    throw next(new ErrorResponse('Vendor wallet not found.', 404));
  }

  const customerWallet = await CustomerUsecases.customerWallet(customerId)

  if (!customerWallet) {
    throw next(new ErrorResponse('Customer Wallet not found', 404));
  }

  if (customerWallet.balance < order.deliveryFee) {
    throw next(new ErrorResponse('Insufficient balance', 400));
  }

  customerWallet.balance -= order.deliveryFee;
  
  const customerTransactValues: any = {
    amount: order.deliveryFee,
    type: 'debit',
    date: new Date(),
    description: `Payment for Order ID: ${orderId}`,
    status: 'pending'
  }

  const customerTransaction = await CustomerUsecases.createNewTransaction(customerTransactValues);

  return AppResponse(res, 200, customerTransaction , 'Payment has been made');
});

export const getWalletBalance = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.customer?.id;
  
  if (!userId) {
    throw next(new ErrorResponse('User not found', 404));
  }

  const wallet = await CustomerUsecases.customerWallet(userId);

  if (!wallet) {
    throw next(new ErrorResponse('Wallet not found', 404));
  }

  return AppResponse(res, 200, { balance: wallet.balance }, 'Wallet balance retrieved');
});

export const getTransactionHistory = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const user = req.customer;
  
  if (!user) {
    throw next(new ErrorResponse('User not found', 404));
  }

  const transactions = await CustomerUsecases.customerTransactions(user.id);

  return AppResponse(res, 200, { transactions }, 'Transaction history retrieved');
});