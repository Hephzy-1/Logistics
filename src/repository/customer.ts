import Customer, { ICustomer } from "../models/customer";
import { hashPassword } from "../utils/hash";
import { generateToken } from "../utils/jwt";
import crypto from 'crypto';
import Cart, { ICart, ICartItem } from '../models/cart';
import { ErrorResponse } from "../utils/errorResponse";
import Order, { IOrder } from "../models/order";
import mongoose from 'mongoose'; 
import Wallet, { IWallet } from "../models/wallet";
import Transaction, { ITransaction } from "../models/transaction";

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
      address: values.address,
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

  static async getCustomerByResetToken (resetToken: string) {
    const user = await Customer.findOne({ resetToken });
    console.log(user);
    return user;
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

  static async updateCustomerProfile(values: Partial<ICustomer>) {
    const updates: Record<string, any> = {};
  
    for (const key in values) {
      if (values[key as keyof ICustomer] !== undefined) {
        updates[key] = values[key as keyof ICustomer];
      }
    }
  
    const customer = await Customer.updateOne(
      { _id: values.id },
      { $set: updates }
    );
  
    return customer;
  }  
    
  static async createCart(values: ICart) {

    if (!values.customerId) {
      throw new ErrorResponse("CustomerID is required", 500);
    }

    const cart = await Cart.create({
      customerId: values.customerId,
      vendorId: values.vendorId,
      items: values.items
    });
  
    return cart;
  }

  static async clearCartForCustomer(customerId: string) {
    return await Cart.deleteOne({ customerId });
  }

  static async getCartsGroupedByVendor(customerId: string) {
    const cartData = await Cart.aggregate([
      {
        $match: { customerId: new mongoose.Types.ObjectId(customerId) }
      },
      {
        $unwind: "$items"
      },
      {
        $lookup: {
          from: "menus", // Ensure this matches your actual collection name
          localField: "items.menuItem",
          foreignField: "_id",
          as: "menuItemDetails"
        }
      },
      {
        $unwind: "$menuItemDetails"
      },
      {
        $addFields: {
          "items.menuItem": {
            _id: "$menuItemDetails._id",
            price: "$menuItemDetails.price"
          },
          "items.price": {
            $multiply: ["$items.quantity", "$menuItemDetails.price"]
          }
        }
      },
      {
        $group: {
          _id: "$vendorId",
          items: { $push: "$items" },
          totalPrice: { $sum: "$items.price" }
        }
      },
      {
        $project: {
          _id: 0,
          vendorId: { $arrayElemAt: ["$_id", 0] }, 
          items: 1,
          totalPrice: 1
        }
      }
    ]);
  
    console.log(`Aggregated Cart Data: ${JSON.stringify(cartData, null, 2)}`);
  
    return cartData;
  }  
          
  static async getCustomerCart (customerId: string) {
    const cart = Cart.findOne({ customerId });

    return cart;
  }

  static async createOrder(values: IOrder) {

    if (!values.customerId) {
      throw new ErrorResponse("CustomerID is required", 500);
    }

    if (!values.vendorId) {
      throw new ErrorResponse("VendorID is required", 500);
    }

    if (!values.items || values.items.length === 0) {
      throw new ErrorResponse("At least one item is required", 500);
    }

    const order = await Order.create({
      customerId: values.customerId,
      vendorId: values.vendorId,
      items: values.items,
      totalPrice: values.totalPrice,
      availableForPickup: false,
      orderStatus: 'new',
      acceptedStatus: 'pending',
      deliveredStatus: false,
      pickedUp: false
    });

    return order;
  }

  static async getOrdersByCustomer(customerId: string) {
    const orders = await Order.find({ customerId })
      .populate('customerId', '_id name')
      .populate('vendorId', '_id businessName')
      .populate('items.menuItem', '_id name price');
    return orders;
  }

  static async getOrderByIdAndCustomerId ( orderId: string, customerId: string) {
    const order = await Order.findOne({ _id: orderId, customerId });

    return order;
  }
  
  static async createWallet (values: IWallet) {
    const newWallet = await Wallet.create({
      customerId: values.customerId,
      balance: 0
    });

    return newWallet;
  }
  
  static async getCustomerWallet (customerId: string) {
    const customerWallet = await Wallet.findOne({ customerId });
    return customerWallet
  }

  static async getCustomerWalletById (id: string) {
    const customerWallet = await Wallet.findById(id);
    return customerWallet
  }
  
  static async createTransaction (values: ITransaction) {
    const transaction = await Transaction.create({
      customerId: values.customerId,
      amount: values.amount,
      reference: values.reference,
      status: values.status,
      type: values.type
    });

    return transaction

  }

  static async getCustomerTransactionByReference (reference: string) {
    const customerTransaction = await Transaction.findOne({ reference });
    return customerTransaction
  }

  static async getCustomerTransactionByOrderId (orderId: string) {
    const customerTransaction = await Transaction.findOne({ orderId });
    return customerTransaction
  }

  static async getCustomerTransactions (customerId: string) {
    const transactions = await Transaction
      .find({ customerId })
      .sort({ createdAt: -1 });
    return transactions;
  }

  static async updateTransaction(values: ITransaction) {
    const transaction = await Transaction.findOneAndUpdate(
      { _id: values.id },
      { $set: { status: values.status } },
      { new: true } // Returns the updated document
    );
  
    return transaction;
  }
  
}