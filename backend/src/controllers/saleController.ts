import { Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Sale, PaymentMethod, PaymentStatus } from '../models/Sale.js';
import { SaleItem } from '../models/SaleItem.js';
import { Product } from '../models/Product.js';
import { Store } from '../models/Store.js';
import { StoreInventory } from '../models/StoreInventory.js';
import { InventoryMovement } from '../models/InventoryMovement.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { toCents, fromCents, calculateTax, calculateSubtotal } from '../utils/money.js';

export const createSaleSchema = z.object({
  storeId: z.string().min(1, 'Store ID is required'),
  items: z.array(
    z.object({
      productId: z.string().min(1, 'Product ID is required'),
      quantity: z.number().int().positive('Quantity must be at least 1'),
    })
  ).min(1, 'Cart cannot be empty'),
  paymentMethod: z.enum(['CASH', 'CARD', 'UPI_QR']),
  cashReceived: z.number().min(0).optional(),
  idempotencyKey: z.string().optional(),
  customerName: z.string().optional(),
  notes: z.string().optional(),
});

function generateTransactionNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.floor(100000 + Math.random() * 900000);
  return `TXN-${dateStr}-${randomStr}`;
}

export async function processSale(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      storeId,
      items,
      paymentMethod,
      cashReceived = 0,
      idempotencyKey,
      customerName = 'Walk-in Customer',
      notes = '',
    } = req.body;

    const cashier = req.user!;

    // 1. Idempotency Check: if request with idempotencyKey was already processed, return existing sale
    if (idempotencyKey) {
      const existingSale = await Sale.findOne({ idempotencyKey });
      if (existingSale) {
        const saleItems = await SaleItem.find({ saleId: existingSale._id });
        res.status(200).json({
          success: true,
          data: {
            sale: existingSale,
            items: saleItems,
            idempotentReplay: true,
          },
        });
        return;
      }
    }

    // 2. Fetch Store & Verify Configuration
    const store = await Store.findById(storeId);
    if (!store || !store.active) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_STORE', message: 'Selected store does not exist or is inactive' },
      });
      return;
    }

    // 3. Fetch all products from DB to use authoritative prices & verify active status
    const productIds = items.map((i: any) => i.productId);
    const dbProducts = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map<string, any>();
    for (const p of dbProducts) {
      productMap.set(p._id.toString(), p);
    }

    for (const item of items) {
      const p = productMap.get(item.productId);
      if (!p) {
        res.status(400).json({
          success: false,
          error: { code: 'PRODUCT_NOT_FOUND', message: `Product ${item.productId} was not found` },
        });
        return;
      }
      if (!p.active) {
        res.status(400).json({
          success: false,
          error: { code: 'PRODUCT_INACTIVE', message: `Product '${p.name}' is deactivated and cannot be sold` },
        });
        return;
      }
    }

    // 4. Calculate Financials Authoritatively
    let totalSubtotalCents = 0;
    let totalTaxCents = 0;
    const computedLineItems: Array<{
      productId: string;
      productName: string;
      sku: string;
      unitPrice: number;
      quantity: number;
      subtotal: number;
      taxRate: number;
      taxAmount: number;
      total: number;
    }> = [];

    for (const item of items) {
      const p = productMap.get(item.productId)!;
      const unitPriceCents = toCents(p.sellingPrice);
      const lineSubtotalCents = unitPriceCents * item.quantity;
      const effectiveTaxRate = p.taxRate != null ? p.taxRate : store.taxRate;
      const lineTaxCents = Math.round((lineSubtotalCents * effectiveTaxRate) / 100);
      const lineTotalCents = lineSubtotalCents + lineTaxCents;

      totalSubtotalCents += lineSubtotalCents;
      totalTaxCents += lineTaxCents;

      computedLineItems.push({
        productId: p._id.toString(),
        productName: p.name,
        sku: p.sku,
        unitPrice: p.sellingPrice,
        quantity: item.quantity,
        subtotal: fromCents(lineSubtotalCents),
        taxRate: effectiveTaxRate,
        taxAmount: fromCents(lineTaxCents),
        total: fromCents(lineTotalCents),
      });
    }

    const subtotal = fromCents(totalSubtotalCents);
    const taxAmount = fromCents(totalTaxCents);
    const totalAmount = fromCents(totalSubtotalCents + totalTaxCents);

    // 5. Payment Validation
    let changeDue = 0;
    if (paymentMethod === 'CASH') {
      if (cashReceived < totalAmount) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_CASH',
            message: `Cash received (${cashReceived.toFixed(2)}) is less than total amount (${totalAmount.toFixed(2)})`,
          },
        });
        return;
      }
      changeDue = fromCents(toCents(cashReceived) - toCents(totalAmount));
    }

    // 6. Atomic Inventory Deductions (preventing overselling & concurrency race conditions)
    // We execute conditional decrements. If any item fails, we roll back already deducted items!
    const deductedItems: Array<{ productId: string; quantity: number }> = [];
    const transactionNumber = generateTransactionNumber();

    for (const item of items) {
      const updatedInventory = await StoreInventory.findOneAndUpdate(
        {
          storeId,
          productId: item.productId,
          quantity: { $gte: item.quantity },
        },
        { $inc: { quantity: -item.quantity } },
        { new: true }
      );

      if (!updatedInventory) {
        // Rollback already deducted items
        for (const deducted of deductedItems) {
          await StoreInventory.findOneAndUpdate(
            { storeId, productId: deducted.productId },
            { $inc: { quantity: deducted.quantity } }
          );
        }

        const failedProduct = productMap.get(item.productId);
        res.status(409).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: `Insufficient inventory for '${failedProduct?.name || item.productId}'. Sale cannot be completed.`,
          },
        });
        return;
      }

      deductedItems.push({ productId: item.productId, quantity: item.quantity });
    }

    // 7. Persist Sale Record
    const sale = new Sale({
      transactionNumber,
      storeId,
      cashierId: cashier._id,
      cashierName: cashier.name,
      subtotal,
      taxAmount,
      discountAmount: 0,
      totalAmount,
      paymentMethod,
      paymentStatus: 'COMPLETED',
      cashReceived: paymentMethod === 'CASH' ? cashReceived : totalAmount,
      changeDue: paymentMethod === 'CASH' ? changeDue : 0,
      idempotencyKey: idempotencyKey || undefined,
      customerName,
      notes,
      itemCount: items.reduce((acc: number, i: any) => acc + i.quantity, 0),
    });

    await sale.save();

    // 8. Persist Immutable Sale Items & Auditable Inventory Movements
    const savedSaleItems = [];
    for (const line of computedLineItems) {
      const saleItem = new SaleItem({
        saleId: sale._id,
        productId: line.productId,
        productName: line.productName,
        sku: line.sku,
        unitPrice: line.unitPrice,
        quantity: line.quantity,
        subtotal: line.subtotal,
        taxRate: line.taxRate,
        taxAmount: line.taxAmount,
        total: line.total,
      });
      await saleItem.save();
      savedSaleItems.push(saleItem);

      // Record movement ledger
      const currentInv = await StoreInventory.findOne({ storeId, productId: line.productId });
      await InventoryMovement.create({
        storeId,
        productId: line.productId,
        quantityChange: -line.quantity,
        previousQuantity: (currentInv?.quantity || 0) + line.quantity,
        newQuantity: currentInv?.quantity || 0,
        movementType: 'SALE',
        reason: `Checkout sale #${transactionNumber}`,
        referenceId: transactionNumber,
        performedBy: cashier._id,
        actorName: cashier.name,
      });
    }

    res.status(201).json({
      success: true,
      data: {
        sale,
        items: savedSaleItems,
        store: {
          name: store.name,
          code: store.code,
          address: store.address,
          phone: store.phone,
          currency: store.currency,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function listSales(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      storeId,
      cashierId,
      paymentMethod,
      paymentStatus,
      search,
      startDate,
      endDate,
      page = '1',
      limit = '25',
    } = req.query as Record<string, string>;

    const filter: any = {};
    const effectiveStoreId = storeId || (req.user?.role !== 'ADMIN' ? req.user?.storeId : undefined);

    if (effectiveStoreId) filter.storeId = effectiveStoreId;
    if (cashierId) filter.cashierId = cashierId;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    if (search && search.trim()) {
      filter.transactionNumber = new RegExp(search.trim(), 'i');
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const skip = (pageNum - 1) * limitNum;

    const [sales, totalCount] = await Promise.all([
      Sale.find(filter)
        .populate('storeId', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Sale.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        sales,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalCount / limitNum),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getSaleById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    let sale = await Sale.findById(id).populate('storeId').lean();

    if (!sale) {
      // Allow searching by transactionNumber as well
      sale = await Sale.findOne({ transactionNumber: id }).populate('storeId').lean();
    }

    if (!sale) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Transaction not found' } });
      return;
    }

    // Role check: cashier must belong to the sale's store
    if (req.user?.role === 'CASHIER' && req.user.storeId && sale.storeId) {
      const saleStoreId = (sale.storeId as any)._id || sale.storeId;
      if (saleStoreId.toString() !== req.user.storeId.toString()) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } });
        return;
      }
    }

    const items = await SaleItem.find({ saleId: sale._id }).lean();

    res.json({
      success: true,
      data: {
        sale,
        items,
      },
    });
  } catch (err) {
    next(err);
  }
}
