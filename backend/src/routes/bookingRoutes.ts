import { Router } from 'express';
import { createBooking, getBookings, updateBookingStatus } from '../controllers/bookingController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.post('/', createBooking);
router.get('/', getBookings);
router.patch('/:id/status', updateBookingStatus);

export default router;
