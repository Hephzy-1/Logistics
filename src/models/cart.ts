import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICartItem {
  menuItem: Types.ObjectId; 
  quantity: number;
}

export interface ICart extends Document {
  customerId: Types.ObjectId;
  vendorId: Types.ObjectId[];
  items: ICartItem[];
  totalPrice: number;
}

const CartSchema = new Schema<ICart>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    vendorId: [{ type: Schema.Types.ObjectId, ref: 'Vendor', required: true }],
    items: [
      {
        menuItem: { type: Schema.Types.ObjectId, ref: 'Menu', required: true },
        quantity: { type: Number },
      },
    ],
    totalPrice: { type: Number, default: 0 },
  },
  { 
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v,
        delete ret.createdAt,
        delete ret.updatedAt
      }
    }
  }
);

// Middleware to calculate total price before saving
CartSchema.pre('save', async function (next) {
  const cart = this as ICart;

  const populatedItems = await cart.populate('items.menuItem', 'price');
  cart.totalPrice = populatedItems.items.reduce((sum: number, item: any) => {
    return sum + item.menuItem.price * item.quantity;
  }, 0);

  next();
});

const Cart = mongoose.model<ICart>('Cart', CartSchema);

export default Cart;