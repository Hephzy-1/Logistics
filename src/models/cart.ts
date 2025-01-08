import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICartItem {
  menuItem: Types.ObjectId; 
  quantity: number;
}

export interface ICart extends Document {
  customerId: Types.ObjectId;
  vendorId: Types.ObjectId;
  items: ICartItem[];
  totalPrice: number;
}

const CartSchema = new Schema<ICart>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    items: [
      {
        menuItem: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
        quantity: { type: Number },
      },
    ],
    totalPrice: { type: Number, default: 0 },
  },
  { timestamps: true } // Add `createdAt` and `updatedAt` timestamps
);

// Middleware to calculate total price before saving
CartSchema.pre('save', async function (next) {
  const cart = this as ICart;

  // Calculate total price based on items
  const populatedItems = await cart.populate('items.menuItem', 'price').execPopulate();
  cart.totalPrice = populatedItems.items.reduce((sum, item: any) => {
    return sum + item.menuItem.price * item.quantity;
  }, 0);

  next();
});

export const Cart = mongoose.model<ICart>('Cart', CartSchema);
