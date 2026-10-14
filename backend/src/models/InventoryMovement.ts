import mongoose, { Document, Schema } from 'mongoose';

export type MovementType = 'SALE' | 'RESTOCK' | 'ADJUSTMENT' | 'RETURN' | 'DAMAGE';

export interface IInventoryMovement extends Document {
  storeId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  quantityChange: number; // e.g. -2 for sale, +20 for restock, -1 for damage
  previousQuantity: number;
  newQuantity: number;
  movementType: MovementType;
  reason: string;
  referenceId?: string; // Sale transactionNumber, invoice #, etc.
  performedBy: mongoose.Types.ObjectId;
  actorName: string;
  createdAt: Date;
}

const InventoryMovementSchema = new Schema<IInventoryMovement>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    quantityChange: { type: Number, required: true },
    previousQuantity: { type: Number, required: true },
    newQuantity: { type: Number, required: true, min: 0 },
    movementType: {
      type: String,
      enum: ['SALE', 'RESTOCK', 'ADJUSTMENT', 'RETURN', 'DAMAGE'],
      required: true,
      index: true,
    },
    reason: { type: String, required: true, trim: true },
    referenceId: { type: String, default: null, trim: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actorName: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const InventoryMovement = mongoose.model<IInventoryMovement>(
  'InventoryMovement',
  InventoryMovementSchema
);
