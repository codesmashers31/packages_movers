import { Router } from 'express';
import { createRequest, getRequests, getRequestById } from '../controllers/requestController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.post('/', createRequest);
router.get('/', getRequests);
router.get('/:id', getRequestById);

export default router;
