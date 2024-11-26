import mongoose from 'mongoose';
import environment from './env';
import { ErrorResponse } from '../utils/errorResponse';

const MONGODB_URI = environment.MONGO_URI

if (!MONGODB_URI) {
  throw new ErrorResponse("MONGO_URI is not defined", 500)
}

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

export default connectDB;