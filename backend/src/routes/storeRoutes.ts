import { Router } from 'express';
import { listStores, createStore, updateStore, createStoreSchema, updateStoreSchema } from '../controllers/storeController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { validateBody } from '../middlewares/validate.js';

const router = Router();

router.get('/', listStores);
router.post('/', authenticateToken, requireRole('ADMIN'), validateBody(createStoreSchema), createStore);
router.patch('/:id', authenticateToken, requireRole('ADMIN'), validateBody(updateStoreSchema), updateStore);

export default router;
