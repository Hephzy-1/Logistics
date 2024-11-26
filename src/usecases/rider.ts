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

}