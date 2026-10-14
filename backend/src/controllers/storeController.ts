import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Store } from '../models/Store.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

export const createStoreSchema = z.object({
  name: z.string().min(2, 'Store name must be at least 2 characters'),
  code: z.string().min(2, 'Store code must be at least 2 characters').toUpperCase(),
  address: z.string().min(3, 'Address is required'),
  phone: z.string().optional(),
  taxRate: z.number().min(0).max(100).default(5.0),
  currency: z.string().default('USD'),
});

export const updateStoreSchema = createStoreSchema.partial();

export async function listStores(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stores = await Store.find({ active: true }).sort({ name: 1 });
    res.json({ success: true, data: stores });
  } catch (err) {
    next(err);
  }
}

export async function createStore(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const existing = await Store.findOne({ code: req.body.code.toUpperCase() });
    if (existing) {
      res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_CODE', message: 'A store with this code already exists' },
      });
      return;
    }

    const store = new Store(req.body);
    await store.save();
    res.status(201).json({ success: true, data: store });
  } catch (err) {
    next(err);
  }
}

export async function updateStore(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const store = await Store.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!store) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Store not found' } });
      return;
    }
    res.json({ success: true, data: store });
  } catch (err) {
    next(err);
  }
}
