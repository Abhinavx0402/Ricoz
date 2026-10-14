import mongoose, { Document, Schema } from 'mongoose';

export interface ISaleItem extends Document {
  saleId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  productName: string; // Snapshot at time of sale
  sku: string;         // Snapshot at time of sale
  unitPrice: number;   // Unit price at time of sale
  quantity: number;    // Quantity purchased
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  createdAt: Date;
}

const SaleItemSchema = new Schema<ISaleItem>(
  {
    saleId: { type: Schema.Types.ObjectId, ref: 'Sale', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    productName: { type: String, required: true, trim: true },
    sku: { type: String, required: true, uppercase: true, trim: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const SaleItem = mongoose.model<ISaleItem>('SaleItem', SaleItemSchema);
