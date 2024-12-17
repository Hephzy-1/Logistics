import { IMenu } from "../models/menu";
import { MenuRepository } from "../repository/menu";

export class Menu {
  static async create (values: IMenu) {
    return await MenuRepository.createMenu(values);
  }

  static async getAllItems () {
    return await MenuRepository.getMenus();
  }
}