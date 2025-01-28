import Vendor, { IVendor } from "../models/vendor";
import { ErrorResponse } from "../utils/errorResponse";
import { hashPassword } from "../utils/hash";
import { generateToken } from "../utils/jwt";
import crypto from 'crypto';
import Menu, { IMenu } from '../models/menu';
import { NextFunction } from "express";
import Order from '../models/order';
import Wallet, { IWallet } from "../models/wallet";

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
    return await Vendor.findOne({ token })
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

  static async updateVendorProfile (values: Partial<IVendor>) {
    const updates: Record<string, any> = {};
  
    for (const key in values) {
      if (values[key as keyof IVendor] !== undefined) {
        updates[key] = values[key as keyof IVendor];
      }
    }
  
    const vendor = await Vendor.updateOne(
      { _id: values.id },
      { $set: updates }
    );
  
    return vendor;
  }

  static async getVerifiedVendors () {
    const verifiedVendors = await Vendor.find({ isVerified: true });

    return verifiedVendors;
  }

  static async getVerifiedVendorsId () {
    const verifiedVendors = await Vendor.find({ isVerified: true }).select("_id");

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
    const vendor = await Vendor.findOne({ businessName }).populate('menus').select('businessName');

    return vendor;
  }
  
  static async createMenu(values: IMenu) {

    // Create menu
    const menu = await Menu.create({
      name: values.name,
      description: values.description,
      itemName: values.itemName,
      price: values.price,
      category: values.category,
      availability: values.availability,
      // picture: values.picture,
      vendorId: values.vendorId,
    });

    return menu;
  }

  static async getMenus() {
    const menus = await Menu.find();
    return menus;
  }

  static async getMenuById(id: string) {
    return await Menu.findById(id);
  }

  static async getMenuByVendorId(vendorId: string) {
    const menu = await Menu.findOne({ vendorId });
    return menu;
  }

  static async getMenusByVerifiedVendors() {
    const verifiedVendors = await VendorRepository.getVerifiedVendors();
    console.log(verifiedVendors)
    const vendorIds = verifiedVendors.map((vendor: any) => vendor._id);

    const menus = await Menu.find({ vendorId: { $in: vendorIds } });
    return menus;
  }

  static async getMenusByCategory(category: string) {
    const menus = await Menu.find({match: { category }})

    return menus.filter((menu) => menu.itemName.length > 0);
  }

  static async deleteMenu(id: string) {
    return await Menu.findByIdAndDelete(id);
  }

  static async getPopulatedMenu() {
    return await Menu.find()
      .populate("vendorId", "name")
      .sort({ createdAt: -1 });
  }

  static async getVendorIdFromMenu(menuId: string) {
    const menu = await Menu.findById(menuId);

    if (!menu) {
      throw new ErrorResponse("Menu not found", 404);
    }

    return menu.vendorId;
  }

  static async updateMenu (values: Partial<IMenu>) {
    const updates: Record<string, any> = {};
  
    for (const key in values) {
      if (values[key as keyof IMenu] !== undefined) {
        updates[key] = values[key as keyof IMenu];
      }
    }
  
    const menu = await Menu.updateOne(
      { _id: values.id },
      { $set: updates }
    );
  
    return menu;
  }

  static async getOrdersByVendor(vendorId: string) {
    const orders = await Order.find({ vendorId })
      .populate('customerId', '_id name')
      .populate('vendorId', '_id businessName')
      .populate('items.menuItem', '_id name price');
    return orders;
  }  

  static async getOrderByIdAndVendorId ( orderId: string, vendorId: string) {
    const order = await Order.findOne({ _id: orderId, vendorId });

    return order;
  }

  static async getAllNewOrders () {
    const order = await Order.find({ orderStatus: 'new' });

    return order;
  }

  static async getParticularOrder(orderId: string) {
    const order = await Order.findById(orderId).populate('vendorId');

    return order;
  }

  static async createWallet (values: IWallet) {
    const newWallet = await Wallet.create({
      customerId: values.customerId,
      balance: 0
    });

    return newWallet;
  }
  static async getVendorWallet(vendorId: string) {
    const vendorWallet = await Wallet.findOne({ customerId: vendorId });

    return vendorWallet;
  }
}