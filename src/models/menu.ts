import { Document, Types, Schema, model } from "mongoose";

export interface IMenu extends Document {
  menuItems: Types.ObjectId[];
  vendorId: Types.ObjectId;
  name: string;
}

const menuSchema = new Schema<IMenu>(
  {
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true
    },
    menuItems: [{ type: Schema.Types.ObjectId, ref: 'Items', required: true }],
    name: { type: String, required: true }
  }
);

export const Menu = model<IMenu>('Menu', menuSchema);