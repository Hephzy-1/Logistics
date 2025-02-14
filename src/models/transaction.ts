import { Schema, model, Document, Types } from 'mongoose';

export interface ITransaction extends Document {
  amount: number;
  type: 'credit' | 'debit';
  date: Date;
  description?: string;
  status: 'pending' | 'completed' | 'pending';
  orderId?: Types.ObjectId;
  reference?: string;
  customerId?: Types.ObjectId;
  vendorId?: Types.ObjectId;
  riderId?: Types.ObjectId;

}

const transactionSchema = new Schema<ITransaction>({
  amount: { type: Number, required: true },
  type: { type: String, enum: ['credit', 'debit'], required: true },
  date: { type: Date, default: Date.now },
  description: { type: String },
  status: { type: String, enum: ['pending', 'completed', 'failed' ], required: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  reference: { type: String },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
  vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor' },
  riderId: { type: Schema.Types.ObjectId, ref: 'Rider' },
});

const Transaction = model<ITransaction>('Transaction', transactionSchema);

export default Transaction;