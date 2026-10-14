import mongoose, { Document, Schema } from 'mongoose';

export interface IStoreInventory extends Document {
  storeId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  quantity: number;
  lowStockThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}

const StoreInventorySchema = new Schema<IStoreInventory>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    quantity: { type: Number, required: true, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
  },
  { timestamps: true }
);

// Compound unique index: only 1 inventory record per product per store
StoreInventorySchema.index({ storeId: 1, productId: 1 }, { unique: true });

export const StoreInventory = mongoose.model<IStoreInventory>('StoreInventory', StoreInventorySchema);
