import { Document, Schema, model } from 'mongoose';

export interface IVendor extends Document {
  name: string;
  email: string;
  password?: string;
  googleId?: number;
  phoneNumber?: string;
  isVerified: boolean;
  address?: string;
  businessName?: string;
  businessType?: string;
  profilePic?: string;
  token: string;
  otp?: string;
  otpExpires?: Date;
  resetToken?: string;
  resetTokenExpires?: Date;
  walletId?: string;
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
  googleId: { type: Number, unique: true, sparse: true },
  phoneNumber: { type: String, unique: true, required: function() {
    return !this.googleId;
  } },
  address: { type: String, required: function() {
    return !this.googleId;
  } },
  businessType: { type: String, required: function() {
    return !this.googleId;
  } },
  businessName: { type: String, unique: true, required: function() {
    return !this.googleId;
  } },
  isVerified: { type: Boolean, default: false },
  token: { type: String, select: false },
  otp: String,
  otpExpires: Date,
  resetToken: String,
  resetTokenExpires: Date,
  walletId: { type: String, required: function() {
    return !this.googleId;
  } }
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