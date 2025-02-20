import { ICustomer } from '../models/customer';
import { CustomerRepository } from '../repository/customer';
import { ICart, ICartItem } from '../models/cart';
import { IOrder } from '../models/order';
import { ITransaction } from '../models/transaction';
import { IWallet } from "../models/wallet";

export class CustomerUsecases {
  static async create (customer:ICustomer) {
    return await CustomerRepository.createCustomer(customer);
  }

  static async customerByEmail (email: string) {
    return await CustomerRepository.getCustomerByEmail(email);
  }

  static async customerByToken (token: string) {
    return await CustomerRepository.getCustomerByToken(token);
  }

  static async customerByResetToken (resetToken: string) {
    return await CustomerRepository.getCustomerByToken(resetToken);
  }

  static async customerById (id: string) {
    return await CustomerRepository.getCustomerById(id);
  }
  
  static async updatePassword (id: string, password: string) {
    return await CustomerRepository.updateCustomerPassword(id, password);
  }

  static async updateProfile (values: ICustomer) {
    return await CustomerRepository.updateCustomerProfile(values);
  }

  static async createNewCart (values: ICart) {
    return await CustomerRepository.createCart(values);
  }

  static async clearCart(customerId: string) {
    return await CustomerRepository.clearCartForCustomer(customerId)
  }

  static async groupedCart(customerId: string) {
    return await CustomerRepository.getCartsGroupedByVendor(customerId);
  }

  static async customerCart (customerId: string) {
    return await CustomerRepository.getCustomerCart(customerId);
  }

  static async createNewOrder (values: IOrder) {
    return await CustomerRepository.createOrder(values)
  }

  static async customerOrders (customerId: string) {
    return await CustomerRepository.getOrdersByCustomer(customerId)
  }

  static async orderByIdAndCustomer(orderId: string, customerId: string) {
    return await CustomerRepository.getOrderByIdAndCustomerId(orderId, customerId)
  }

  static async createNewWallet (values: IWallet) {
    return await CustomerRepository.createWallet(values);  
  }
  
  static async customerWallet (customerId: string) {
    return await CustomerRepository.getCustomerWallet(customerId)
  }

  static async customerWalletById (id: string) {
    return await CustomerRepository.getCustomerWalletById(id)
  }

  static async createNewTransaction (values: ITransaction) {
    return await CustomerRepository.createTransaction(values)
  }

  static async customerTransactions (customerId: string) {
    return await CustomerRepository.getCustomerTransactions(customerId)
  }

  static async customerTransactionByReference (reference: string) {
    return await CustomerRepository.getCustomerTransactionByReference(reference)
  }

  static async customerTransactionByOrderId (orderId: string) {
    return await CustomerRepository.getCustomerTransactionByReference(orderId)
  }

  static async updateTransactionStatus (values: ITransaction) {
    return await CustomerRepository.updateTransaction(values)
  }
}