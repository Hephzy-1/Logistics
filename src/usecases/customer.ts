import { ICustomer } from '../models/customer';
import { CustomerRepository } from '../repository/customer';

export class Customer {
  static async create (customer:ICustomer) {
    return await CustomerRepository.createCustomer(customer);
  }

  static async customerByEmail (email: string) {
    return await CustomerRepository.getCustomerByEmail(email);
  }

  static async customerById (id: string) {
    return await CustomerRepository.getCustomerById(id);
  }

}