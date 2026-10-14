import { Router } from 'express';
import {
  getStoreInventory,
  adjustInventory,
  getInventoryMovements,
  stockAdjustmentSchema,
} from '../controllers/inventoryController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { validateBody } from '../middlewares/validate.js';

const router = Router();

router.get('/', authenticateToken, getStoreInventory);
router.post(
  '/adjustments',
  authenticateToken,
  requireRole('ADMIN', 'MANAGER'),
  validateBody(stockAdjustmentSchema),
  adjustInventory
);
router.get(
  '/movements',
  authenticateToken,
  requireRole('ADMIN', 'MANAGER'),
  getInventoryMovements
);

export default router;
