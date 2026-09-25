import { Router } from 'express';
import {
  requestOtp,
  verifyOtp,
  getMe,
  loginWithPassword,
  changePassword,
  forgotPassword,
  resetPasswordWithToken,
  acceptInvitation,
  verifyInvitationToken,
} from '../controllers/authController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.post('/login', loginWithPassword);
router.post('/otp/request', requestOtp);
router.post('/otp/verify', verifyOtp);
router.post('/change-password', authenticate, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPasswordWithToken);
router.get('/invitation/verify', verifyInvitationToken);
router.post('/invitation/accept', acceptInvitation);
router.post('/accept-invitation', acceptInvitation);
router.get('/me', authenticate, getMe);

export default router;

