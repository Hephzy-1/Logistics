import Vendor, { IVendor } from "../models/vendor";
import { ErrorResponse } from "../utils/errorResponse";
import { hashPassword } from "../utils/hash";
import { generateToken } from "../utils/jwt";
import crypto from 'crypto';

export class VendorRepository {
  static async createVendor(values: IVendor) {
    const hash = values.password ? await hashPassword(values.password) : undefined;
  
    const otp = Array(6).fill(0).map(() => Math.floor(Math.random() * 10)).join('');
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiry = new Date(Date.now() + 10 * 60 * 1000)
  
    const newToken = await generateToken(values.email);
  
    const vendorData = {
      name: values.name,
      email: values.email,
      phoneNumber: values.phoneNumber,
      password: hash,
      token: newToken,
      otp: otpHash,
      otpExpires: expiry,
    };
    const vendor = await new Vendor(vendorData).save();
    return { vendor, otp };
    
  }  

  static async getVendorByEmail (email: string) {
    return await Vendor.findOne({ email });
  }

  static async getVendorById (id: string) {
    return await Vendor.findById(id);
  }

  static async getVendorOTPById (id: string) {
    return await Vendor.findById(id).select("+otp otpExpires")
  }
}