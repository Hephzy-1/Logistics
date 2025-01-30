import { IRider } from '../models/rider';
import { RiderRepository } from '../repository/rider';

export class Rider {
  static async create (rider:IRider) {
    return await RiderRepository.createRider(rider);
  }

  static async riderByEmail (email: string) {
    return await RiderRepository.getRiderByEmail(email);
  }

  static async riderById (id: string) {
    return await RiderRepository.getRiderById(id);
  }

  static async riderByToken (token: string) {
    return await RiderRepository.getRiderByToken(token);
  }

  static async riderByResetToken (token: string) {
    return await RiderRepository.getRiderByResetToken(token);
  }

  static async updatePassword (id: string, password: string) {
    return await RiderRepository.updateRiderPassword(id, password);
  }

  static async updateProfile (values: IRider) {
    return await RiderRepository.updateRiderProfile(values);
  }

  static async allOrders () {
    return await RiderRepository.getAllOrders()
  }

  static async orderByIdAndRider (orderId: string, riderId: string) {
    return await RiderRepository.getOrderByIdAndRiderId(orderId, riderId)
  }

  static async riderWallet (riderId: string) {
      return await RiderRepository.getRiderWallet(riderId)
    }
}