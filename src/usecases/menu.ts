import { MenuRepository } from "../repository/menu";
import { IMenu } from "../models/menu";
import { ErrorResponse } from "../utils/errorResponse";

export class Menu {

  static async createNewMenu(menuValues: IMenu) {
    return await MenuRepository.createMenu(menuValues);
  }

  static async getMenu() {
    return await MenuRepository.getMenus();
  }

  static async menuById(id: string) {
    return await MenuRepository.getMenuById(id);
  }

  static async menuByVendorId(vendorId: string) {
    return await MenuRepository.getMenuByVendorId( vendorId);
  }

  static async menusByVerifiedVendors() {
    return await MenuRepository.getMenusByVerifiedVendors;
  }

  static async menusByVendor(vendorId: string) {
    return await MenuRepository.getMenuByVendorId( vendorId);
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
