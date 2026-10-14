export type UserRole = 'ADMIN' | 'MANAGER' | 'CASHIER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  storeId?: string;
  store?: {
    id: string;
    name: string;
    code: string;
    taxRate: number;
    currency: string;
  } | null;
  active?: boolean;
}

export interface Store {
  _id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  taxRate: number;
  currency: string;
  active: boolean;
}

export interface Category {
  _id: string;
  name: string;
  description: string;
  slug: string;
}

export interface Product {
  _id: string;
  name: string;
  sku: string;
  barcode?: string;
  description: string;
  categoryId: string;
  categoryName: string;
  sellingPrice: number;
  costPrice?: number;
  taxRate?: number;
  active: boolean;
  stock?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type PaymentMethod = 'CASH' | 'CARD' | 'UPI_QR';
export type PaymentStatus = 'COMPLETED' | 'PENDING' | 'FAILED' | 'REFUNDED';

export interface Sale {
  _id: string;
  transactionNumber: string;
  storeId: string | Store;
  cashierId: string;
  cashierName: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  cashReceived?: number;
  changeDue?: number;
  itemCount: number;
  customerName?: string;
  notes?: string;
  createdAt: string;
}

export interface SaleItem {
  _id: string;
  saleId: string;
  productId: string;
  productName: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export interface InventoryItem {
  id: string;
  productId: string;
  name: string;
  sku: string;
  barcode?: string;
  categoryName: string;
  sellingPrice: number;
  quantity: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  active: boolean;
}

export interface InventoryMovement {
  _id: string;
  storeId: Store | string;
  productId: Product | string;
  quantityChange: number;
  previousQuantity: number;
  newQuantity: number;
  movementType: 'SALE' | 'RESTOCK' | 'ADJUSTMENT' | 'RETURN' | 'DAMAGE';
  reason: string;
  referenceId?: string;
  performedBy: string;
  actorName: string;
  createdAt: string;
}
