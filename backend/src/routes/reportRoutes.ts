import { Router } from 'express';
import { getDashboardOverview, getSalesReport } from '../controllers/reportController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';

const router = Router();

router.get('/dashboard', authenticateToken, requireRole('ADMIN', 'MANAGER'), getDashboardOverview);
router.get('/sales', authenticateToken, requireRole('ADMIN', 'MANAGER'), getSalesReport);

export default router;
