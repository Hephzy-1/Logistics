import { CartRepository } from "../repository/cart";
import { ICart } from '../models/cart';

export calss Cart {
  static async create (values: ICart) {
    return await CartRepository.createCart(values);
  }

  static async getCart () {
    return await CartRepository.getCart();
  }
}