import Customer, { ICustomer } from "../models/customer";
import { hashPassword } from "../utils/hash";
import { generateToken } from "../utils/jwt";
import crypto from 'crypto';
import Cart, { ICart, ICartItem } from '../models/cart';
import { ErrorResponse } from "../utils/errorResponse";

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
      items: values.items,
    });
  
    return cart;
  }

  static async getCart() {
    return await Cart.aggregate([
      {
        $lookup: {
          from: "menu", 
          localField: "items.menuItem", 
          foreignField: "_id", 
          as: "menuItems",
        },
      },
      {
        $group: {
          _id: "$vendorId",
          items: { $push: "$$ROOT" },
          totalPrice: { $sum: "$totalPrice" },
        },
      },
      {
        $sort: { "_id": 1 }, // Sort by vendorId
      },
    ]);
  }

  static async clearCartForCustomer(customerId: string) {
    return await Cart.deleteOne({ customerId });
  }

  static async getCartsGroupedByVendor() {
    const cart = await Cart.aggregate([
      {
        $lookup: {
          from: "Menu",
          localField: "items.menuItem",
          foreignField: "_id",
          as: "menuItems", 
        },
      },
  
      { $unwind: "$items" },
  
      {
        $addFields: {
          "items.totalPrice": {
            $multiply: [
              { $arrayElemAt: ["$menuItems.price", 0] }, 
              "$items.quantity",
            ],
          },
        },
      },
  
      {
        $group: {
          _id: {
            vendorId: "$vendorId",
            customerId: "$customerId",
          },
          items: { $push: "$items" },
          totalPrice: { $sum: "$items.totalPrice" }, 
          createdAt: { $first: "$createdAt" },
          updatedAt: { $first: "$updatedAt" },
        },
      },
  
      {
        $group: {
          _id: "$_id.vendorId",
          carts: {
            $push: {
              _id: "$_id.customerId",
              items: "$items",
              totalPrice: "$totalPrice",
              createdAt: "$createdAt",
              updatedAt: "$updatedAt",
            },
          },
          totalPrice: { $sum: "$totalPrice" }, 
        },
      },
  
      { $sort: { "_id": 1 } },
    ]);

    console.log(cart);
    return cart;
  }
  
  static async getCustomerCart (customerId: string) {
    const cart = Cart.findOne({ customerId });

    return cart;
  }

  static async createOrder (values: IOrder) {

    const order = await Order.create({
      customerId: values.customerId,
      vendorId: values.vendorId,
      items: values.items
    });

    return menu;
  }
}