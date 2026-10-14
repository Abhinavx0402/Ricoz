import { Router } from 'express';
import { listCategories, createCategory, createCategorySchema } from '../controllers/categoryController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { validateBody } from '../middlewares/validate.js';

const router = Router();

router.get('/', listCategories);
router.post('/', authenticateToken, requireRole('ADMIN', 'MANAGER'), validateBody(createCategorySchema), createCategory);

export default router;
