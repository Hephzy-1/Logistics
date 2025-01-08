import { IMenu } from "../models/menu";
import { MenuRepository } from "../repository/menu";
import { Menu, IMenu, MenuItem, IMenuItem } from "../models/menu";
import { Vendor } from "../models/vendor"; // Assuming Vendor model exists
import { ErrorResponse } from "../utils/errorResponse";

export class Menu {
  static async createItem(values: IMenuItem) {
    return await MenuRepository.createMenuItem(values);
  }

  static async create(values: IMenu, items: IMenuItem[] = []) {
    return await MenuRepository.createMenu(values, items);
  }

  static async createWithItems(menuValues: IMenu, itemValues: IMenuItem[]) {
    return await MenuRepository.createMenuWithItems(menuValues, itemValues);
  }

  static async getMenu() {
    return await MenuRepository.getMenus();
  }

  static async menuById(id: string) {
    return await MenuRepository.getMenuById(id);
  }

  static async menuByVendorId(vendorId: string) {
    return await Menu.getMenuByVendorId( vendorId);
  }

  static async menusByVerifiedVendors() {
    return await MenuRepository.getMenusByVerifiedVendors;
  }

  static async menusByVendor(vendorId: string) {
    return await Menu.getMenusByVendor( vendorId);
  }

  static async menusByCategory(category: string) {
    return await MenuRepository.getMenusByCategory(category);
  }

  static async deleteMenu(id: string) {
    return await MenuRepository.deleteMenu(id);
  }

  static async populatedMenu() {
    return await MenuRepository.getPopulatedMenu();
  }
}
