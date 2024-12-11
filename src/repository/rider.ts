import Rider, { IRider } from "../models/rider";
import { hashPassword } from "../utils/hash";
import { generateToken } from "../utils/jwt";
import crypto from 'crypto';

export class RiderRepository {
  static async createRider (values: IRider) {
    const hash = values.password ? await hashPassword(values.password) : undefined;

    const otp = Array(6).fill(0).map(() => Math.floor(Math.random() * 10)).join('');
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiry = Date.now() + 10 * 60 * 1000;

    const newToken = await generateToken(values.email);

    const rider = await new Rider({
      name: values.name,
      email: values.email,
      password: hash,
      phoneNumber: values.phoneNumber,
      token: newToken,
      otp: otpHash, 
      otpExpires: expiry
    }).save();

    return { rider, otp };
  }

  static async getRiderByEmail (email: string) {
    return await Rider.findOne({ email });
  }

  static async getRiderById (id: string) {
    return await Rider.findById(id);
  }

  static async getRiderByToken (token: string) {
    return await Rider.findOne({ token })
  };

  static async updateRiderPassword (id: string, password: string) {
    const hash = await hashPassword(password);

    const rider = await Rider.updateOne({
      _id: id
    }, {
      $set: {
        password: hash
      }
    });

    return rider;
  };
}