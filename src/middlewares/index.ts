import { Request, Response, NextFunction } from 'express';
import { ICustomer } from '../models/customer';
import { Customer } from '../usecases/customer';
import asyncHandler from './async';
import { ErrorResponse } from '../utils/errorResponse';
import { Vendor } from '../usecases/vendor';
import { IVendor } from '../models/vendor';
import { IRider } from '../models/rider';
import { Rider } from '../usecases/rider';

// Extend Express Request type
declare module 'express' {
  export interface Request {
    customer?: ICustomer;
    vendor?: IVendor
    rider?: IRider 
  }
}

// Constants for authentication
const AUTH_CONSTANTS = {
  BEARER_PREFIX: 'Bearer ',
  COOKIE_NAME: 'token',
  ERROR_MESSAGES: {
    TOKEN_MISSING: 'Authentication token is required',
    CUSTOMER_NOT_FOUND: 'Customer not found or session expired',
    RIDER_NOT_FOUND: 'Rider not found or session expired',
    VENDOR_NOT_FOUND: 'Vendor not found or session expired',
    UNAUTHORIZED: 'Unauthorized access',
    ADMIN_ONLY: 'Access denied. Administrator privileges required',
    INVALID_TOKEN: 'Invalid authentication token'
  }
} as const;

/**
 * Extracts token from request headers or cookies
 */
const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  
  if (authHeader?.startsWith(AUTH_CONSTANTS.BEARER_PREFIX)) {
    return authHeader.substring(AUTH_CONSTANTS.BEARER_PREFIX.length);
  }
  
  return req.cookies[AUTH_CONSTANTS.COOKIE_NAME] || null;
};

/**
 * Authentication middleware
 */

// Authenticate Customer
export const protectCustomer = asyncHandler(async (req, res, next): Promise<void> => {
  const token = extractToken(req);

  if (!token) {
    throw new ErrorResponse(AUTH_CONSTANTS.ERROR_MESSAGES.TOKEN_MISSING, 401);
  }

  const customer = await Customer.customerByToken(token);

  if (!customer) {
    throw new ErrorResponse(AUTH_CONSTANTS.ERROR_MESSAGES.CUSTOMER_NOT_FOUND, 401);
  }

  // Attach Customer to request
  req.customer = customer;
  next();
});

// Authenticate Vendor
export const protectVendor = asyncHandler(async (req, res, next): Promise<void> => {
  const token = extractToken(req);

  if (!token) {
    throw new ErrorResponse(AUTH_CONSTANTS.ERROR_MESSAGES.TOKEN_MISSING, 401);
  }

  const vendor = await Vendor.vendorByToken(token);

  if (!vendor) {
    throw new ErrorResponse(AUTH_CONSTANTS.ERROR_MESSAGES.VENDOR_NOT_FOUND, 401);
  }

  // Attach Vendor to request
  req.vendor = vendor;
  next();
});

// Authenticate Rider
export const protectRider = asyncHandler(async (req, res, next): Promise<void> => {
  const token = extractToken(req);

  if (!token) {
    throw new ErrorResponse(AUTH_CONSTANTS.ERROR_MESSAGES.TOKEN_MISSING, 401);
  }

  const rider = await Rider.riderByToken(token);

  if (!rider) {
    throw new ErrorResponse(AUTH_CONSTANTS.ERROR_MESSAGES.RIDER_NOT_FOUND, 401);
  }

  // Attach Rider to request
  req.rider = rider;
  next();
});

/**
 * Resource ownership middleware
 */
export const isOwner = asyncHandler(async (req, res, next): Promise<void> => {
  const { id } = req.params;
  const currentUserId = req.customer?._id || req.vendor?._id || req.rider?._id;

  if (!currentUserId) {
    throw new ErrorResponse(AUTH_CONSTANTS.ERROR_MESSAGES.UNAUTHORIZED, 401);
  }

  // Use strict equality comparison with toString()
  if (currentUserId.toString() !== id.toString()) {
    throw new ErrorResponse(AUTH_CONSTANTS.ERROR_MESSAGES.UNAUTHORIZED, 403);
  }

  next();
});