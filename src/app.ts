import express, { Request, Response } from "express";
import asyncHandler from "./middlewares/async";
import errorHandler from "./middlewares/error";
import cors from 'cors';
import passport from "passport";
import session from "express-session";
import environment from './config/env';
import { ErrorResponse } from "./utils/errorResponse";
import authRoute from './deliverymen/auth';

const app = express();

if (!environment.SESSION_SECRET) {
  throw new ErrorResponse('Secret key is required', 500);
}

app.use(express.json());
app.use(cors({ credentials: true }));
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: environment.SESSION_SECRET, resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

app.get('/', asyncHandler(async (req: Request, res: Response) => {
  return res.status(200).json({ message: "Welcome" });
}));

app.use('/api/v1/auth', authRoute);

app.use(errorHandler);

export default app;