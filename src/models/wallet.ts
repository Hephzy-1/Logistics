import { Schema, model, Document, Types } from 'mongoose';
 
export interface IWallet extends Document {
  customerId?: Types.ObjectId;
  vendorId?: Types.ObjectId;
  riderId?: Types.ObjectId;
  balance: number;
}

const walletSchema = new Schema<IWallet>({
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
  vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor' },
  riderId: { type: Schema.Types.ObjectId, ref: 'Rider' },
  balance: { type: Number, required: true, default: 0 },
  
}, {
  timestamps: true,
  toJSON: {
    transform: function (doc, ret) {
      delete ret.__v;
      delete ret.createdAt;
      delete ret.updatedAt;
    }
  }
});

const Wallet = model<IWallet>('Wallet', walletSchema);

export default Wallet;