import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  sku: string;
  barcode?: string;
  description: string;
  categoryId: mongoose.Types.ObjectId;
  categoryName: string;
  sellingPrice: number; // Stored as decimal or minor unit, e.g. 29.99
  costPrice?: number;   // Restricted to Admin/Manager
  taxRate?: number;     // Store/Product tax override percentage
  active: boolean;      // Soft-deactivation
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true, index: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    barcode: { type: String, unique: true, sparse: true, trim: true, index: true },
    description: { type: String, default: '' },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    categoryName: { type: String, required: true, trim: true },
    sellingPrice: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, min: 0, default: 0 },
    taxRate: { type: Number, default: null },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

// Text index for fast multi-field search (name, SKU, barcode)
ProductSchema.index({ name: 'text', sku: 'text', barcode: 'text' });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
