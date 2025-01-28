import { Schema, model, Document, Types } from 'mongoose';

interface IOrderItem {
  menuItem: Types.ObjectId; 
  quantity: number;
  price: number;
}

export interface IOrder extends Document {
  customerId: Types.ObjectId;
  vendorId: Types.ObjectId;
  items: IOrderItem[];
  totalPrice: number;
  availableForPickup: boolean;
  orderStatus: 'new' | 'in-transit' | 'delivered';
  acceptedStatus: 'accepted' | 'declined' | 'pending';
  deliveredStatus: boolean;
  pickedUp: boolean;
}

const orderItemSchema = new Schema<IOrderItem>({
  menuItem: { type: Schema.Types.ObjectId, ref: 'Menu', required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
});

const orderSchema = new Schema<IOrder>({
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
  items: [orderItemSchema],
  totalPrice: { type: Number, required: true },
  availableForPickup: { type: Boolean, default: false },
  orderStatus: { 
    type: String, 
    enum: ['new', 'in-transit', 'delivered'], 
    default: 'new',
  },
  acceptedStatus: { 
    type: String, 
    enum: ['accepted', 'pending', 'declined'], 
    default: 'accepted',
  },
  deliveredStatus: { type: Boolean, default: false },
  pickedUp: { type: Boolean, default: false },
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

const Order = model<IOrder>('Order', orderSchema);

export default Order;