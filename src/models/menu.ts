import { Document, Schema, model, Types } from 'mongoose';

export interface IMenu extends Document {
  name: string;
  description: string;
  menuItems: {
    itemName: string;
    price: number;
    category: string;
    availability: 'Available' | 'Unavailable';
    picture: string;
  }[];
  vendorId: Types.ObjectId;
}


const menuSchema = new Schema<IMenu>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    menuItems: [
      {
        itemName: { type: String, required: true },
        price: { type: Number, required: true },
        category: { type: String, required: true },
        availability: {
          type: String,
          enum: ['Available', 'Unavailable'],
          required: true,
        },
        picture: { type: String, required: true },
      },
    ],
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v;
        delete ret.createdAt;
        delete ret.updatedAt;
      },
    },
  }
);

const Menu = model<IMenu>('Menu', menuSchema);

export default Menu;
