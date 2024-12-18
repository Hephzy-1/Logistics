import Menu, { IMenu } from "../models/menu";

export class MenuRepository {
  static async createMenu (values: IMenu) {
    const menu = await Menu.create({
      name: values.name,
      description: values.description,
      menuItems: values.menuItems,
      vendorId: values.vendorId, // Assuming vendorId comes from the authenticated user
    });
    
    return menu;
  }

  static async getMenus () {
    const menus = await Menu.find();

    return menus;
  }

  static async getMenuById (id: string) {
    return await Menu.findById(id);
  }

  static async getMenuByVendorId (vendorId: string) {
    const menu = await Menu.findOne({ vendorId });

    return menu;
  }

  static async getMenusOfVerifiedVendors() {
  const menus = await Menu.find({ vendorId: { $in: await Vendor.find({ isVerified: true }).select('_id') } });

  return menus;
}

  // static async updateMenu (id: string, update: Partial<IMenu> ) {
  //   const menu = await Menu.updateOne({
  //     _id: id
  //   }, {
  //     $set: {
  //       name: update.name,
  //       description: update.description,
  //       price: update.price,
  //       picture: update.picture,
  //       category: update.category,
  //       availabilityStatus: update.availabilityStatus
  //     }
  //   });

  //   return menu;
  // }

  static async deleteMenu (id: string) {
    return await Menu.findByIdAndDelete(id);
  }
}