import { Router } from 'express';
import { login, pinLogin, getMe, loginSchema, pinLoginSchema } from '../controllers/authController.js';
import { validateBody } from '../middlewares/validate.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = Router();

router.post('/login', validateBody(loginSchema), login);
router.post('/pin-login', validateBody(pinLoginSchema), pinLogin);
router.get('/me', authenticateToken, getMe);

export default router;
