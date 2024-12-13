import { IVendor } from '../models/vendor';
import { VendorRepository } from '../repository/vendor';

export class Vendor {
  static async create (vendor:IVendor) {
    return await VendorRepository.createVendor(vendor);
  }

  static async vendorByEmail (email: string) {
    return await VendorRepository.getVendorByEmail(email);
  }

  static async vendorById (id: string) {
    return await VendorRepository.getVendorById(id);
  }

  static async vendorByToken (token: string) {
    return await VendorRepository.getVendorByToken(token);
  }

  static async vendorByResetToken (token: string) {
    return await VendorRepository.getVendorByResetToken(token);
  }

  static async updatePassword (id: string, password: string) {
    return await VendorRepository.updateVendorPassword(id, password);
  }

  static async updateProfile (values: IVendor) {
    return await VendorRepository.updateVendorProfile(values);
  }
}