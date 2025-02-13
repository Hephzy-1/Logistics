import { IVendor } from '../models/vendor';
import { VendorRepository } from '../repository/vendor';
import { IMenu } from '../models/menu';
import { IWallet } from '../models/wallet';
import { ITransaction } from '../models/transaction';

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

  static async verifiedVendors () {
    return await VendorRepository.getVerifiedVendors();
  }

  static async verifiedVendorsId () {
    return await VendorRepository.getVerifiedVendorsId();
  }

  static async verifiedVendorsMenu () {
    return await VendorRepository.getMenusByVerifiedVendors();
  }

  static async vendorByName (name: string) {
    return await VendorRepository.getVendorByName(name);
  }
  
  static async vendorByBusinessName (businessName: string) {
    return await VendorRepository.getVendorByBusinessName(businessName);
  }

  static async createNewMenu(menuValues: IMenu) {
    return await VendorRepository.createMenu(menuValues);
  }

  static async getMenu() {
    return await VendorRepository.getMenus();
  }

  static async menuById(id: string) {
    return await VendorRepository.getMenuById(id);
  }

  static async menuByVendorId(vendorId: string) {
    return await VendorRepository.getMenuByVendorId( vendorId);
  }

  static async menusByVerifiedVendors() {
    return await VendorRepository.getMenusByVerifiedVendors;
  }

  static async menusByVendor(vendorId: string) {
    return await VendorRepository.getMenuByVendorId( vendorId);
  }

  static async menusByCategory(category: string) {
    return await VendorRepository.getMenusByCategory(category);
  }

  static async deleteMenu(id: string) {
    return await VendorRepository.deleteMenu(id);
  }

  static async populatedMenu() {
    return await VendorRepository.getPopulatedMenu();
  }

  static async vendorIdFromMenu (menuId:string) {
    return await VendorRepository.getVendorIdFromMenu(menuId)
  }

  static async MenuUpdate (values: IMenu) {
    return await VendorRepository.updateMenu(values);
  }

  static async vendorOrders (vendorId: string) {
    return await VendorRepository.getOrdersByVendor(vendorId)
  }
  
  static async orderByIdAndVendor (orderId: string, vendorId: string) {
    return await VendorRepository.getOrderByIdAndVendorId(orderId, vendorId)
  }
  
  static async newOrders () {
    return await VendorRepository.getAllNewOrders()
  }
  static async getOrder(orderId: string) {
    return await VendorRepository.getParticularOrder(orderId)
  }

  static async createNewWallet (values: IWallet) {
    return await VendorRepository.createWallet(values);  
  }

  static async vendorWallet (vendorId: string) {
    return await VendorRepository.getVendorWallet(vendorId)
  }

  static async vendorWalletById (id: string) {
    return await VendorRepository.getVendorWalletById(id)
  }

  static async createNewTransaction (values: ITransaction) {
    return await VendorRepository.createTransaction(values)
  }

  static async vendorTransactionByReference (reference: string) {
    return await VendorRepository.getVendorTransactionByReference(reference)
  }
}