import mongoose, { Document, Schema } from 'mongoose';

export interface IStore extends Document {
  name: string;
  code: string;
  address: string;
  phone: string;
  taxRate: number; // e.g. 5.0 for 5%
  currency: string; // e.g. 'USD', 'INR', '$'
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StoreSchema = new Schema<IStore>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    address: { type: String, required: true, trim: true },
    phone: { type: String, default: '' },
    taxRate: { type: Number, default: 5.0, min: 0 },
    currency: { type: String, default: 'USD' },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const Store = mongoose.model<IStore>('Store', StoreSchema);
