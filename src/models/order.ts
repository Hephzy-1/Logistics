import { Document, Schema, model } from 'mongoose';

export interface IOrder extends Document {
  vendorId: string;
  customerId: string;
  cartId: string;
  totalPrice: number;
  status: 'pending' | 'completed' | 'cancelled';
  availableForPickup: boolean;
}

const OrderSchema = new Schema<IOrder> ({
  customerId: { type: String, required: true },
  cartId: { type: String, required: true },
  totalPrice: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'completed', 'cancelled'], required: true, default: 'pending' },
  availableForPickup: { type: Boolean, required: true, default: false }
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

const Order = model<IOrder>('Order', OrderSchema);

export default Order;