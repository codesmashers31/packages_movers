import { Router } from 'express';
import authRoutes from './authRoutes.js';
import requestRoutes from './requestRoutes.js';
import quoteRoutes from './quoteRoutes.js';
import bookingRoutes from './bookingRoutes.js';
import vendorRoutes from './vendorRoutes.js';
import adminRoutes from './adminRoutes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/requests', requestRoutes);
router.use('/requests', quoteRoutes);
router.use('/bookings', bookingRoutes);
router.use('/vendor', vendorRoutes);
router.use('/admin', adminRoutes);

export default router;
