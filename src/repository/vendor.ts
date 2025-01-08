import Vendor, { IVendor } from "../models/vendor";
import { ErrorResponse } from "../utils/errorResponse";
import { hashPassword } from "../utils/hash";
import { generateToken } from "../utils/jwt";
import crypto from 'crypto';

export class VendorRepository {
  static async createVendor(values: IVendor) {
    const hash = values.password ? await hashPassword(values.password) : undefined;
  
     // Generate a new OTP
      const otp = Array(6).fill(0).map(() => Math.floor(Math.random() * 10)).join("");
    
      const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");
      const expiry = new Date(Date.now() + 10 * 60 * 1000); // New expiration time: 10 minutes
  
    const newToken = await generateToken(values.email);
  
    const vendorData = {
      name: values.name,
      email: values.email,
      phoneNumber: values.phoneNumber,
      password: hash,
      token: newToken,
      otp: hashedOTP,
      otpExpires: expiry,
      address: values.address,
      businessName: values.businessName,
      businessType: values.businessType
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

  static async getVendorByToken (token: string) {
    return await Vendor.findById({ token })
  };

  static async getVendorByResetToken (token: string) {
    return await Vendor.findById({ ResetToken: token });
  };

  static async updateVendorPassword (id: string, password: string) {
    const hash = await hashPassword(password);

    const vendor = await Vendor.updateOne({
      _id: id
    }, {
      $set: {
        password: hash
      }
    });

    return vendor;
  };

  static async updateVendorProfile (values: IVendor) {
    const vendor = await Vendor.updateOne({
      _id: values.id,
    }, {
      $set: {
        profilePic: values.profilePic,
        address: values.address,
        phoneNumber: values.phoneNumber,
        businessName: values.businessName,
        businessType: values.businessType
      }
    });

    return vendor;
  }

  static async getVerifiedVendors () {
    const verifiedVendors = await Vendor.find({ isVerified: true });

    return verifiedVendors;
  }

  static async getVerifiedVendorsWithMenus () {
    const verifiedVendorsMenu = await Vendor.find({ isVerified: true }).populate('menus');

    return verifiedVendorsMenu;
  }

  static async getVendorByName (name: string) {
    const vendor = await Vendor.findOne({ name });

    return vendor;
  }

  static async getVendorByBusinessName (businessName: string) {
    const vendor = await Vendor.findOne({ businessName }).populate('menus').select('businessName, ');

    return vendor;
  }
  
  
}