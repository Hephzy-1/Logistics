import { Document, Schema, model } from 'mongoose';

export interface IRider extends Document {
  name: string;
  email: string;
  password?: string;
  googleId?: number;
  phoneNumber?: string;
  isVerified: boolean;
  address?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  profilePic?: string;
  token: string;
  otp?: string;
  otpExpires?: Date;
  resetToken?: string;
  resetTokenExpires?: Date;
  walletId?: string;
} 

const riderSchema = new Schema<IRider>({
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
  address: { type: String, required: function() {
    return !this.googleId;
  } },
  vehicleNumber: { type: String, unique: true, required: function() {
    return !this.googleId;
  } },
  vehicleType: { type: String, required: function() {
    return !this.googleId;
  } },
  profilePic: { type: String, default: '' },
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

const Rider = model<IRider>('Rider', riderSchema);

export default Rider;