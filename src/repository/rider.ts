import Rider, { IRider } from "../models/rider";
import { hashPassword } from "../utils/hash";
import { generateToken } from "../utils/jwt";
import crypto from 'crypto';
import Order from "../models/order";
import Wallet, { IWallet } from "../models/wallet";
import Transaction, { ITransaction } from "../models/transaction";

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
      address: values.address,
      vehicleNumber: values.vehicleNumber,
      vehicleType: values.vehicleType,
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

  static async getRiderByResetToken (token: string) {
    return await Rider.findOne({ resetToken: token })
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

  static async updateRiderProfile (values: IRider) {
    const rider = await Rider.updateOne({
      _id: values.id,
    }, {
      $set: {
        profilePic: values.profilePic,
        address: values.address,
        phoneNumber: values.phoneNumber,
        vehicleNumber: values.vehicleNumber,
        vehicleType: values.vehicleType
      }
    });

    return rider;
  }

  static async getAllOrders() {
    const orders = await Order.find()
      .populate('customerId', '_id name')
      .populate('vendorId', '_id businessName')
      .populate('items.menuItem', '_id name price');
    return orders;
  }
  
  static async getOrderByIdAndRiderId ( orderId: string, riderId: string) {
    const order = await Order.findOne({ _id: orderId, riderId });

    return order;
  } 

  static async createWallet (values: IWallet) {
    const newWallet = await Wallet.create({
      riderId: values.riderId,
      balance: 0
    });

    return newWallet;
  }

  static async getRiderWallet(riderId: string) {
    const riderWallet = await Wallet.findOne({ customerId: riderId });
    return riderWallet;
  }

  static async getRiderWalletById (id: string) {
    const riderWallet = await Wallet.findById(id);
    return riderWallet;
  }

  static async createTransaction (values: ITransaction) {
    const transaction = await Transaction.create({
      riderId: values.riderId,
      amount: values.amount,
      reference: values.reference,
      status: values.status,
      type: values.type
    });

    return transaction

  }

  static async getRiderTransactionByReference(reference: string) {
    const riderTransaction = await Transaction.findOne({ reference });
    return riderTransaction;
  }

  static async updateTransaction(values: Partial<ITransaction>) {
    const updates: Record<string, any> = {};
  
    for (const key in values) {
      if (values[key as keyof ITransaction] !== undefined) {
        updates[key] = values[key as keyof ITransaction];
      }
    }
  
    const transaction = await Transaction.findOneAndUpdate(
      { _id: values.id },
      { $set: updates },
      { new: true } 
    );
  
    console.log('Updated transacrion:', transaction);
    return transaction;
  }
}