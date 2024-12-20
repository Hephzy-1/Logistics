import { Document, Schema, model } from 'mongoose';

export interface IVendor extends Document {
  name: string;
  email: string;
  password?: string;
  googleId?: string;
  phoneNumber: string;
  isVerified: boolean;
  address: string;
  businessName: string;
  businessType: string;
  profilePic: string;
  token: string;
  otp?: string;
  otpExpires?: Date;
  resetToken?: string;
  resetTokenExpires?: Date;
} 

const vendorSchema = new Schema<IVendor>({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { 
    type: String,
    required: function() {
      return !this.googleId;
    }
  },
  googleId: { type: String, unique: true, sparse: true },
  phoneNumber: { type: String, unique: true, required: true },
  address: { type: String, required: true },
  businessType: { type: String, required: true },
  businessName: { type: String, unique: true, required: true },
  isVerified: { type: Boolean, default: false },
  token: { type: String, select: false },
  otp: String,
  otpExpires: Date,
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

const Vendor = model<IVendor>('Vendor', vendorSchema);

export default Vendor;