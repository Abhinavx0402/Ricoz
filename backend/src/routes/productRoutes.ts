import { Router } from 'express';
import {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  createProductSchema,
  updateProductSchema,
} from '../controllers/productController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { validateBody } from '../middlewares/validate.js';

const router = Router();

// All authenticated roles (Admin, Manager, Cashier) can view products for lookup & register
router.get('/', authenticateToken, listProducts);
router.get('/:id', authenticateToken, getProductById);

// Only Admin and Manager can create and update products
router.post(
  '/',
  authenticateToken,
  requireRole('ADMIN', 'MANAGER'),
  validateBody(createProductSchema),
  createProduct
);

router.patch(
  '/:id',
  authenticateToken,
  requireRole('ADMIN', 'MANAGER'),
  validateBody(updateProductSchema),
  updateProduct
);

export default router;
