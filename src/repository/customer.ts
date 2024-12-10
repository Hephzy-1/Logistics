import Customer, { ICustomer } from "../models/customer";
import { hashPassword } from "../utils/hash";
import { generateToken } from "../utils/jwt";
import crypto from 'crypto';

export class CustomerRepository {
  static async createCustomer (values: ICustomer) {
    const hash = values.password ? await hashPassword(values.password) : undefined;

    const otp = Array(6).fill(0).map(() => Math.floor(Math.random() * 10)).join('');
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiry = Date.now() + 10 * 60 * 1000;

    const newToken = await generateToken(values.email)

    const customer = await new Customer({
      name: values.name,
      email: values.email,
      password: hash,
      phoneNumber: values.phoneNumber,
      token: newToken,
      otp: otpHash,
      otpExpires: expiry
    }).save();

    return {customer, otp};
  }

  static async getCustomerByEmail (email: string) {
    return await Customer.findOne({ email });
  }

  static async getCustomerByGoogleId (googleId: number) {
    return await Customer.findOne({ googleId });
  }

  static async getCustomerById (id: string) {
    return await Customer.findById(id);
  }

  static async getCustomerOTPById (id: string) {
    return await Customer.findById(id).select("+otp otpExpires")
  }
}