import { Document, Schema, model, Types } from 'mongoose';

// MenuItem Schema and Model
export interface IMenuItem extends Document {
  itemName: string;
  price: number;
  category: string;
  availability: 'Available' | 'Unavailable';
  picture: string;
}

const menuItemSchema = new Schema<IMenuItem>({
  itemName: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  availability: {
    type: String,
    enum: ['Available', 'Unavailable'],
    required: true,
  },
  picture: { type: String, required: true },
});

export const MenuItem = model<IMenuItem>('MenuItem', menuItemSchema);

// Menu Schema and Model
export interface IMenu extends Document {
  name: string;
  description: string;
  menuItems: Types.ObjectId[];
  vendorId: Types.ObjectId;
}

const menuSchema = new Schema<IMenu>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  menuItems: [{ type: Schema.Types.ObjectId, ref: 'MenuItem' }],
  vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
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

export const Menu = model<IMenu>('Menu', menuSchema);