import { Menu, IMenu, MenuItem, IMenuItem } from "../models/menu";
import { Vendor } from "../models/vendor"; // Assuming Vendor model exists
import { ErrorResponse } from "../utils/errorResponse";

export class MenuRepository {
  static async createMenuItem(values: IMenuItem) {
    const menuItem = await MenuItem.create({
      itemName: values.itemName,
      price: values.price,
      category: values.category,
      availability: values.availability,
      picture: values.picture,
    });
    return menuItem;
  }

  static async createMenu(values: IMenu, items: IMenuItem[] = []) {
    const menuItemIds = [];

    // Create menu items if provided
    if (items.length > 0) {
      for (const item of items) {
        const menuItem = await this.createMenuItem(item);
        menuItemIds.push(menuItem._id);
      }
    }

    // Create menu
    const menu = await Menu.create({
      name: values.name,
      description: values.description,
      menuItems: menuItemIds,
      vendorId: values.vendorId,
    });

    return menu;
  }

  static async createMenuWithItems(menuValues: IMenu, itemValues: IMenuItem[]) {
    // Validate inputs
    if (!menuValues.name || !menuValues.vendorId) {
      throw new ErrorResponse("Menu name and vendor ID are required.", 400);
    }

    // Create menu and associated items
    const menu = await this.createMenu(menuValues, itemValues);
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
    const verifiedVendors = await Vendor.find({ isVerified: true }).select("_id");
    const vendorIds = verifiedVendors.map((vendor) => vendor._id);

    const menus = await Menu.find({ vendorId: { $in: vendorIds } });
    return menus;
  }

  static async getMenusByCategory(category: string) {
    const menus = await Menu.find().populate({
      path: "menuItems",
      match: { category },
    });

    // Filter menus with at least one item in the specified category
    return menus.filter((menu) => menu.menuItems.length > 0);
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
