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

}