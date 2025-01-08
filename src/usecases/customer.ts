import { ICustomer } from '../models/customer';
import { CustomerRepository } from '../repository/customer';

export class Customer {
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

}