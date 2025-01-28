import { Schema, model, Document, Types } from 'mongoose';

interface ITransaction {
  amount: number;
  type: 'credit' | 'debit';
  date: Date;
  description?: string;
  status: 'pending' | 'completed';
}

export interface IWallet extends Document {
  customerId: Types.ObjectId;
  balance: number;
  transactions: ITransaction[];
}

const transactionSchema = new Schema<ITransaction>({
  amount: { type: Number, required: true },
  type: { type: String, enum: ['credit', 'debit'], required: true },
  date: { type: Date, default: Date.now },
  description: { type: String },
  status: { type: String, enum: ['pending', 'completed'], required: true }
});

const walletSchema = new Schema<IWallet>({
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  balance: { type: Number, required: true, default: 0 },
  transactions: [transactionSchema],
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