import { Router } from 'express';
import {
  listStaff,
  createStaff,
  updateStaff,
  createStaffSchema,
  updateStaffSchema,
} from '../controllers/staffController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { validateBody } from '../middlewares/validate.js';

const router = Router();

router.get('/', authenticateToken, requireRole('ADMIN', 'MANAGER'), listStaff);
router.post('/', authenticateToken, requireRole('ADMIN'), validateBody(createStaffSchema), createStaff);
router.patch('/:id', authenticateToken, requireRole('ADMIN'), validateBody(updateStaffSchema), updateStaff);

export default router;
