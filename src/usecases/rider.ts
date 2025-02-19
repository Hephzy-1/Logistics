import { IRider } from '../models/rider';
import { RiderRepository } from '../repository/rider';
import { IWallet } from "../models/wallet";
import { ITransaction } from "../models/transaction";

export class RiderUsecases {
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

  static async createNewWallet (values: IWallet) {
    return await RiderRepository.createWallet(values);  
  }

  static async riderWallet (riderId: string) {
    return await RiderRepository.getRiderWallet(riderId)
  }

  static async riderWalletById (id: string) {
    return await RiderRepository.getRiderWalletById(id)
  }

  static async createNewTransaction (values: ITransaction) {
    return await RiderRepository.createTransaction(values)
  }
  
  // static async riderTransactions (riderId: string) {
  //   return await RiderRepository.getRiderTransactions(riderId)
  // }

  static async riderTransactionByReference (reference: string) {
    return await RiderRepository.getRiderTransactionByReference(reference)
  }

  static async updateTransactionStatus (values: ITransaction) {
    return await RiderRepository.updateTransaction(values)
  }
}