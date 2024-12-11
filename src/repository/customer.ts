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

  static async getCustomerByToken (token: string) {
    return await Customer.findOne({ token });
  }

  static async getCustomerByResetToken (token: string) {
    return await Customer.findOne({ resetToken: token });
  }

  static async getCustomerById (id: string) {
    return await Customer.findById(id);
  }

  static async updateCustomerPassword (id: string, password: string) {
    const hash = await hashPassword(password);

    const customer = await Customer.updateOne({
      _id: id
    }, {
      $set: {
        password: hash
      }
    });

    return customer;
  };
}