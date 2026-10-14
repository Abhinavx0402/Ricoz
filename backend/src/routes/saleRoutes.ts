import { Router } from 'express';
import {
  processSale,
  listSales,
  getSaleById,
  createSaleSchema,
} from '../controllers/saleController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validate.js';

const router = Router();

router.post('/', authenticateToken, validateBody(createSaleSchema), processSale);
router.get('/', authenticateToken, listSales);
router.get('/:id', authenticateToken, getSaleById);

export default router;
