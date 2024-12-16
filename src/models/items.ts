import { Document, Schema, model, Types } from 'mongoose';

export interface IItem extends Document {
  name: string;
  description: string;
  price: number;
  picture: string;
  category: string;
  availabilityStatus: 'Avaliable' | 'Unavailable';
  menuId: Types.ObjectId;
}

const itemSchema = new Schema<IItem>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  picture: { type: String, required: true },
  category: { type: String, required: true },
  availabilityStatus: { 
    type: String, 
    enum: ['Avaliable', 'Unavailable'], 
    required: true 
  },
  menuId: {
    type: Schema.Types.ObjectId,
    ref: 'Menu',
    required: true
  },
  }, {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v,
        delete ret.createdAt,
        delete ret.updatedAt
      }
    }
});

const Item = model<IItem>('Item', itemSchema);

export default Item;