import { Router } from 'express';
import { submitQuote, getQuotesForRequest, rejectQuote } from '../controllers/quoteController.js';
import { authenticate, requireRoles } from '../middlewares/auth.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post('/:requestId/quotes', requireRoles('vendor', 'admin'), submitQuote);
router.get('/:requestId/quotes', getQuotesForRequest);
router.post('/:requestId/quotes/:quoteId/reject', rejectQuote);

export default router;
