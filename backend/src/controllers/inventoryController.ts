import { Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { StoreInventory } from '../models/StoreInventory.js';
import { InventoryMovement } from '../models/InventoryMovement.js';
import { Product } from '../models/Product.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { AuditLog } from '../models/AuditLog.js';

export const stockAdjustmentSchema = z.object({
  storeId: z.string().min(1, 'Store is required'),
  productId: z.string().min(1, 'Product is required'),
  quantityChange: z.number().int().refine((val) => val !== 0, 'Quantity change cannot be 0'),
  movementType: z.enum(['RESTOCK', 'ADJUSTMENT', 'RETURN', 'DAMAGE']),
  reason: z.string().min(3, 'A clear reason for the adjustment is required'),
  referenceId: z.string().optional(),
});

export async function getStoreInventory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { storeId, lowStockOnly, search } = req.query as Record<string, string>;
    const effectiveStoreId = storeId || req.user?.storeId;

    if (!effectiveStoreId) {
      res.status(400).json({
        success: false,
        error: { code: 'STORE_REQUIRED', message: 'storeId is required to view store inventory' },
      });
      return;
    }

    const inventoryRecords = await StoreInventory.find({ storeId: effectiveStoreId })
      .populate('productId')
      .lean();

    let items = inventoryRecords
      .filter((inv) => inv.productId != null)
      .map((inv) => {
        const product: any = inv.productId;
        const isLowStock = inv.quantity <= inv.lowStockThreshold;
        return {
          id: inv._id,
          productId: product._id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          categoryName: product.categoryName,
          sellingPrice: product.sellingPrice,
          quantity: inv.quantity,
          lowStockThreshold: inv.lowStockThreshold,
          isLowStock,
          active: product.active,
        };
      });

    if (lowStockOnly === 'true') {
      items = items.filter((item) => item.isLowStock);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q) ||
          (item.barcode && item.barcode.toLowerCase().includes(q))
      );
    }

    res.json({
      success: true,
      data: {
        storeId: effectiveStoreId,
        items,
        totalItems: items.length,
        lowStockCount: items.filter((i) => i.isLowStock).length,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function adjustInventory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { storeId, productId, quantityChange, movementType, reason, referenceId } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({ success: false, error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found' } });
      return;
    }

    // Atomic fetch or create inventory record
    let inventory = await StoreInventory.findOne({ storeId, productId });
    if (!inventory) {
      inventory = new StoreInventory({
        storeId,
        productId,
        quantity: 0,
        lowStockThreshold: 5,
      });
    }

    const previousQuantity = inventory.quantity;
    const newQuantity = previousQuantity + quantityChange;

    if (newQuantity < 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_STOCK',
          message: `Cannot reduce stock by ${Math.abs(quantityChange)}. Current stock is ${previousQuantity}.`,
        },
      });
      return;
    }

    inventory.quantity = newQuantity;
    await inventory.save();

    // Create auditable movement
    const movement = new InventoryMovement({
      storeId,
      productId,
      quantityChange,
      previousQuantity,
      newQuantity,
      movementType,
      reason,
      referenceId: referenceId || undefined,
      performedBy: req.user!._id,
      actorName: req.user!.name,
    });
    await movement.save();

    await AuditLog.create({
      userId: req.user!._id,
      userEmail: req.user!.email,
      action: 'INVENTORY_ADJUSTED',
      entityType: 'StoreInventory',
      entityId: inventory._id.toString(),
      details: {
        productName: product.name,
        sku: product.sku,
        previousQuantity,
        newQuantity,
        quantityChange,
        movementType,
        reason,
      },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: {
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        previousQuantity,
        newQuantity,
        quantityChange,
        movementType,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getInventoryMovements(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { storeId, productId, limit = '50' } = req.query as Record<string, string>;
    const effectiveStoreId = storeId || req.user?.storeId;

    const filter: any = {};
    if (effectiveStoreId) filter.storeId = effectiveStoreId;
    if (productId) filter.productId = productId;

    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    const movements = await InventoryMovement.find(filter)
      .populate('productId', 'name sku barcode')
      .populate('storeId', 'name code')
      .sort({ createdAt: -1 })
      .limit(limitNum);

    res.json({ success: true, data: movements });
  } catch (err) {
    next(err);
  }
}
