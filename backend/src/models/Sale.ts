import mongoose, { Document, Schema } from 'mongoose';

export type PaymentMethod = 'CASH' | 'CARD' | 'UPI_QR';
export type PaymentStatus = 'COMPLETED' | 'PENDING' | 'FAILED' | 'REFUNDED';

export interface ISale extends Document {
  transactionNumber: string;
  storeId: mongoose.Types.ObjectId;
  cashierId: mongoose.Types.ObjectId;
  cashierName: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  cashReceived?: number;
  changeDue?: number;
  idempotencyKey?: string;
  customerName?: string;
  notes?: string;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const SaleSchema = new Schema<ISale>(
  {
    transactionNumber: { type: String, required: true, unique: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    cashierId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    cashierName: { type: String, required: true, trim: true },
    subtotal: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, required: true, min: 0, default: 0 },
    discountAmount: { type: Number, required: true, min: 0, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'CARD', 'UPI_QR'],
      required: true,
      default: 'CASH',
    },
    paymentStatus: {
      type: String,
      enum: ['COMPLETED', 'PENDING', 'FAILED', 'REFUNDED'],
      required: true,
      default: 'COMPLETED',
      index: true,
    },
    cashReceived: { type: Number, default: 0 },
    changeDue: { type: Number, default: 0 },
    idempotencyKey: { type: String, unique: true, sparse: true, index: true },
    customerName: { type: String, default: 'Walk-in Customer' },
    notes: { type: String, default: '' },
    itemCount: { type: Number, required: true, min: 1 },
  },
  { timestamps: true }
);

// Index for date filtering and reporting
SaleSchema.index({ createdAt: -1 });
SaleSchema.index({ storeId: 1, createdAt: -1 });

export const Sale = mongoose.model<ISale>('Sale', SaleSchema);
