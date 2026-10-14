import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Category } from '../models/Category.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

export const createCategorySchema = z.object({
  name: z.string().min(2, 'Category name required'),
  description: z.string().optional(),
});

export async function listCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
}

export async function createCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, description } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    const existing = await Category.findOne({ slug });
    if (existing) {
      res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_CATEGORY', message: 'Category with this name already exists' },
      });
      return;
    }

    const category = new Category({ name, description, slug });
    await category.save();
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
}
