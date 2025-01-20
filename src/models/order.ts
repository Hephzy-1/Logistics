import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IOrderItem {
  menuItem: Types.ObjectId;
  quantity: number;
  totalPrice: number;
}

export interface IOrder extends Document {
  customerId: Types.ObjectId;
  vendorId: Types.ObjectId;
  items: IOrderItem[];
  totalPrice: number;
  status: string;
}

const OrderSchema = new Schema<IOrder>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    items: [
      {
        menuItem: { type: Schema.Types.ObjectId, ref: 'Menu', required: true },
        quantity: { type: Number, required: true },
        totalPrice: { type: Number, required: true },
      },
    ],
    totalPrice: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'completed', 'canceled'], default: 'pending' },
  },
  { timestamps: true }
);

const Order = mongoose.model<IOrder>('Order', OrderSchema);

export default Order;
