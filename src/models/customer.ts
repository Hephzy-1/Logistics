import { Document, Schema, model } from 'mongoose';

export interface ICustomer extends Document {
  name: string;
  email: string;
  password?: string;
  googleId?: number;
  phoneNumber: string;
  isVerified: boolean;
  token: string;
  otp?: string;
  otpExpires?: Date;
  profilePic?: string;
  resetToken?: string;
  resetTokenExpires?: Date;
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
  googleId: { type: Number, unique: true },
  phoneNumber: { type: String, unique: true, required: true },
  isVerified: { type: Boolean, default: false },
  token: { type: String, select: false },
  otp: String,
  otpExpires: Date ,
  resetToken: String,
  resetTokenExpires: Date
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