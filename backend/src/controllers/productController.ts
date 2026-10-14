import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { StoreInventory } from '../models/StoreInventory.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { AuditLog } from '../models/AuditLog.js';

export const createProductSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters'),
  sku: z.string().min(2, 'SKU must be at least 2 characters').toUpperCase(),
  barcode: z.string().optional().nullable(),
  description: z.string().optional().default(''),
  categoryId: z.string().min(1, 'Category is required'),
  sellingPrice: z.number().positive('Selling price must be greater than 0'),
  costPrice: z.number().min(0, 'Cost price cannot be negative').optional(),
  taxRate: z.number().min(0).max(100).optional().nullable(),
});

export const updateProductSchema = z.object({
  name: z.string().min(2).optional(),
  sku: z.string().min(2).toUpperCase().optional(),
  barcode: z.string().nullable().optional(),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  sellingPrice: z.number().positive().optional(),
  costPrice: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100).nullable().optional(),
  active: z.boolean().optional(),
});

export async function listProducts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { search, categoryId, active, page = '1', limit = '50', storeId } = req.query as Record<string, string>;

    const filter: any = {};

    if (active !== undefined && active !== 'all') {
      filter.active = active === 'true';
    } else if (req.user?.role === 'CASHIER') {
      // Cashiers only see active items
      filter.active = true;
    }

    if (categoryId) {
      filter.categoryId = categoryId;
    }

    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, 'i');
      filter.$or = [
        { name: regex },
        { sku: regex },
        { barcode: q },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [products, totalCount] = await Promise.all([
      Product.find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(filter),
    ]);

    // Check store inventory if a store context is available
    const effectiveStoreId = storeId || req.user?.storeId;
    let inventoryMap: Record<string, number> = {};

    if (effectiveStoreId) {
      const productIds = products.map((p) => p._id);
      const inventories = await StoreInventory.find({
        storeId: effectiveStoreId,
        productId: { $in: productIds },
      }).lean();

      for (const inv of inventories) {
        inventoryMap[inv.productId.toString()] = inv.quantity;
      }
    }

    // Sanitize response: Cashiers shouldn't see costPrice
    const sanitizedProducts = products.map((product) => {
      const item: any = {
        ...product,
        stock: inventoryMap[product._id.toString()] ?? 0,
      };
      if (req.user?.role === 'CASHIER') {
        delete item.costPrice;
      }
      return item;
    });

    res.json({
      success: true,
      data: {
        products: sanitizedProducts,
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

export async function getProductById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const product = await Product.findById(id).lean();

    if (!product) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });
      return;
    }

    const item: any = { ...product };
    if (req.user?.role === 'CASHIER') {
      delete item.costPrice;
    }

    if (req.user?.storeId) {
      const inventory = await StoreInventory.findOne({ storeId: req.user.storeId, productId: product._id }).lean();
      item.stock = inventory ? inventory.quantity : 0;
    }

    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

export async function createProduct(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, sku, barcode, description, categoryId, sellingPrice, costPrice, taxRate } = req.body;

    const existingSku = await Product.findOne({ sku: sku.toUpperCase() });
    if (existingSku) {
      res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_SKU', message: `SKU '${sku}' already exists` },
      });
      return;
    }

    if (barcode) {
      const existingBarcode = await Product.findOne({ barcode });
      if (existingBarcode) {
        res.status(409).json({
          success: false,
          error: { code: 'DUPLICATE_BARCODE', message: `Barcode '${barcode}' already exists` },
        });
        return;
      }
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_CATEGORY', message: 'Selected category does not exist' },
      });
      return;
    }

    const product = new Product({
      name,
      sku: sku.toUpperCase(),
      barcode: barcode || undefined,
      description: description || '',
      categoryId: category._id,
      categoryName: category.name,
      sellingPrice: Number(sellingPrice.toFixed(2)),
      costPrice: costPrice !== undefined ? Number(costPrice.toFixed(2)) : 0,
      taxRate: taxRate !== undefined ? taxRate : null,
      active: true,
    });

    await product.save();

    await AuditLog.create({
      userId: req.user?._id,
      userEmail: req.user?.email,
      action: 'PRODUCT_CREATED',
      entityType: 'Product',
      entityId: product._id.toString(),
      details: { sku: product.sku, name: product.name, sellingPrice: product.sellingPrice },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });
      return;
    }

    if (req.body.sku && req.body.sku.toUpperCase() !== product.sku) {
      const existingSku = await Product.findOne({ sku: req.body.sku.toUpperCase() });
      if (existingSku) {
        res.status(409).json({
          success: false,
          error: { code: 'DUPLICATE_SKU', message: `SKU '${req.body.sku}' already exists` },
        });
        return;
      }
      product.sku = req.body.sku.toUpperCase();
    }

    if (req.body.barcode !== undefined && req.body.barcode !== product.barcode) {
      if (req.body.barcode) {
        const existingBarcode = await Product.findOne({ barcode: req.body.barcode });
        if (existingBarcode) {
          res.status(409).json({
            success: false,
            error: { code: 'DUPLICATE_BARCODE', message: `Barcode '${req.body.barcode}' already exists` },
          });
          return;
        }
      }
      product.barcode = req.body.barcode || undefined;
    }

    if (req.body.categoryId && req.body.categoryId !== product.categoryId.toString()) {
      const category = await Category.findById(req.body.categoryId);
      if (!category) {
        res.status(400).json({ success: false, error: { code: 'INVALID_CATEGORY', message: 'Category not found' } });
        return;
      }
      product.categoryId = category._id;
      product.categoryName = category.name;
    }

    if (req.body.name) product.name = req.body.name;
    if (req.body.description !== undefined) product.description = req.body.description;
    if (req.body.sellingPrice !== undefined) product.sellingPrice = Number(req.body.sellingPrice.toFixed(2));
    if (req.body.costPrice !== undefined) product.costPrice = Number(req.body.costPrice.toFixed(2));
    if (req.body.taxRate !== undefined) product.taxRate = req.body.taxRate;
    if (req.body.active !== undefined) product.active = req.body.active;

    await product.save();

    await AuditLog.create({
      userId: req.user?._id,
      userEmail: req.user?.email,
      action: 'PRODUCT_UPDATED',
      entityType: 'Product',
      entityId: product._id.toString(),
      details: req.body,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}
