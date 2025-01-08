import express, { NextFunction, Request, Response } from "express";
import asyncHandler from "./middlewares/async";
import errorHandler from "./middlewares/error";
import { AppResponse } from "./middlewares/appResponse";
import cors from 'cors';
import passport from "passport";
import session from "express-session";
import environment from './config/env';
import { ErrorResponse } from "./utils/errorResponse";
import customerRoute, { route } from './deliverymen/customer';
import vendorRoute from './deliverymen/vendor';
import riderRoute from './deliverymen/rider';
import { oAuth } from "./handlers/rider";
import multer from "multer";

const app = express();

if (!environment.SESSION_SECRET) {
  throw new ErrorResponse('Secret key is required', 500);
}

const upload = multer(); // Multer for handling multipart form-data

app.use(express.json());
app.use(cors({ credentials: true }));
app.use(express.urlencoded({ extended: true })); // For x-www-form-urlencoded
app.use(upload.any()); // Enable handling of multipart form-data
app.use(session({ secret: environment.SESSION_SECRET, resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

app.get('/', asyncHandler(async (req: Request, res: Response) => {
  return AppResponse(res, 200, null, 'Welcome');
}));

app.use('/api/v1/customer', customerRoute);
app.use('/api/v1/vendor', vendorRoute);
app.use('/api/v1/rider', riderRoute);
app.get('/api/v1/oauth/google/callback', oAuth);

// Catch-all route for undefined routes
app.all('*', (req: Request, res: Response, next: NextFunction) => {
  const error = new ErrorResponse('Route not found. Check url or method', 404);
  next(error); 
});

app.use(errorHandler);

export default app;