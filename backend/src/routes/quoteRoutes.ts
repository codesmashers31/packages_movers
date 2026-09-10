import { Router } from 'express';
import { submitQuote, getQuotesForRequest } from '../controllers/quoteController.js';
import { authenticate, requireRoles } from '../middlewares/auth.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post('/:requestId/quotes', requireRoles('vendor', 'admin'), submitQuote);
router.get('/:requestId/quotes', getQuotesForRequest);

export default router;
