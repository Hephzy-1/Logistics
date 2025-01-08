import { Cart, ICart } from "../models/cart";

export class CartRepository {
  static async createCart(values: ICart) {
    const cart = await Cart.create({
      customerId: values.customerId,
      vendorId: values.vendorId,
      items: values.items,
      totalPrice: values.totalPrice,
    });

    return cart;
  }

  static async getCart() {
    return await Cart.aggregate([
      {
        $lookup: {
          from: "menuitems", // The name of the MenuItem collection
          localField: "items.menuItem", // The field in the Cart that references MenuItem
          foreignField: "_id", // The field in MenuItem collection to match
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

  static async getCartForCustomerAndVendor(customerId: string, vendorId: string) {
    return await Cart.findOne({ customerId, vendorId });
  }

  static async clearCartForCustomer(customerId: string) {
    return await Cart.deleteMany({ customerId });
  }

  static async getCartsGroupedByVendor() {
    return await Cart.aggregate([
      {
        $group: {
          _id: "$vendorId",
          items: { $push: "$$ROOT" },
          totalPrice: { $sum: "$totalPrice" },
        },
      },
      {
        $sort: { "_id": 1 },
      },
    ]);
  }  
}
