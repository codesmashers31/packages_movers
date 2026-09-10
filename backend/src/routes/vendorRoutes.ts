import { Router } from 'express';
import { registerVendor, getVendorProfile } from '../controllers/vendorController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.post('/register', registerVendor);
router.get('/profile', getVendorProfile);

export default router;
