import { Document, Schema, model } from 'mongoose';

export interface ICustomer extends Document {
  name: string;
  email: string;
  password?: string;
  googleId?: number;
  phoneNumber?: string;
  isVerified: boolean;
  token: string;
  otp?: string;
  otpExpires?: Date;
  resetToken?: string;
  resetTokenExpires?: Date;
  profilePic?: string;
  address?: string;
  walletId?: string;
} 

const customerSchema = new Schema<ICustomer>({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { 
    type: String,
    required: function() {
      return !this.googleId;
    }
  },
  googleId: { type: Number, unique: true, sparse: true },
  phoneNumber: { type: String, unique: true, required: function() {
    return !this.googleId;
  } },
  isVerified: { type: Boolean, default: false },
  token: { type: String, select: false },
  otp: String,
  otpExpires: Date ,
  resetToken: String,
  resetTokenExpires: Date,
  profilePic: String,
  address: { type: String, required: function() {
    return !this.googleId;
  } },
  walletId: { type: String, required: function() {
    return !this.googleId;
  } },
  
},
{
  toJSON: {
    transform: function (doc, ret) {
      delete ret.password,
      delete ret.__v,
      delete ret.createdAt,
      delete ret.updatedAt,
      delete ret.otpExpires,
      delete ret.otp
    }
  },
  timestamps: true
});

const Customer = model<ICustomer>('Customer', customerSchema);

export default Customer;