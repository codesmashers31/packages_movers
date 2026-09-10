import { Router } from 'express';
import { requestOtp, verifyOtp, getMe } from '../controllers/authController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.post('/otp/request', requestOtp);
router.post('/otp/verify', verifyOtp);
router.get('/me', authenticate, getMe);

export default router;
