import { Request } from 'express';
import { ICustomer } from '../models/customer';
import { Customer } from '../usecases/customer';
import asyncHandler from './async';
import { ErrorResponse } from '../utils/errorResponse';
import { Vendor } from '../usecases/vendor';
import { IVendor } from '../models/vendor';
import { IRider } from '../models/rider';
import { Rider } from '../usecases/rider';
import { verifyToken } from '../utils/jwt';

// Extend Express Request type
declare module 'express' {
  export interface Request {
    customer?: ICustomer;
    vendor?: IVendor;
    rider?: IRider;
  }
}

// Constants for authentication
const AUTH_CONSTANTS = {
  BEARER_PREFIX: 'Bearer ',
  COOKIE_NAME: 'token',
  ERROR_MESSAGES: {
    TOKEN_MISSING: 'Authentication token is required',
    USER_NOT_FOUND: 'User not found or session expired',
    UNAUTHORIZED: 'Unauthorized access',
    INVALID_TOKEN: 'Invalid authentication token',
    TOKEN_EXPIRED: 'Token has expired',
    AUTH_FAILED: 'Authentication failed'
  }
} as const;

/**
 * Extracts token from request headers or cookies
 */
const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;

  if (!authHeader) throw new ErrorResponse('No token found', 401)
  
  if (authHeader?.startsWith(AUTH_CONSTANTS.BEARER_PREFIX)) {
    return authHeader.substring(AUTH_CONSTANTS.BEARER_PREFIX.length);
  }
  
  return req.cookies[AUTH_CONSTANTS.COOKIE_NAME] || null;
};

/**
 * Authentication middleware
 */

export const protect = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    throw new ErrorResponse(AUTH_CONSTANTS.ERROR_MESSAGES.TOKEN_MISSING, 401);
  }

  const decoded = await verifyToken(token);

  if (!decoded) {
    throw next(new ErrorResponse(AUTH_CONSTANTS.ERROR_MESSAGES.TOKEN_EXPIRED, 401));
  }

  // Check for the user in each model
  let user = await Customer.customerByToken(token);
  if (user) {
    req.customer = user as ICustomer;
    return next();
  }

  user = await Vendor.vendorByToken(token);
  if (user) {
    req.vendor = user as IVendor; 
    return next();
  }

  user = await Rider.riderByToken(token);
  if (user) {
    req.rider = user as IRider; 
    return next();
  }

  // If no user is found
  throw new ErrorResponse(AUTH_CONSTANTS.ERROR_MESSAGES.USER_NOT_FOUND, 401);
});

/**
 * Resource ownership middleware 
 */
export const isOwner = asyncHandler(async (req, res, next): Promise<void> => {
  const { id } = req.params; 
  const currentUserId = req.customer?.id || req.vendor?.id || req.rider?.id;

  if (!id) throw next(new ErrorResponse('Id is required in params', 401));

  if (!currentUserId) {
    throw next(new ErrorResponse(AUTH_CONSTANTS.ERROR_MESSAGES.UNAUTHORIZED, 401));
  }

  // Use strict equality comparison with toString()
  if (currentUserId.toString() !== id.toString()) {
    throw next(new ErrorResponse(AUTH_CONSTANTS.ERROR_MESSAGES.UNAUTHORIZED, 403));
  }

  next();
});