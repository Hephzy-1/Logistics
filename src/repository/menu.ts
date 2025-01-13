import Menu, { IMenu } from "../models/menu";
import { VendorRepository } from "../repository/vendor"; 
import { ErrorResponse } from "../utils/errorResponse";

export class MenuRepository {

  static async createMenu(values: IMenu) {
    // Validate inputs
    if (!values.name || !values.vendorId) {
      throw new ErrorResponse("Menu name and vendor ID are required.", 400);
    }

    // Create menu
    const menu = await Menu.create({
      name: values.name,
      description: values.description,
      itemName: values.itemName,
      price: values.price,
      category: values.category,
      availability: values.availability,
      picture: values.picture,
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
    const vendorIds = verifiedVendors.map((vendor: any) => vendor._id);

    const menus = await Menu.find({ vendorId: { $in: vendorIds } });
    return menus;
  }

  static async getMenusByCategory(category: string) {
    const menus = await Menu.find({match: { category }})

    // Filter menus with at least one item in the specified category
    return menus.filter((menu) => menu.itemName.length > 0);
  }

  static async deleteMenu(id: string) {
    return await Menu.findByIdAndDelete(id);
  }

  static async getPopulatedMenu() {
    return await Menu.find()
      .populate("vendorId", "name")
      .populate("menuItems", "picture itemName price category availability")
      .sort({ createdAt: -1 });
  }
}
